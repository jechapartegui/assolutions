import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

import {
  assertPasswordPolicy,
  hashPassword,
  issueReusableTimedToken,
} from '../auth/security.utils';
import { CompteEntity } from '../compte/compte.entity';
import { LoginProjectEntity } from '../login_project/login_project.entity';
import { MailProjectEntity } from '../mail_project/mail_project.entity';
import { MessageService } from '../message/message.service';
import { ProjectEntity } from '../project/project.entity';
import { BootstrapClubDto } from './onboarding.dto';

const ACTIVATION_TOKEN_MAX_AGE_MS = 48 * 60 * 60 * 1000;

@Injectable()
export class OnboardingService {
  private readonly tokenPepper: string;

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly messageService: MessageService,
  ) {
    this.tokenPepper = this.requireSecret('TOKEN_PEPPER');
  }

  async bootstrap(dto: BootstrapClubDto) {
    const email = this.normalizeEmail(dto.email);
    const clubName = String(dto.club_name ?? '').trim();
    const activity = String(dto.activity ?? '').trim();

    if (!clubName) throw new BadRequestException('CLUB_NAME_REQUIRED');
    if (!activity) throw new BadRequestException('ACTIVITY_REQUIRED');

    const existing = await this.dataSource.getRepository(CompteEntity).findOne({
      where: { login: email },
    });
    if (existing) {
      throw new ConflictException({
        code: 'ACCOUNT_ALREADY_EXISTS',
        message: `Un compte existe déjà avec l’adresse ${email}.`,
      });
    }

    const password = String(dto.password ?? '').trim();
    let passwordHash: string | null = null;
    if (password) {
      try {
        assertPasswordPolicy(password);
        passwordHash = hashPassword(password);
      } catch {
        throw new BadRequestException('PASSWORD_TOO_WEAK');
      }
    }

    const issued = issueReusableTimedToken(
      email,
      'activation',
      this.tokenPepper,
      null,
      ACTIVATION_TOKEN_MAX_AGE_MS,
    );

    const now = new Date();
    const startDate = now.toISOString().slice(0, 10);
    const end = new Date(now);
    end.setFullYear(end.getFullYear() + 10);
    const endDate = end.toISOString().slice(0, 10);

    const result = await this.dataSource.transaction(async (manager) => {
      const compte = await manager.save(
        CompteEntity,
        manager.create(CompteEntity, {
          login: email,
          password: passwordHash,
          actif: false,
          mail_actif: false,
          echec_connexion: false,
          activation_token: issued.storedToken,
        }),
      );

      const project = await manager.save(
        ProjectEntity,
        manager.create(ProjectEntity, {
          nom: clubName,
          actif: true,
          public: false,
          date_debut: startDate,
          date_fin: endDate,
          contact: { email },
          adresse: null,
          activite: activity,
          lang: 'fr',
          logo: null,
          couleur: '#00d1b2',
          login: `club-${compte.id}`,
          password: '',
          activation_token: null,
          compte: compte.id,
        }),
      );

      await manager.save(
        LoginProjectEntity,
        manager.create(LoginProjectEntity, {
          login_id: compte.id,
          project_id: project.id,
        }),
      );

      await manager.save(
        MailProjectEntity,
        manager.create(MailProjectEntity, {
          id: project.id,
          mail_relance: '',
          mail_annulation: '',
          mail_convocation: '',
          mail_essai: '',
          sujet_relance: '',
          sujet_annulation: '',
          sujet_convocation: '',
          sujet_essai: '',
          mail_vide: '',
          mail_bienvenue: '',
          sujet_bienvenue: '',
          mail_serie_seance: '',
          sujet_serie_seance: '',
        }),
      );

      return { compte, project };
    });

    const activationUrl = this.buildActivationUrl(email, issued.rawToken);
    void this.messageService.sendActivationMail(email, activationUrl).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Échec envoi activation onboarding: ${message}`);
    });

    return {
      ok: true,
      email,
      project_id: result.project.id,
      project_name: result.project.nom,
    };
  }

  async getStatus(projectId: number) {
    const [projectRows, saisonRows, lieuRows, groupeRows, profRows, contratRows, mailRows, bankRows] =
      await Promise.all([
        this.dataSource.query(
          `SELECT id, nom, activite
             FROM project
            WHERE id = $1`,
          [projectId],
        ),
        this.dataSource.query(
          `SELECT COUNT(*)::int AS count
             FROM saison
            WHERE project_id = $1`,
          [projectId],
        ),
        this.dataSource.query(
          `SELECT COUNT(*)::int AS count
             FROM lieu
            WHERE project_id = $1`,
          [projectId],
        ),
        this.dataSource.query(
          `SELECT COUNT(*)::int AS count
             FROM groupes g
             JOIN saison s ON s.id = g.saison_id
            WHERE s.project_id = $1`,
          [projectId],
        ),
        this.dataSource.query(
          `SELECT COUNT(*)::int AS count
             FROM professeur
            WHERE project_id = $1`,
          [projectId],
        ),
        this.dataSource.query(
          `SELECT COUNT(*)::int AS count
             FROM contrat_prof c
             JOIN saison s ON s.id = c.saison_id
            WHERE s.project_id = $1`,
          [projectId],
        ),
        this.dataSource.query(
          `SELECT CASE WHEN
              COALESCE(mail_relance, '') <> '' OR
              COALESCE(mail_annulation, '') <> '' OR
              COALESCE(mail_convocation, '') <> '' OR
              COALESCE(mail_essai, '') <> '' OR
              COALESCE(mail_bienvenue, '') <> '' OR
              COALESCE(mail_serie_seance, '') <> '' OR
              COALESCE(mail_vide, '') <> ''
            THEN true ELSE false END AS configured
             FROM mail_project
            WHERE id = $1`,
          [projectId],
        ),
        this.dataSource.query(
          `SELECT COUNT(*)::int AS count
             FROM compte_bancaire
            WHERE project_id = $1`,
          [projectId],
        ),
      ]);

    const project = projectRows[0] ?? null;
    const counts = {
      saison: Number(saisonRows[0]?.count ?? 0),
      lieu: Number(lieuRows[0]?.count ?? 0),
      groupe: Number(groupeRows[0]?.count ?? 0),
      professeur: Number(profRows[0]?.count ?? 0),
      contrat: Number(contratRows[0]?.count ?? 0),
      banque: Number(bankRows[0]?.count ?? 0),
    };

    const steps = {
      project: !!project?.nom && !!project?.activite,
      saison: counts.saison > 0,
      lieu: counts.lieu > 0,
      groupe: counts.groupe > 0,
      professeur: counts.professeur > 0,
      contrat: counts.contrat > 0,
      mails: mailRows[0]?.configured === true,
      banque: counts.banque > 0,
    };

    const requiredKeys: Array<keyof typeof steps> = [
      'project',
      'saison',
      'lieu',
      'groupe',
      'professeur',
      'contrat',
      'mails',
    ];
    const requiredDone = requiredKeys.filter((key) => steps[key]).length;

    return {
      project: project
        ? { id: Number(project.id), nom: project.nom, activite: project.activite }
        : null,
      counts,
      steps,
      required_done: requiredDone,
      required_total: requiredKeys.length,
      complete: requiredDone === requiredKeys.length,
    };
  }

  async createDefaultBank(projectId: number) {
    const existing = await this.dataSource.query(
      `SELECT id, nom, type
         FROM compte_bancaire
        WHERE project_id = $1
        ORDER BY id
        LIMIT 1`,
      [projectId],
    );
    if (existing.length) return existing[0];

    const rows = await this.dataSource.query(
      `INSERT INTO compte_bancaire (project_id, nom, type, info, actif, iban, carte_json, carte_titulaire)
       VALUES ($1, 'Compte principal', 'BANQUE', 'Compte créé automatiquement pendant l’initialisation', true, NULL, NULL, NULL)
       RETURNING id, nom, type`,
      [projectId],
    );
    return rows[0];
  }

  private normalizeEmail(value: string): string {
    const email = String(value ?? '').trim().toLowerCase();
    if (!email) throw new BadRequestException('EMAIL_REQUIRED');
    return email;
  }

  private buildActivationUrl(login: string, rawToken: string): string {
    return (
      `${this.getFrontUrl()}/login?context=ACTIVATION` +
      `&user=${encodeURIComponent(login)}` +
      `&token=${encodeURIComponent(rawToken)}` +
      `&redirect=${encodeURIComponent('/onboarding')}`
    );
  }

  private getFrontUrl(): string {
    const value =
      this.config.get<string>('FRONT_URL') ??
      process.env.FRONT_URL ??
      'http://localhost:2211';
    return value.replace(/\/+$/, '');
  }

  private requireSecret(name: string): string {
    const value = this.config.get<string>(name)?.trim();
    if (!value || value.startsWith('CHANGE_ME')) {
      throw new Error(`${name} must be configured`);
    }
    return value;
  }
}
