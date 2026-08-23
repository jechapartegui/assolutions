import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';

import { CompteEntity } from '../compte/compte.entity';
import { ProjectEntity } from '../project/project.entity';
import { PersonneEntity } from '../personne/personne.entity';
import { LoginProjectEntity } from '../login_project/login_project.entity';
import { ProjetView } from '@shared/lib/compte.interface';
import { SaisonEntity } from '../saison/saison.entity';
import { MessageService } from '../message/message.service';
import {
  assertPasswordPolicy,
  createTimedToken,
  hashOpaqueToken,
  hashPassword,
  verifyPassword,
  verifyTimedToken,
} from './security.utils';

type AppMode = 'ADMIN' | 'APPLI';
const RESET_TOKEN_MAX_AGE_MS = 60 * 60 * 1000;
const MAGIC_LOGIN_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;
const ACTIVATION_TOKEN_MAX_AGE_MS = 48 * 60 * 60 * 1000;
const MAGIC_LOGIN_PREFIX = 'login-';
const MIN_SECRET_LENGTH = 32;

@Injectable()
export class AuthService {
  private readonly tokenPepper: string;
  private readonly legacyPepper: string;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mailService: MessageService,

    @InjectRepository(CompteEntity)
    private readonly compteRepo: Repository<CompteEntity>,

    @InjectRepository(ProjectEntity)
    private readonly projectRepo: Repository<ProjectEntity>,

    @InjectRepository(PersonneEntity)
    private readonly personneRepo: Repository<PersonneEntity>,

    @InjectRepository(SaisonEntity)
    private readonly saisonRepo: Repository<SaisonEntity>,

    @InjectRepository(LoginProjectEntity)
    private readonly loginProjectRepo: Repository<LoginProjectEntity>,
  ) {
    this.tokenPepper = this.requireSecret('TOKEN_PEPPER');
    this.legacyPepper =
      this.config.get<string>('PASSWORD_LEGACY_PEPPER') ??
      this.config.get<string>('PEPPER') ??
      '';
  }

  private signToken(compte: CompteEntity): string {
    return this.jwt.sign({
      sub: compte.id,
      login: compte.login,
      superAdmin: false,
    });
  }

  private async issueSession(compte: CompteEntity): Promise<any> {
    return this.buildSession(compte, this.signToken(compte));
  }

  private async computeMode(compteId: number): Promise<AppMode> {
    const hasAdminProject = await this.projectRepo.exist({
      where: { compte: compteId } as any,
    });

    return hasAdminProject ? 'ADMIN' : 'APPLI';
  }

  private async getProjectsForCompte(compteId: number): Promise<ProjectEntity[]> {
    const loginProjects = await this.loginProjectRepo.find({
      where: { login_id: compteId },
      relations: ['project'],
    });

    return loginProjects
      .map((lp: LoginProjectEntity) => {
        const project = lp.project;
        if (!project) return null;
        project.password = '';
        project.activation_token = null;
        return project;
      })
      .filter((project): project is ProjectEntity => project !== null);
  }

  private async buildSession(compte: CompteEntity, token = ''): Promise<any> {
    const mode = await this.computeMode(compte.id);
    const safeCompte = this.sanitizeCompte(compte);

    if (mode === 'APPLI') {
      const projects = await this.getProjectsForCompte(compte.id);
      return {
        token,
        compte: safeCompte,
        mode,
        projects,
      };
    }

    const pr = await this.projectRepo.findOne({ where: { compte: compte.id } });
    if (!pr) throw new NotFoundException('PROJECT_NOT_FOUND');

    const ss = await this.saisonRepo.findOne({
      where: { project_id: pr.id, active: true },
    });

    const projectView: ProjetView = {
      id: pr.id,
      nom: pr.nom,
      rights: {
        adherent: true,
        prof: true,
        visible: true,
      },
      saison_active: ss,
    };

    return {
      token,
      compte: safeCompte,
      mode,
      projects: [projectView],
    };
  }

  async prelogin(login: string): Promise<{ password_required: boolean; mode: AppMode }> {
    const compte = await this.getByLogin(login);
    if (!compte.actif) throw new BadRequestException('ACCOUNT_NOT_ACTIVE');

    const hasPassword = !!(compte.password && String(compte.password).length > 0);
    const mode = await this.computeMode(compte.id);

    return {
      password_required: hasPassword,
      mode,
    };
  }

  async login(login: string, password?: string): Promise<any> {
    const compte = await this.getByLogin(login);
    if (!compte.actif) throw new BadRequestException('ACCOUNT_NOT_ACTIVE');

    const storedPassword = compte.password;
    if (!storedPassword) {
      throw new BadRequestException('PASSWORDLESS_LOGIN_REQUIRED');
    }

    if (!password) throw new BadRequestException('PASSWORD_REQUIRED');

    const verification = verifyPassword(password, storedPassword, this.legacyPepper);
    if (!verification.valid) {
      throw new BadRequestException('INCORRECT_PASSWORD');
    }

    if (verification.needsRehash) {
      compte.password = hashPassword(password);
      await this.compteRepo.save(compte);
    }

    return this.issueSession(compte);
  }

  async activateAndLogin(login: string, token: string): Promise<any> {
    const compte = await this.findAccountForToken(login);
    const validNewToken = verifyTimedToken(
      token,
      compte.activation_token,
      this.tokenPepper,
      ACTIVATION_TOKEN_MAX_AGE_MS,
    );
    const validLegacyToken = this.verifyLegacyToken(token, compte.activation_token);

    if (!validNewToken && !validLegacyToken) {
      throw new BadRequestException('INVALID_OR_EXPIRED_TOKEN');
    }

    compte.mail_actif = true;
    compte.actif = true;
    compte.activation_token = null;
    await this.compteRepo.save(compte);

    return this.issueSession(compte);
  }

  async requestLoginLink(login: string): Promise<boolean> {
    const normalizedLogin = this.normalizeLogin(login);
    const compte = await this.compteRepo.findOne({
      where: { login: normalizedLogin },
    });

    // Réponse identique pour ne pas confirmer l'existence d'un compte.
    if (!compte || !compte.actif) return true;

    const rawToken = this.createMagicLoginToken();
    compte.activation_token = hashOpaqueToken(rawToken, this.tokenPepper);
    await this.compteRepo.save(compte);

    const loginUrl =
      `${this.getFrontUrl()}/login?context=MAGIC` +
      `&user=${encodeURIComponent(compte.login)}` +
      `&token=${encodeURIComponent(rawToken)}`;

    await this.mailService.sendAutomaticMail({
      to: compte.login,
      subject: 'Assolutions - Se connecter',
      record: 'MAGIC_LOGIN',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#222;line-height:1.5">
          <div style="padding:20px 24px;background:#1e3a5f;color:white;border-radius:8px 8px 0 0">
            <strong style="font-size:20px">Assolutions</strong>
          </div>
          <div style="padding:24px;border:1px solid #ddd;border-top:0">
            <h1 style="font-size:22px;margin:0 0 20px">Connexion à Assolutions</h1>
            <p>Bonjour,</p>
            <p>Cliquez sur le bouton ci-dessous pour vous connecter à Assolutions.</p>
            <p>Ce lien est temporaire et à usage unique. Aucun mot de passe n’est nécessaire.</p>
            <p style="margin:24px 0"><a href="${loginUrl}" target="_blank" style="display:inline-block;padding:12px 18px;background:#1e3a5f;color:white;text-decoration:none;border-radius:5px">Me connecter</a></p>
            <p>Si le bouton ne fonctionne pas, copiez-collez ce lien :</p>
            <p style="word-break:break-all">${loginUrl}</p>
            <p>Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer ce message.</p>
            <p style="margin-top:28px;color:#666;font-size:13px">Message automatique envoyé par Assolutions.</p>
          </div>
        </div>
      `,
    });
    return true;
  }

  async loginWithToken(login: string, token: string): Promise<any> {
    const compte = await this.findAccountForToken(login);
    if (!compte.actif) throw new BadRequestException('ACCOUNT_NOT_ACTIVE');
    if (!this.isMagicLoginToken(token)) {
      throw new BadRequestException('INVALID_OR_EXPIRED_TOKEN');
    }

    const valid = verifyTimedToken(
      token,
      compte.activation_token,
      this.tokenPepper,
      MAGIC_LOGIN_TOKEN_MAX_AGE_MS,
    );

    if (!valid) throw new BadRequestException('INVALID_OR_EXPIRED_TOKEN');

    // Usage unique : le lien n'est plus réutilisable après une connexion réussie.
    compte.activation_token = null;
    await this.compteRepo.save(compte);

    return this.issueSession(compte);
  }

  async me(userId: number): Promise<any> {
    const compte = await this.compteRepo.findOne({ where: { id: userId } });
    if (!compte) throw new NotFoundException('ACCOUNT_NOT_FOUND');
    if (!compte.actif) throw new BadRequestException('ACCOUNT_NOT_ACTIVE');
    return this.buildSession(compte);
  }

  async changeMyPassword(userId: number, newPassword: string | null): Promise<boolean> {
    const compte = await this.compteRepo.findOne({ where: { id: userId } });
    if (!compte) throw new NotFoundException('ACCOUNT_NOT_FOUND');

    const cleanPassword = newPassword?.trim() ?? '';
    if (cleanPassword) this.assertPassword(cleanPassword);

    compte.password = cleanPassword ? hashPassword(cleanPassword) : null;
    compte.activation_token = null;
    compte.actif = true;
    await this.compteRepo.save(compte);
    return true;
  }

  async getByLogin(login: string): Promise<CompteEntity> {
    const normalizedLogin = this.normalizeLogin(login);
    const compte = await this.compteRepo.findOne({
      where: { login: normalizedLogin },
    });

    if (!compte) throw new UnauthorizedException('ACCOUNT_NOT_FOUND');
    return compte;
  }

  async reinit_mdp(login: string): Promise<boolean> {
    const normalizedLogin = this.normalizeLogin(login);
    const compte = await this.compteRepo.findOne({
      where: { login: normalizedLogin },
    });

    // Réponse identique pour éviter l'énumération des comptes.
    if (!compte) return true;

    const rawToken = createTimedToken();
    compte.activation_token = hashOpaqueToken(rawToken, this.tokenPepper);
    await this.compteRepo.save(compte);

    const resetUrl =
      `${this.getFrontUrl()}/login?context=REINIT` +
      `&user=${encodeURIComponent(compte.login)}` +
      `&token=${encodeURIComponent(rawToken)}`;

    await this.mailService.sendPasswordReset(compte.login, resetUrl);
    return true;
  }

  async checkResetToken(login: string, token: string): Promise<boolean> {
    if (this.isMagicLoginToken(token)) {
      throw new BadRequestException('INVALID_OR_EXPIRED_TOKEN');
    }

    const compte = await this.findAccountForReset(login);
    const valid = verifyTimedToken(
      token,
      compte.activation_token,
      this.tokenPepper,
      RESET_TOKEN_MAX_AGE_MS,
    );

    if (!valid) throw new BadRequestException('INVALID_OR_EXPIRED_TOKEN');
    return true;
  }

  async setPasswordWithToken(
    login: string,
    token: string,
    newPassword: string,
  ): Promise<boolean> {
    // IMPORTANT : la validation est refaite ici côté serveur. Le fait que le
    // front ait appelé check-reset-token auparavant n'accorde aucun droit.
    if (this.isMagicLoginToken(token)) {
      throw new BadRequestException('INVALID_OR_EXPIRED_TOKEN');
    }

    const compte = await this.findAccountForReset(login);
    const valid = verifyTimedToken(
      token,
      compte.activation_token,
      this.tokenPepper,
      RESET_TOKEN_MAX_AGE_MS,
    );

    if (!valid) throw new BadRequestException('INVALID_OR_EXPIRED_TOKEN');

    const cleanPassword = newPassword?.trim() ?? '';
    if (cleanPassword) this.assertPassword(cleanPassword);

    compte.password = cleanPassword ? hashPassword(cleanPassword) : null;
    compte.activation_token = null;
    compte.actif = true;
    await this.compteRepo.save(compte);
    return true;
  }

  private async findAccountForReset(login: string): Promise<CompteEntity> {
    return this.findAccountForToken(login);
  }

  private async findAccountForToken(login: string): Promise<CompteEntity> {
    const normalizedLogin = this.normalizeLogin(login);
    const compte = await this.compteRepo.findOne({
      where: { login: normalizedLogin },
    });

    if (!compte) throw new BadRequestException('INVALID_OR_EXPIRED_TOKEN');
    return compte;
  }

  private createMagicLoginToken(): string {
    const [timestamp, randomPart] = createTimedToken().split('.');
    return `${timestamp}.${MAGIC_LOGIN_PREFIX}${randomPart}`;
  }

  private isMagicLoginToken(token: string): boolean {
    const [timestamp, randomPart, ...extra] = String(token ?? '').split('.');
    return (
      !!timestamp &&
      !!randomPart &&
      extra.length === 0 &&
      randomPart.startsWith(MAGIC_LOGIN_PREFIX)
    );
  }

  private verifyLegacyToken(
    token: string,
    expectedHash: string | null | undefined,
  ): boolean {
    if (!this.legacyPepper || !token || !expectedHash || token.includes('.')) {
      return false;
    }

    const legacyHash = require('node:crypto')
      .createHmac('sha256', this.legacyPepper)
      .update(token)
      .digest('hex');

    return legacyHash === expectedHash;
  }

  private getFrontUrl(): string {
    const value =
      this.config.get<string>('FRONT_URL') ??
      process.env.FRONT_URL ??
      'http://localhost:2211';
    return value.replace(/\/+$/, '');
  }

  private normalizeLogin(login: string): string {
    const normalized = String(login ?? '').trim().toLowerCase();
    if (!normalized) throw new UnauthorizedException('ACCOUNT_NOT_FOUND');
    return normalized;
  }

  private assertPassword(password: string): void {
    try {
      assertPasswordPolicy(password);
    } catch {
      throw new BadRequestException('PASSWORD_TOO_WEAK');
    }
  }

  private sanitizeCompte(compte: CompteEntity): CompteEntity {
    compte.password = null;
    compte.activation_token = null;
    return compte;
  }

  private requireSecret(name: string): string {
    const value = this.config.get<string>(name)?.trim();
    if (
      !value ||
      value.startsWith('CHANGE_ME') ||
      value.length < MIN_SECRET_LENGTH
    ) {
      throw new Error(
        `${name} must be configured with at least ${MIN_SECRET_LENGTH} characters`,
      );
    }
    return value;
  }
}
