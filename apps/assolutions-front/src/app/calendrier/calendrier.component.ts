import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AppStore } from '../app.store';
import { SeanceApiService } from '../../services/seance-api.service';
import { GroupesApiService } from '../../services/groupes-api.service';
import { LienGroupeApiService } from '../../services/lien-groupe-api.service';
import {
  CalendrierApiService, Calendrier, CalendrierPayload,
  CalendrierPreview, CalendrierSyncResult,
} from '../../services/calendrier-api.service';
import { Seance } from '@shared/lib/seance.interface';
import { Groupe } from '@shared/lib/groupes.interface';

type SessionRow = Seance & { noms_groupes: string; reserve: number | null };

@Component({
  selector: 'app-calendrier',
  templateUrl: './calendrier.component.html',
  styleUrls: ['./calendrier.component.css'],
  standalone: false,
})
export class CalendrierComponent implements OnInit {
  loading = false;
  saving = false;
  syncing = false;
  error = '';
  info = '';
  isEditing = false;
  selectedId: number | null = null;
  calendars: Calendrier[] = [];
  groupes: Groupe[] = [];
  sessions: SessionRow[] = [];
  sessionFilter = '';
  groupFilter = '';
  previewData: CalendrierPreview | null = null;
  syncResult: CalendrierSyncResult | null = null;
  showRsvps = false;
  rsvps: Array<any> = [];
  form: CalendrierPayload = this.emptyForm();

  constructor(
    public readonly store: AppStore,
    private readonly api: CalendrierApiService,
    private readonly sessionsApi: SeanceApiService,
    private readonly groupesApi: GroupesApiService,
    private readonly liensApi: LienGroupeApiService,
    private readonly router: Router,
  ) {}

  get isAdmin() { return this.store.isAdmin(); }
  get saisonId() {
    return Number(this.store.saison_consultation_id() ?? this.store.saison_active_id() ?? 0);
  }
  get filteredSessions() {
    const q = this.sessionFilter.trim().toLocaleLowerCase('fr');
    return this.sessions.filter((s) =>
      (!s.reserve || s.reserve === this.selectedId) &&
      (!q || [s.label, s.type_seance, s.noms_groupes, s.date_seance]
        .some((value) => String(value ?? '').toLocaleLowerCase('fr').includes(q))));
  }
  get filteredGroups() {
    const q = this.groupFilter.trim().toLocaleLowerCase('fr');
    return this.groupes.filter((g) => !q || g.nom.toLocaleLowerCase('fr').includes(q));
  }
  get current() { return this.calendars.find((c) => c.id === this.selectedId) ?? null; }
  get selectedCount() { return this.form.seance_ids.length; }

  private emptyForm(): CalendrierPayload {
    return {
      nom: '', description: null, timezone: 'Europe/Paris',
      notifier_mises_a_jour: false, groupe_ids: [], seance_ids: [],
    };
  }

  async ngOnInit() { await this.reload(); }

  async reload(keepId: number | null = this.selectedId) {
    this.loading = true;
    this.error = '';
    try {
      const saisonId = this.saisonId;
      if (!saisonId) throw new Error('Aucune saison sélectionnée.');
      const [calendars, groups, sessions] = await Promise.all([
        this.api.list(saisonId), this.groupesApi.list(saisonId), this.sessionsApi.list(saisonId),
      ]);
      this.calendars = calendars;
      this.groupes = groups;
      const ids = sessions.map((s) => Number(s.seance_id ?? s.id)).filter((n) => n > 0);
      const linked = ids.length ? await this.liensApi.listGroupesBySeanceId(ids) : {};
      const gById = new Map(groups.map((g) => [Number(g.id), g.nom]));
      this.sessions = sessions.map((s) => ({
        ...s,
        reserve: s.calendrier_id ?? null,
        noms_groupes: ((linked as Record<number, number[]>)[Number(s.seance_id ?? s.id)] ?? [])
          .map((g) => gById.get(Number(g))).filter(Boolean).join(', '),
      })).sort((a, b) =>
        (String(a.date_seance) + a.heure_debut).localeCompare(String(b.date_seance) + b.heure_debut));
      if (keepId != null && calendars.some((c) => Number(c.id) === Number(keepId))) {
        await this.edit(keepId);
      } else this.newCalendar();
    } catch (e: any) {
      this.error = String(e?.message || e || 'Impossible de charger les calendriers');
    } finally { this.loading = false; }
  }

  newCalendar() {
    this.selectedId = null;
    this.isEditing = true;
    this.form = this.emptyForm();
    this.previewData = null;
    this.syncResult = null;
    this.rsvps = [];
  }

  async edit(id: number) {
    this.error = '';
    this.selectedId = Number(id);
    this.isEditing = true;
    this.previewData = null;
    this.syncResult = null;
    try {
      const selected = await this.api.get(id);
      this.form = {
        nom: selected.nom, description: selected.description,
        timezone: selected.timezone || 'Europe/Paris',
        notifier_mises_a_jour: !!selected.notifier_mises_a_jour,
        groupe_ids: (selected.groupe_ids || []).map(Number),
        seance_ids: (selected.seance_ids || []).map(Number),
      };
    } catch (e: any) { this.error = String(e?.message || e); }
  }

  hasGroup(id: number) { return this.form.groupe_ids.includes(id); }
  hasSession(id: number) { return this.form.seance_ids.includes(id); }
  groupToggle(id: number) {
    this.form.groupe_ids = this.hasGroup(id)
      ? this.form.groupe_ids.filter((value) => value !== id)
      : [...this.form.groupe_ids, id];
  }
  sessionToggle(id: number) {
    this.form.seance_ids = this.hasSession(id)
      ? this.form.seance_ids.filter((value) => value !== id)
      : [...this.form.seance_ids, id];
  }

  async save() {
    if (!this.isAdmin || this.saving) return;
    if (!this.form.nom.trim()) { this.error = 'Le nom du calendrier est obligatoire.'; return; }
    this.saving = true;
    this.error = '';
    this.info = '';
    try {
      const dto = { ...this.form, saison_id: this.saisonId };
      const result = this.selectedId
        ? await this.api.update(this.selectedId, dto)
        : await this.api.create(dto);
      this.selectedId = result.id;
      this.info = 'Calendrier enregistré sur Assolutions.';
      await this.reload(result.id);
      this.info = 'Calendrier enregistré localement. Synchronisation Google non lancée.';
      if (window.confirm(
        'Souhaites-tu maintenant synchroniser ce calendrier vers Google Agenda ?\n' +
        'Cela peut générer de nombreux e-mails Google.'
      )) await this.synchroniser();
    } catch (e: any) { this.error = String(e?.message || e); }
    finally { this.saving = false; }
  }

  async synchroniser() {
    if (!this.isAdmin || !this.selectedId || this.syncing) return;
    this.error = ''; this.info = ''; this.syncResult = null;
    try {
      this.previewData = await this.api.preview(this.selectedId);
      const p = this.previewData;
      if (!window.confirm(
        `Synchroniser ${p.nb_seances} séance(s) avec Google, pour ${p.nb_comptes} compte(s) ?\n\n` +
        'Même avec les notifications désactivées, Google peut envoyer certains e-mails.'
      )) return;
      const notificationsAllowed = !!this.form.notifier_mises_a_jour;
      const notify = notificationsAllowed && window.confirm(
        'ENVOI DES NOTIFICATIONS : demandes-tu explicitement à Google de prévenir les invités ?\n\n' +
        'Annuler = synchroniser SANS demander les notifications (mode prudent).'
      );
      if (notify && !window.confirm(
        'Confirmation finale : tu vas demander à Google d’envoyer des invitations / mises à jour aux invités. Continuer ?'
      )) return;
      this.syncing = true;
      const result = await this.api.sync(this.selectedId, notify);
      this.syncResult = result;
      this.info = `Synchronisation : ${result.succes} réussite(s), ${result.erreurs} erreur(s), ${result.restants} restante(s).`;
      await this.reload(this.selectedId);
      this.syncResult = result;
      this.info = `Synchronisation : ${result.succes} réussite(s), ${result.erreurs} erreur(s), ${result.restants} restante(s).`;
    } catch (e: any) { this.error = String(e?.message || e); }
    finally { this.syncing = false; }
  }

  async archive() {
    if (!this.isAdmin || !this.selectedId) return;
    if (!window.confirm(
      'Archiver ce calendrier dans Assolutions ? Les événements déjà présents sur Google restent à traiter séparément.'
    )) return;
    try {
      await this.api.archive(this.selectedId);
      this.info = 'Calendrier archivé.';
      await this.reload(null);
    } catch (e: any) { this.error = String(e?.message || e); }
  }

  async showResponses() {
    if (!this.isAdmin || !this.selectedId) return;
    this.error = ''; this.rsvps = [];
    try {
      const result = await this.api.responses(this.selectedId);
      this.showRsvps = true;
      this.rsvps = result.lignes || [];
    } catch (e: any) { this.error = String(e?.message || e); }
  }

  openSession(id: number) {
    this.router.navigate(['/seance'], { queryParams: { id } });
  }

  groupNames(calendar: Calendrier) {
    const byId = new Map(this.groupes.map((g) => [Number(g.id), g.nom]));
    return (calendar.groupe_ids || []).map((id) => byId.get(Number(id))).filter(Boolean).join(', ') || 'Aucun groupe';
  }
}
