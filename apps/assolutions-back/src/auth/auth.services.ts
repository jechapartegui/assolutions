import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';

import { ProjetView } from '@shared/lib/compte.interface';
import {
  hashOpaqueToken,
  hashPasswordSecure,
  normalizePassword,
  safeTokenMatch,
  verifyPasswordSecure,
} from '../common/security/password-security';
import { CompteEntity } from '../compte/compte.entity';
import { LoginProjectEntity } from '../login_project/login_project.entity';
import { MessageService } from '../message/message.service';
import { PersonneEntity } from '../personne/personne.entity';
import { ProjectEntity } from '../project/project.entity';
import { SaisonEntity } from '../saison/saison.entity';

type AppMode = 'ADMIN' | 'APPLI';

@Injectable()
export class AuthService {
  private static readonly RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
  private readonly pepper: string;

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
    // Temporaire : uniquement pour vérifier les anciens HMAC lors de leur migration.
    this.pepper = this.config.get<string>('PEPPER') ?? '';
  }

  private signToken(compte: CompteEntity): string {
    return this.jwt.sign({
      sub: compte.id,
      login: compte.login,
      superAdmin: false,
    });
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

    if (mode === 'APPLI') {
      const projects = await this.getProjectsForCompte(compte.id);
      return {
        token,
        compte: this.hideSensitiveAccountData(compte),
        mode,
        projects,
      };
    }

    const pr = await this.projectRepo.findOne({ where: { compte: compte.id } });
    if (!pr) throw new NotFoundException('PROJECT_NOT_FOUND');

    const ss = await this.saisonRepo.findOne({
      where: { project_id: pr.id, active: true },
    });
    const ttpr: ProjetView = {
      id: pr.id,
      nom: pr.nom,
      rights: { adherent: true, prof: true, visible: true },
      saison_active: ss,
    };

    return {
      token,
      compte: this.hideSensitiveAccountData(compte),
      mode,
      projects: [ttpr],
    };
  }

  async prelogin(login: string): Promise<{ password_required: boolean; mode: AppMode }> {
    const compte = await this.getByLogin(login);
    if (!compte.actif) throw new BadRequestException('ACCOUNT_NOT_ACTIVE');

    return {
      // Un compte actif sans mot de passe ne doit jamais devenir passwordless.
      password_required: true,
      mode: await this.computeMode(compte.id),
    };
  }

  async login(login: string, password?: string): Promise<any> {
    const compte = await this.getByLogin(login);
    if (!compte.actif) throw new BadRequestException('ACCOUNT_NOT_ACTIVE');

    const storedPassword = compte.password?.trim() ?? '';
    if (!storedPassword) throw new BadRequestException('PASSWORD_NOT_SET');
    if (!password) throw new BadRequestException('PASSWORD_REQUIRED');

    const verification = await verifyPasswordSecure(password, storedPassword, this.pepper);
    if (!verification.valid) throw new BadRequestException('INCORRECT_PASSWORD');

    if (verification.needsRehash) {
      compte.password = await hashPasswordSecure(password);
      await this.compteRepo.save(compte);
    }

    const token = this.signToken(compte);
    return this.buildSession(compte, token);
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

    const cleanPassword = this.validatePassword(newPassword);
    compte.password = await hashPasswordSecure(cleanPassword);
    compte.activation_token = null;
    compte.actif = true;
    await this.compteRepo.save(compte);
    return true;
  }

  async getByLogin(login: string): Promise<CompteEntity> {
    const normalizedLogin = this.normalizeLogin(login);
    const compte = await this.compteRepo.findOne({ where: { login: normalizedLogin } });
    if (!compte) throw new UnauthorizedException('ACCOUNT_NOT_FOUND');
    return compte;
  }

  async reinit_mdp(login: string): Promise<boolean> {
    const normalizedLogin = this.normalizeLogin(login, false);
    if (!normalizedLogin) return true;

    const compte = await this.compteRepo.findOne({ where: { login: normalizedLogin } });
    // Réponse identique pour éviter l'énumération des comptes.
    if (!compte) return true;

    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + AuthService.RESET_TOKEN_TTL_MS;
    compte.activation_token = `v2:${expiresAt}:${hashOpaqueToken(rawToken)}`;
    await this.compteRepo.save(compte);

    const frontUrl = (
      this.config.get<string>('FRONT_URL') ?? 'https://assolutions.club'
    ).replace(/\/+$/, '');
    const resetUrl =
      `${frontUrl}/login?context=REINIT` +
      `&user=${encodeURIComponent(compte.login)}` +
      `&token=${encodeURIComponent(rawToken)}`;

    try {
      await this.mailService.sendPasswordReset(compte.login, resetUrl);
    } catch {
      // Ne pas révéler par la réponse HTTP qu'un compte existe ou non.
      console.error('Password reset email delivery failed');
    }
    return true;
  }

  async checkResetToken(login: string, token: string): Promise<boolean> {
    const compte = await this.getByLogin(login);
    this.assertValidResetToken(compte.activation_token, token);
    return true;
  }

  async setPasswordWithToken(
    login: string,
    token: string,
    newPassword: string,
  ): Promise<boolean> {
    const compte = await this.getByLogin(login);

    // P0 : vérification impérative AVANT toute modification du compte.
    this.assertValidResetToken(compte.activation_token, token);

    const cleanPassword = this.validatePassword(newPassword);
    compte.password = await hashPasswordSecure(cleanPassword);
    compte.activation_token = null;
    compte.actif = true;
    await this.compteRepo.save(compte);
    return true;
  }

  private assertValidResetToken(storedToken: string | null, rawToken: string): void {
    if (!storedToken || !rawToken) throw new BadRequestException('INVALID_TOKEN');

    if (storedToken.startsWith('v2:')) {
      const [, rawExpiry, expectedHash] = storedToken.split(':');
      const expiry = Number(rawExpiry);
      if (!Number.isFinite(expiry) || Date.now() > expiry) {
        throw new BadRequestException('TOKEN_EXPIRED');
      }

      const receivedHash = hashOpaqueToken(rawToken);
      if (!safeTokenMatch(receivedHash, expectedHash)) {
        throw new BadRequestException('INVALID_TOKEN');
      }
      return;
    }

    // Compatibilité limitée avec les liens générés avant la correction.
    if (this.pepper && /^[0-9a-f]{64}$/i.test(storedToken)) {
      const legacyHash = crypto
        .createHmac('sha256', this.pepper)
        .update(rawToken)
        .digest('hex');
      if (safeTokenMatch(legacyHash, storedToken)) return;
    }

    throw new BadRequestException('INVALID_TOKEN');
  }

  private validatePassword(password: string | null | undefined): string {
    const clean = normalizePassword(password);
    if (clean.length < 8 || !/\d/.test(clean)) {
      throw new BadRequestException('PASSWORD_TOO_WEAK');
    }
    return clean;
  }

  private normalizeLogin(login: string, required = true): string {
    const normalized = (login ?? '').trim().toLowerCase();
    if (!normalized && required) throw new UnauthorizedException('ACCOUNT_NOT_FOUND');
    return normalized;
  }

  private hideSensitiveAccountData(compte: CompteEntity): CompteEntity {
    compte.password = null;
    compte.activation_token = null;
    return compte;
  }
}
