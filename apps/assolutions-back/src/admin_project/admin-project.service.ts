import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { DataSource } from 'typeorm';

import { AuthService } from '../auth/auth.services';

interface ElevationPayload {
  userId: number;
  projectId: number;
  expiresAt: number;
  nonce: string;
}

export interface AdminProjectUpdateDto {
  nom?: string;
  login?: string | null;
  public?: boolean;
  date_debut?: string | null;
  date_fin?: string | null;
  activite?: string | null;
  lang?: string | null;
  couleur?: string | null;
  contact?: unknown;
  adresse?: unknown;
}

export interface AdminAccountUpdateDto {
  login?: string;
  actif?: boolean;
  mail_actif?: boolean;
  elevation_token?: string | null;
}

@Injectable()
export class AdminProjectService {
  private readonly failedElevationAttempts = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly auth: AuthService,
  ) {}

  async overview(projectId: number) {
    const project = await this.getProject(projectId);
    const [accountRows, personRows] = await Promise.all([
      this.dataSource.query(
        `SELECT COUNT(*)::int AS count FROM login_project WHERE project_id = $1`,
        [projectId],
      ),
      this.dataSource.query(
        `
          SELECT COUNT(*)::int AS count
          FROM personne pe
          WHERE EXISTS (
            SELECT 1 FROM login_project lp
            WHERE lp.login_id = pe.compte AND lp.project_id = $1
          )
        `,
        [projectId],
      ),
    ]);

    return {
      project,
      accountCount: Number(accountRows?.[0]?.count ?? 0),
      personCount: Number(personRows?.[0]?.count ?? 0),
    };
  }

  async listAccounts(projectId: number) {
    return this.dataSource.query(
      `
        SELECT
          c.id,
          c.login,
          c.actif,
          c.mail_actif,
          c.mail_ko,
          c.echec_connexion,
          c.derniere_connexion,
          (
            SELECT COUNT(*)::int
            FROM login_project lp_count
            WHERE lp_count.login_id = c.id
          ) AS project_count,
          COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object('id', pr.id, 'nom', pr.nom)
              ORDER BY pr.nom
            )
            FROM login_project lp_all
            INNER JOIN project pr ON pr.id = lp_all.project_id
            WHERE lp_all.login_id = c.id
          ), '[]'::jsonb) AS projects,
          COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', pe.id,
                'first_name', pe.first_name,
                'last_name', pe.last_name,
                'nickname', pe.nickname,
                'archive', pe.archive
              )
              ORDER BY pe.last_name, pe.first_name
            )
            FROM personne pe
            WHERE pe.compte = c.id
          ), '[]'::jsonb) AS people
        FROM compte c
        INNER JOIN login_project lp_current
          ON lp_current.login_id = c.id
         AND lp_current.project_id = $1
        ORDER BY LOWER(c.login), c.id
      `,
      [projectId],
    );
  }

  async listPeople(projectId: number) {
    return this.dataSource.query(
      `
        SELECT
          pe.id,
          pe.compte,
          pe.first_name,
          pe.last_name,
          pe.nickname,
          pe.date_naissance,
          pe.gender,
          pe.archive,
          pe.date_creation,
          pe.date_maj,
          c.login,
          c.actif AS compte_actif,
          c.mail_actif,
          (
            SELECT COUNT(*)::int
            FROM login_project lp_count
            WHERE lp_count.login_id = c.id
          ) AS project_count,
          COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', sa.id,
                'nom', sa.nom,
                'active', ins.active,
                'date_inscription', ins.date_inscription
              )
              ORDER BY sa.date_debut DESC NULLS LAST, sa.id DESC
            )
            FROM inscription_saison ins
            INNER JOIN saison sa ON sa.id = ins.saison_id
            WHERE ins.personne_id = pe.id
              AND sa.project_id = $1
          ), '[]'::jsonb) AS saisons
        FROM personne pe
        INNER JOIN compte c ON c.id = pe.compte
        INNER JOIN login_project lp
          ON lp.login_id = c.id
         AND lp.project_id = $1
        ORDER BY LOWER(pe.last_name), LOWER(pe.first_name), pe.id
      `,
      [projectId],
    );
  }

  async updateProject(projectId: number, dto: AdminProjectUpdateDto) {
    const current = await this.getProject(projectId);
    const next = {
      nom: this.textOr(current.nom, dto.nom),
      login: this.nullableTextOr(current.login, dto.login),
      public: dto.public == null ? !!current.public : !!dto.public,
      date_debut: dto.date_debut === undefined ? current.date_debut : dto.date_debut || null,
      date_fin: dto.date_fin === undefined ? current.date_fin : dto.date_fin || null,
      activite: this.nullableTextOr(current.activite, dto.activite),
      lang: this.nullableTextOr(current.lang, dto.lang),
      couleur: this.nullableTextOr(current.couleur, dto.couleur),
      contact: dto.contact === undefined ? current.contact : dto.contact,
      adresse: dto.adresse === undefined ? current.adresse : dto.adresse,
    };

    if (!next.nom) throw new BadRequestException('PROJECT_NAME_REQUIRED');

    await this.dataSource.query(
      `
        UPDATE project
        SET nom = $2,
            login = $3,
            public = $4,
            date_debut = $5,
            date_fin = $6,
            activite = $7,
            lang = $8,
            couleur = $9,
            contact = $10::jsonb,
            adresse = $11::jsonb
        WHERE id = $1
      `,
      [
        projectId,
        next.nom,
        next.login,
        next.public,
        next.date_debut,
        next.date_fin,
        next.activite,
        next.lang,
        next.couleur,
        JSON.stringify(next.contact ?? null),
        JSON.stringify(next.adresse ?? null),
      ],
    );

    return this.getProject(projectId);
  }

  elevate(userId: number, projectId: number, code: string) {
    const configuredCode = this.getConfiguredElevationCode();
    const attemptKey = `${userId}:${projectId}`;
    this.assertElevationRateLimit(attemptKey);

    const supplied = Buffer.from(String(code ?? ''), 'utf8');
    const expected = Buffer.from(configuredCode, 'utf8');
    const valid = supplied.length === expected.length && timingSafeEqual(supplied, expected);

    if (!valid) {
      this.recordFailedElevation(attemptKey);
      throw new ForbiddenException('SUPER_ADMIN_CODE_INVALID');
    }

    this.failedElevationAttempts.delete(attemptKey);
    const ttlMinutes = Math.min(
      60,
      Math.max(5, Number(this.config.get('ADMIN_PROJECT_ELEVATION_TTL_MINUTES') ?? 15)),
    );
    const expiresAt = Date.now() + ttlMinutes * 60_000;
    const payload: ElevationPayload = {
      userId,
      projectId,
      expiresAt,
      nonce: randomBytes(12).toString('hex'),
    };

    return {
      token: this.signElevationPayload(payload),
      expiresAt,
    };
  }

  async updateAccount(
    userId: number,
    projectId: number,
    accountId: number,
    dto: AdminAccountUpdateDto,
  ) {
    const account = await this.getAccountForProject(projectId, accountId);
    this.requireElevationForSharedAccount(
      userId,
      projectId,
      Number(account.project_count),
      dto.elevation_token,
    );

    const login = dto.login === undefined
      ? String(account.login)
      : String(dto.login ?? '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login)) {
      throw new BadRequestException('ACCOUNT_EMAIL_INVALID');
    }

    const duplicate = await this.dataSource.query(
      `SELECT id FROM compte WHERE LOWER(login) = LOWER($1) AND id <> $2 LIMIT 1`,
      [login, accountId],
    );
    if (duplicate.length) throw new BadRequestException('ACCOUNT_EMAIL_ALREADY_USED');

    await this.dataSource.query(
      `
        UPDATE compte
        SET login = $2,
            actif = $3,
            mail_actif = $4
        WHERE id = $1
      `,
      [
        accountId,
        login,
        dto.actif == null ? !!account.actif : !!dto.actif,
        dto.mail_actif == null ? !!account.mail_actif : !!dto.mail_actif,
      ],
    );

    return this.getAccountForProject(projectId, accountId);
  }

  async resetPassword(
    userId: number,
    projectId: number,
    accountId: number,
    elevationToken?: string | null,
  ) {
    const account = await this.getAccountForProject(projectId, accountId);
    this.requireElevationForSharedAccount(
      userId,
      projectId,
      Number(account.project_count),
      elevationToken,
    );

    await this.auth.reinit_mdp(String(account.login));
    return { ok: true };
  }

  private async getProject(projectId: number) {
    const rows = await this.dataSource.query(
      `
        SELECT id, nom, actif, public, date_debut, date_fin,
               contact, adresse, activite, lang, logo, couleur, login
        FROM project
        WHERE id = $1
        LIMIT 1
      `,
      [projectId],
    );
    if (!rows.length) throw new NotFoundException('PROJECT_NOT_FOUND');
    return rows[0];
  }

  private async getAccountForProject(projectId: number, accountId: number) {
    const rows = await this.dataSource.query(
      `
        SELECT c.id, c.login, c.actif, c.mail_actif, c.mail_ko,
               c.echec_connexion, c.derniere_connexion,
               (SELECT COUNT(*)::int FROM login_project lp2 WHERE lp2.login_id = c.id) AS project_count
        FROM compte c
        INNER JOIN login_project lp ON lp.login_id = c.id AND lp.project_id = $1
        WHERE c.id = $2
        LIMIT 1
      `,
      [projectId, accountId],
    );
    if (!rows.length) throw new NotFoundException('ACCOUNT_NOT_FOUND_IN_PROJECT');
    return rows[0];
  }

  private requireElevationForSharedAccount(
    userId: number,
    projectId: number,
    projectCount: number,
    token?: string | null,
  ): void {
    if (projectCount <= 1) return;
    if (!this.verifyElevationToken(token, userId, projectId)) {
      throw new ForbiddenException('SUPER_ADMIN_ELEVATION_REQUIRED');
    }
  }

  private verifyElevationToken(
    token: string | null | undefined,
    userId: number,
    projectId: number,
  ): boolean {
    if (!token) return false;
    const [encoded, suppliedSignature] = String(token).split('.');
    if (!encoded || !suppliedSignature) return false;

    const expectedSignature = this.sign(encoded);
    const supplied = Buffer.from(suppliedSignature, 'utf8');
    const expected = Buffer.from(expectedSignature, 'utf8');
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return false;

    try {
      const payload = JSON.parse(
        Buffer.from(encoded, 'base64url').toString('utf8'),
      ) as ElevationPayload;
      return (
        Number(payload.userId) === Number(userId) &&
        Number(payload.projectId) === Number(projectId) &&
        Number(payload.expiresAt) > Date.now()
      );
    } catch {
      return false;
    }
  }

  private signElevationPayload(payload: ElevationPayload): string {
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    return `${encoded}.${this.sign(encoded)}`;
  }

  private sign(value: string): string {
    return createHmac('sha256', this.elevationSigningKey())
      .update(value)
      .digest('base64url');
  }

  private elevationSigningKey(): Buffer {
    const jwtSecret = String(this.config.get('JWT_SECRET') ?? '');
    const code = this.getConfiguredElevationCode();
    return createHash('sha256').update(`${jwtSecret}:${code}:admin-project`).digest();
  }

  private getConfiguredElevationCode(): string {
    const code = String(this.config.get('ADMIN_PROJECT_SUPER_CODE') ?? '').trim();
    if (!code || code.startsWith('CHANGE_ME') || code.length < 12) {
      throw new ServiceUnavailableException('ADMIN_PROJECT_SUPER_CODE_NOT_CONFIGURED');
    }
    return code;
  }

  private assertElevationRateLimit(key: string): void {
    const state = this.failedElevationAttempts.get(key);
    if (!state) return;
    if (state.resetAt <= Date.now()) {
      this.failedElevationAttempts.delete(key);
      return;
    }
    if (state.count >= 5) throw new ForbiddenException('SUPER_ADMIN_CODE_TEMPORARILY_LOCKED');
  }

  private recordFailedElevation(key: string): void {
    const now = Date.now();
    const current = this.failedElevationAttempts.get(key);
    if (!current || current.resetAt <= now) {
      this.failedElevationAttempts.set(key, { count: 1, resetAt: now + 15 * 60_000 });
      return;
    }
    this.failedElevationAttempts.set(key, { ...current, count: current.count + 1 });
  }

  private textOr(current: unknown, next: unknown): string {
    return next === undefined ? String(current ?? '').trim() : String(next ?? '').trim();
  }

  private nullableTextOr(current: unknown, next: unknown): string | null {
    if (next === undefined) return current == null ? null : String(current);
    const value = String(next ?? '').trim();
    return value || null;
  }
}
