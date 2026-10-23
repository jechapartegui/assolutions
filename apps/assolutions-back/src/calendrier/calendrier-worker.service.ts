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

  constructor(
    private readonly db: DataSource,
    private readonly synchronisation: CalendrierSyncService,
    private readonly google: GoogleCalendrierClient,
  ) {}

  onModuleInit(): void {
    if (!this.google.enabled || process.env.GOOGLE_CALENDAR_AUTO_SYNC !== 'true') return;
    this.timer = setInterval(() => { void this.runOnce(); }, 60_000);
    this.timer.unref?.();
    this.logger.log('Calendrier outbox worker active (Google notifications disabled)');
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async runOnce(): Promise<void> {
    if (this.running) return;
    this.running = true;
    let connection: QueryRunner | null = null;
    let locked = false;
    try {
      connection = this.db.createQueryRunner();
      await connection.connect();
      const lock = await connection.query('SELECT pg_try_advisory_lock(2601023) AS acquired');
      locked = lock[0]?.acquired === true;
      if (!locked) return;
      // EXG-17 : un calendrier doit d'abord etre cree explicitement dans Google.
      // En LOCAL, limiter facultativement le worker a un ou plusieurs IDs pour
      // ne pas traiter les autres calendriers en attente pendant la recette.
      const rawIds = String(process.env.GOOGLE_CALENDAR_AUTO_SYNC_CALENDAR_IDS ?? '').trim();
      const allowedIds = rawIds
        ? [...new Set(rawIds.split(',').map((v) => Number(v.trim()))
            .filter((id) => Number.isSafeInteger(id) && id > 0))]
        : [];
      if (rawIds && (!allowedIds.length || allowedIds.length !== rawIds.split(',').length)) {
        this.logger.warn('Invalid GOOGLE_CALENDAR_AUTO_SYNC_CALENDAR_IDS; skipping automatic run');
        return;
      }
      const calendars: Array<{ id: number; project_id: number }> = await connection.query(
        `SELECT DISTINCT c.id, c.project_id
         FROM calendrier c
         LEFT JOIN calendrier_evenement ce ON ce.calendrier_id = c.id
         WHERE c.actif = true AND c.google_calendar_id IS NOT NULL
           AND (
             c.statut_synchro = 'PENDING'
             OR ce.statut_synchro IN ('PENDING','ERROR','DELETE_PENDING','SYNCING')
           )
           AND ($1::int[] IS NULL OR c.id = ANY($1::int[]))
         ORDER BY c.id LIMIT 5`,
        [rawIds ? allowedIds : null],
      );
      for (const calendar of calendars) {
        try { await this.synchronisation.sync(Number(calendar.id), Number(calendar.project_id), false); }
        catch (e: any) {
          this.logger.warn('Automatic reconciliation for calendar #' + calendar.id +
            ' failed: ' + String(e?.message || e));
        }
      }
    } catch (e: any) {
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
