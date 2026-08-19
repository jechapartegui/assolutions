import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as crypto from 'crypto';

import { AccessControlService } from '../common/access-control.service';
import {
  hashOpaqueToken,
  hashPasswordSecure,
  safeTokenMatch,
} from '../common/security/password-security';
import { LoginProjectEntity } from '../login_project/login_project.entity';
import { MessageService } from '../message/message.service';
import { ProjectEntity } from '../project/project.entity';
import {
  CreateCompteDto,
  CreateCompteWithProjectDto,
  RegisterCompteWithProjectDto,
  UpdateCompteDto,
} from './compte.dto';
import { CompteEntity } from './compte.entity';

@Injectable()
export class CompteService {
  private readonly pepper: string;

  constructor(
    @InjectRepository(CompteEntity)
    private readonly repo: Repository<CompteEntity>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly messageService: MessageService,
    private readonly access: AccessControlService,
  ) {
    this.pepper = this.config.get<string>('PEPPER') ?? '';
  }

  async listByProject(projectId: number): Promise<CompteEntity[]> {
    if (!projectId) throw new NotFoundException('projet introuvable');
    const comptes = await this.repo
      .createQueryBuilder('compte')
      .innerJoin(
        LoginProjectEntity,
        'lp',
        'lp.login_id = compte.id AND lp.project_id = :projectId',
        { projectId },
      )
      .orderBy('compte.login', 'ASC')
      .getMany();
    return comptes.map((compte) => this.hideSensitiveData(compte));
  }

  async listByProjectAuthorized(requesterId: number, projectId: number) {
    await this.access.assertProjectAdmin(requesterId, projectId);
    return this.listByProject(projectId);
  }

  async getAuthorized(
    id: number,
    requesterId: number,
    projectId?: number | null,
  ): Promise<CompteEntity> {
    await this.access.assertAccountAccess(requesterId, id, projectId);
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`compte ${id} introuvable`);
    return this.hideSensitiveData(item);
  }

  async createForProject(dto: CreateCompteDto, projectId: number): Promise<CompteEntity> {
    const login = this.resolveLogin(dto);
    await this.ensureLoginAvailable(login);
    const password = await this.hashPassword(dto.password);

    const saved = await this.dataSource.transaction(async (manager) => {
      const created = await manager.save(CompteEntity, {
        login,
        password,
        actif: dto.actif ?? false,
        mail_actif: dto.mail_actif ?? false,
        echec_connexion: dto.echec_connexion ?? false,
        activation_token: dto.activation_token ? hashOpaqueToken(dto.activation_token) : null,
      });
      await manager.save(LoginProjectEntity, {
        login_id: created.id,
        project_id: projectId,
      });
      return created;
    });

    return this.hideSensitiveData(saved);
  }

  async createWithProject(
    dto: CreateCompteWithProjectDto,
    guardedProjectId: number,
  ): Promise<CompteEntity> {
    if (Number(dto.project_id) !== Number(guardedProjectId)) {
      throw new ForbiddenException('PROJECT_MISMATCH');
    }

    return this.createAccountAndQueueActivation(
      this.resolveLogin(dto),
      guardedProjectId,
      dto.password,
    );
  }

  async registerWithProject(dto: RegisterCompteWithProjectDto): Promise<CompteEntity> {
    const projectId = Number(dto.project_id);
    const project = await this.dataSource.getRepository(ProjectEntity).findOne({
      where: { id: projectId, actif: true },
    });
    if (!project) {
      throw new BadRequestException({
        code: 'PROJECT_NOT_AVAILABLE',
        message: 'Le projet demandé est indisponible.',
      });
    }

    return this.createAccountAndQueueActivation(
      this.normalizeLogin(dto.email),
      projectId,
      dto.password,
    );
  }

  async resendActivation(email: string): Promise<{ ok: true }> {
    const login = this.normalizeLogin(email);
    const account = await this.repo.findOne({ where: { login } });
    if (!account || account.actif || account.mail_actif) return { ok: true };

    const rawToken = this.createRawToken();
    account.activation_token = hashOpaqueToken(rawToken);
    await this.repo.save(account);
    this.queueActivationMail(login, rawToken);
    return { ok: true };
  }

  async check_token(login: string, token: string): Promise<CompteEntity> {
    const normalizedLogin = this.normalizeLogin(login);
    const item = await this.repo.findOne({ where: { login: normalizedLogin } });
    if (!item) {
      throw new NotFoundException({
        code: 'ACCOUNT_NOT_FOUND',
        message: `Compte ${normalizedLogin} introuvable`,
      });
    }

    if (!item.activation_token || !this.activationTokenMatches(token, item.activation_token)) {
      throw new NotFoundException({
        code: 'TOKEN_INVALID',
        message: 'Le lien d’activation est incorrect ou expiré.',
      });
    }

    item.mail_actif = true;
    item.actif = true;
    item.activation_token = null;
    return this.hideSensitiveData(await this.repo.save(item));
  }

  async updateAuthorized(
    id: number,
    dto: UpdateCompteDto,
    requesterId: number,
    projectId: number,
  ): Promise<CompteEntity> {
    await this.access.assertAccountAccess(requesterId, id, projectId);
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`compte ${id} introuvable`);

    if (dto.login && this.normalizeLogin(dto.login) !== item.login) {
      const login = this.normalizeLogin(dto.login);
      await this.ensureLoginAvailable(login, id);
      item.login = login;
    }
    if (dto.password !== undefined) item.password = await this.hashPassword(dto.password);
    if (dto.actif !== undefined) item.actif = dto.actif;
    if (dto.mail_actif !== undefined) item.mail_actif = dto.mail_actif;
    if (dto.activation_token !== undefined) {
      item.activation_token = dto.activation_token
        ? hashOpaqueToken(dto.activation_token)
        : null;
    }
    return this.hideSensitiveData(await this.repo.save(item));
  }

  async removeAuthorized(
    id: number,
    requesterId: number,
    projectId: number,
  ): Promise<{ ok: true }> {
    await this.access.assertAccountAccess(requesterId, id, projectId);
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`compte ${id} introuvable`);
    await this.repo.remove(item);
    return { ok: true };
  }

  private async createAccountAndQueueActivation(
    login: string,
    projectId: number,
    password: string | null | undefined,
  ): Promise<CompteEntity> {
    if (!projectId) {
      throw new BadRequestException({
        code: 'PROJECT_REQUIRED',
        message: 'project_id obligatoire',
      });
    }

    await this.ensureLoginAvailable(login);
    const rawToken = this.createRawToken();
    const hashedPassword = await this.hashPassword(password);
    const compte = await this.dataSource.transaction(async (manager) => {
      const created = await manager.save(CompteEntity, {
        login,
        password: hashedPassword,
        actif: false,
        mail_actif: false,
        echec_connexion: false,
        activation_token: hashOpaqueToken(rawToken),
      });
      await manager.save(LoginProjectEntity, {
        login_id: created.id,
        project_id: projectId,
      });
      return created;
    });

    this.queueActivationMail(login, rawToken);
    return this.hideSensitiveData(compte);
  }

  private queueActivationMail(login: string, rawToken: string): void {
    const activationUrl = this.buildActivationUrl(login, rawToken);
    void this.messageService.sendActivationMail(login, activationUrl).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Échec envoi activation vers ${login}: ${message}`);
    });
  }

  private resolveLogin(dto: CreateCompteDto | CreateCompteWithProjectDto): string {
    const raw = dto.email ?? (dto as CreateCompteDto).login;
    if (!raw) throw new BadRequestException('login/email obligatoire');
    return this.normalizeLogin(raw);
  }

  private normalizeLogin(login: string): string {
    const normalized = (login ?? '').trim().toLowerCase();
    if (!normalized) throw new BadRequestException('login obligatoire');
    return normalized;
  }

  private async ensureLoginAvailable(login: string, exceptId?: number): Promise<void> {
    const existing = await this.repo.findOne({ where: { login } });
    if (existing && Number(existing.id) !== Number(exceptId)) {
      throw new ConflictException({
        code: 'ACCOUNT_ALREADY_EXISTS',
        message: `Un compte existe déjà avec l’adresse ${login}.`,
        details: { login, actif: existing.actif, mail_actif: existing.mail_actif },
      });
    }
  }

  private async hashPassword(password: string | null | undefined): Promise<string | null> {
    const clean = password?.trim() ?? '';
    if (!clean) return null;
    return hashPasswordSecure(clean);
  }

  private createRawToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private activationTokenMatches(rawToken: string, storedToken: string): boolean {
    const current = hashOpaqueToken(rawToken);
    if (safeTokenMatch(current, storedToken)) return true;

    if (this.pepper && /^[0-9a-f]{64}$/i.test(storedToken)) {
      const legacy = crypto
        .createHmac('sha256', this.pepper)
        .update(rawToken)
        .digest('hex');
      return safeTokenMatch(legacy, storedToken);
    }
    return false;
  }

  private buildActivationUrl(login: string, rawToken: string): string {
    return (
      `${this.getFrontUrl()}/login?context=ACTIVATION` +
      `&user=${encodeURIComponent(login)}` +
      `&token=${encodeURIComponent(rawToken)}`
    );
  }

  private getFrontUrl(): string {
    const value =
      this.config.get<string>('FRONT_URL') ??
      process.env.FRONT_URL ??
      'http://localhost:2211';
    return value.replace(/\/+$/, '');
  }

  private hideSensitiveData(compte: CompteEntity): CompteEntity {
    compte.password = null;
    compte.activation_token = null;
    return compte;
  }
}
