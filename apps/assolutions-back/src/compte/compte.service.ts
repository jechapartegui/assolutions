import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as crypto from 'crypto';

import { MessageService } from '../message/message.service';
import { LoginProjectEntity } from '../login_project/login_project.entity';
import { CompteEntity } from './compte.entity';
import {
  CreateCompteDto,
  CreateCompteWithProjectDto,
  RegisterCompteWithProjectDto,
  UpdateCompteDto,
} from './compte.dto';

@Injectable()
export class CompteService {
  private readonly pepper: string;

  constructor(
    @InjectRepository(CompteEntity)
    private readonly repo: Repository<CompteEntity>,

    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly messageService: MessageService,
  ) {
    this.pepper = this.config.get<string>('PEPPER') ?? '';
  }

  /**
   * Liste des comptes rattachés au projet courant.
   * Utilisé par le select compte côté prof/admin.
   */
  list(projectId: number): Promise<CompteEntity[]> {
    if (!projectId) {
      throw new NotFoundException('projet introuvable');
    }

    return this.listByProject(projectId);
  }

  async listByProject(projectId: number): Promise<CompteEntity[]> {
    if (!projectId) {
      throw new NotFoundException('projet introuvable');
    }

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

  async get(id: number): Promise<CompteEntity> {
    const item = await this.repo.findOne({ where: { id } });

    if (!item) {
      throw new NotFoundException(`compte ${id} introuvable`);
    }

    return this.hideSensitiveData(item);
  }

  /**
   * Création simple.
   * À réserver aux usages admin/backoffice.
   * Les parcours normaux doivent plutôt passer par createWithProject/registerWithProject.
   */
  async create(dto: CreateCompteDto): Promise<CompteEntity> {
    const login = this.resolveLogin(dto);

    await this.ensureLoginAvailable(login);

    const entity = this.repo.create({
      login,
      password: this.hashPassword(dto.password),
      actif: dto.actif ?? false,
      mail_actif: dto.mail_actif ?? false,
      echec_connexion: dto.echec_connexion ?? false,
      activation_token: dto.activation_token ?? null,
    });

    const saved = await this.repo.save(entity);

    return this.hideSensitiveData(saved);
  }

  /**
   * Admin/projet : crée le compte puis son rattachement login_project.
   * Le tout est transactionnel pour éviter les comptes orphelins.
   *
   * Le compte reste inactif tant que l'utilisateur n'a pas utilisé le lien
   * reçu par mail pour définir son mot de passe / activer son compte.
   */
  async createWithProject(dto: CreateCompteWithProjectDto): Promise<CompteEntity> {
    const login = this.resolveLogin(dto);
    const projectId = Number(dto.project_id);

    if (!projectId) {
      throw new BadRequestException('project_id obligatoire');
    }

    await this.ensureLoginAvailable(login);

    const rawToken = this.createRawToken();
    const hashedToken = this.hashToken(rawToken);

    const compte = await this.dataSource.transaction(async (manager) => {
      const created = await manager.save(CompteEntity, {
        login,
        password: this.hashPassword(dto.password),
        actif: false,
        mail_actif: false,
        echec_connexion: false,
        activation_token: hashedToken,
      });

      await manager.save(LoginProjectEntity, {
        login_id: created.id,
        project_id: projectId,
      });

      return created;
    });

    await this.sendActivationMail(login, rawToken);

    return this.hideSensitiveData(compte);
  }

  /**
   * Public : création de compte depuis /creer-compte.
   * project_id est obligatoire, sinon l’utilisateur crée un compte qui ne sert à rien.
   */
  async registerWithProject(
    dto: RegisterCompteWithProjectDto,
  ): Promise<CompteEntity> {
    const login = this.normalizeLogin(dto.email);
    const projectId = Number(dto.project_id);

    if (!projectId) {
      throw new BadRequestException('project_id obligatoire');
    }

    await this.ensureLoginAvailable(login);

    const rawToken = this.createRawToken();
    const hashedToken = this.hashToken(rawToken);

    const compte = await this.dataSource.transaction(async (manager) => {
      const created = await manager.save(CompteEntity, {
        login,
        password: this.hashPassword(dto.password),
        actif: false,
        mail_actif: false,
        echec_connexion: false,
        activation_token: hashedToken,
      });

      await manager.save(LoginProjectEntity, {
        login_id: created.id,
        project_id: projectId,
      });

      return created;
    });

    await this.sendActivationMail(login, rawToken);

    return this.hideSensitiveData(compte);
  }

  /**
   * Validation simple du token.
   *
   * Important : on ne consomme pas le token ici.
   * Le flux /login?context=REINIT doit pouvoir vérifier le token puis appeler
   * l'endpoint auth qui définit le mot de passe et active vraiment le compte.
   */
async check_token(login: string, token: string): Promise<CompteEntity> {
  const normalizedLogin = this.normalizeLogin(login);
  const item = await this.repo.findOne({ where: { login: normalizedLogin } });

  if (!item) {
    throw new NotFoundException(`compte ${normalizedLogin} introuvable`);
  }

  const received = this.hashToken(token);

  if (!item.activation_token || item.activation_token !== received) {
    throw new NotFoundException(`token incorrect pour le compte ${normalizedLogin}`);
  }

  item.mail_actif = true;
  item.actif = true;
  item.activation_token = null;

  const saved = await this.repo.save(item);

  saved.password = null;
  saved.activation_token = null;

  return saved;
}


  async update(id: number, dto: UpdateCompteDto): Promise<CompteEntity> {
    const item = await this.repo.findOne({ where: { id } });

    if (!item) {
      throw new NotFoundException(`compte ${id} introuvable`);
    }

    if (dto.login && this.normalizeLogin(dto.login) !== item.login) {
      const login = this.normalizeLogin(dto.login);
      await this.ensureLoginAvailable(login, id);
      item.login = login;
    }

    if (dto.password !== undefined) {
      item.password = this.hashPassword(dto.password);
    }

    if (dto.actif !== undefined) {
      item.actif = dto.actif;
    }

    if (dto.mail_actif !== undefined) {
      item.mail_actif = dto.mail_actif;
    }

    if (dto.activation_token !== undefined) {
      item.activation_token = dto.activation_token
        ? this.hashToken(dto.activation_token)
        : null;
    }

    const saved = await this.repo.save(item);

    return this.hideSensitiveData(saved);
  }

  async remove(id: number): Promise<{ ok: true }> {
    const item = await this.repo.findOne({ where: { id } });

    if (!item) {
      throw new NotFoundException(`compte ${id} introuvable`);
    }

    await this.repo.remove(item);

    return { ok: true };
  }

  private resolveLogin(dto: CreateCompteDto): string {
    const raw = dto.email ?? dto.login;

    if (!raw) {
      throw new BadRequestException('login/email obligatoire');
    }

    return this.normalizeLogin(raw);
  }

  private normalizeLogin(login: string): string {
    const normalized = (login ?? '').trim().toLowerCase();

    if (!normalized) {
      throw new BadRequestException('login obligatoire');
    }

    return normalized;
  }

  private async ensureLoginAvailable(
    login: string,
    exceptId?: number,
  ): Promise<void> {
    const existing = await this.repo.findOne({ where: { login } });

    if (existing && Number(existing.id) !== Number(exceptId)) {
      throw new ConflictException(`Le compte ${login} existe déjà`);
    }
  }

  private hashPassword(password: string | null | undefined): string | null {
    const clean = password?.trim() ?? '';

    if (!clean) {
      return null;
    }

    return crypto
      .createHmac('sha256', this.pepper)
      .update(clean)
      .digest('hex');
  }

  private createRawToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private hashToken(token: string): string {
    return crypto
      .createHmac('sha256', this.pepper)
      .update(token)
      .digest('hex');
  }

private buildActivationUrl(login: string, rawToken: string): string {
  const frontUrl = this.getFrontUrl();

  return (
    `${frontUrl}/login?context=ACTIVATION` +
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

  private async sendActivationMail(
    login: string,
    rawToken: string,
  ): Promise<void> {
    const activationUrl = this.buildActivationUrl(login, rawToken);

    await this.messageService.sendActivationMail(login, activationUrl);

    // Très pratique en recette/dev, inoffensif en prod mais tu peux le retirer.
    console.log('ACTIVATION URL:', activationUrl);
  }

  private hideSensitiveData(compte: CompteEntity): CompteEntity {
    compte.password = null;
    compte.activation_token = null;

    return compte;
  }
}
