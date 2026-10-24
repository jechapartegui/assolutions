import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { CalendrierSyncService } from './calendrier-sync.service';
import { GoogleCalendrierClient } from './google-calendrier.client';

/**
 * Reconciliation optionnelle (OFF par defaut). Elle sert aux mises a jour faites
 * hors de l'editeur (edition seance/groupe/API) et aux erreurs Google temporaires.
 * Les notifications sont TOUJOURS desactivees sur ce canal automatique.
 */
@Injectable()
export class CalendrierWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CalendrierWorkerService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private dernierPassage: string | null = null;
  private dernierResultat = 'NON_DEMARRE';
  private derniersCalendriersTrouves = 0;

  constructor(
    private readonly db: DataSource,
    private readonly synchronisation: CalendrierSyncService,
    private readonly google: GoogleCalendrierClient,
  ) {}

  onModuleInit(): void {
    const actif = this.google.enabled && process.env.GOOGLE_CALENDAR_AUTO_SYNC === 'true';
    this.logger.log('EXG auto-sync: ' + (actif ? 'ACTIVE' : 'INACTIVE') +
      ' (Google=' + this.google.enabled +
      ', AUTO_SYNC=' + (process.env.GOOGLE_CALENDAR_AUTO_SYNC === 'true') +
      ', calendriers=actifs avec agenda Google existant)');
    if (!actif) {
      this.dernierResultat = 'DESACTIVE';
      return;
    }
    this.timer = setInterval(() => { void this.runOnce(); }, 60_000);
    this.timer.unref?.();
    this.logger.log('Calendrier outbox worker active (Google notifications disabled)');
    // Premier passage immediat : les changements PENDING precedant le redemarrage
    // n'attendent pas une minute supplementaire.
    void this.runOnce();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }


  /** Diagnostic lecture seule, scope projet exige par le controller. Aucun secret. */
  async etat(projectId: number, calendrierId: number) {
    const rows: Array<{
      id: number; actif: boolean; google_present: boolean;
      statut_synchro: string; evenements_pending: number;
    }> = await this.db.query(
      `SELECT c.id, c.actif, c.google_calendar_id IS NOT NULL AS google_present,
              c.statut_synchro,
              count(ce.id) FILTER (WHERE ce.statut_synchro IN (
                'PENDING','ERROR','DELETE_PENDING','SYNCING'
              ))::int AS evenements_pending
       FROM calendrier c
       LEFT JOIN calendrier_evenement ce ON ce.calendrier_id=c.id
       WHERE c.id=$1 AND c.project_id=$2
       GROUP BY c.id, c.actif, c.google_calendar_id, c.statut_synchro`,
      [calendrierId, projectId],
    );
    const calendrier = rows[0] ?? null;
    if (!calendrier) return { calendrier_trouve: false };
    const autoEnv = process.env.GOOGLE_CALENDAR_AUTO_SYNC === 'true';
    const active = this.google.enabled && autoEnv && !!this.timer;
    return {
      calendrier_trouve: true,
      calendrier_id: calendrier.id,
      statut_calendrier: calendrier.statut_synchro,
      evenements_pending: calendrier.evenements_pending,
      google_configure: this.google.enabled,
      auto_sync_configure: autoEnv,
      worker_demarre: !!this.timer,
      worker_en_cours: this.running,
      calendrier_google_existant: calendrier.google_present,
      calendrier_actif: calendrier.actif,
      eligibilite: active &&
        calendrier.actif && calendrier.google_present &&
        (calendrier.statut_synchro === 'PENDING' || calendrier.evenements_pending > 0),
      dernier_passage: this.dernierPassage,
      dernier_resultat: this.dernierResultat,
      derniers_calendriers_trouves: this.derniersCalendriersTrouves,
    };
  }

  private async runOnce(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.dernierPassage = new Date().toISOString();
    this.dernierResultat = 'EN_COURS';
    this.derniersCalendriersTrouves = 0;
    let connection: QueryRunner | null = null;
    let locked = false;
    try {
      connection = this.db.createQueryRunner();
      await connection.connect();
      const lock = await connection.query('SELECT pg_try_advisory_lock(2601023) AS acquired');
      locked = lock[0]?.acquired === true;
      if (!locked) {
        this.dernierResultat = 'VERROU_OCCUPE';
        this.logger.warn('EXG auto-sync: verrou PostgreSQL deja occupe');
        return;
      }
      // Ne traiter que les agendas Google effectivement créés et actifs.
      // Aucun filtre d'ID propre à la recette locale en PREPROD/PROD.
      const calendars: Array<{ id: number; project_id: number }> = await connection.query(
        `SELECT DISTINCT c.id, c.project_id
         FROM calendrier c
         LEFT JOIN calendrier_evenement ce ON ce.calendrier_id = c.id
         WHERE c.actif = true AND c.google_calendar_id IS NOT NULL
           AND (
             c.statut_synchro = 'PENDING'
             OR ce.statut_synchro IN ('PENDING','ERROR','DELETE_PENDING','SYNCING')
           )
         ORDER BY c.id LIMIT 5`,
      );
      this.derniersCalendriersTrouves = calendars.length;
      this.dernierResultat = calendars.length ? 'TRAITEMENT_TERMINE' : 'AUCUN_CALENDRIER_ELIGIBLE';
      let errors = 0;
      for (const calendar of calendars) {
        try {
          const result = await this.synchronisation.sync(Number(calendar.id), Number(calendar.project_id), false);
          if (result.erreurs || result.restants) errors++;
        }
        catch (e: any) {
          errors++;
          this.logger.warn('Automatic reconciliation for calendar #' + calendar.id +
            ' failed: ' + String(e?.message || e));
        }
      }
      if (errors) this.dernierResultat = 'ERREURS=' + errors;
      this.logger.log('EXG auto-sync: ' + this.dernierResultat +
        ' (calendriers=' + calendars.length + ', notifications=none)');
    } catch (e: any) {
      this.dernierResultat = 'ERREUR_WORKER';
      this.logger.warn('Calendar worker failed: ' + String(e?.message || e));
    } finally {
      if (locked && connection) {
        try { await connection.query('SELECT pg_advisory_unlock(2601023)'); }
        catch { /* connexion interrompue : PostgreSQL libere le verrou */ }
      }
      try { if (connection) await connection.release(); }
      catch { this.logger.warn('Unable to release calendar worker connection'); }
      this.running = false;
    }
  }
}
