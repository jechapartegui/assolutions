import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AppStore } from '../app.store';
import { SeanceApiService } from '../../services/seance-api.service';
import { GroupesApiService } from '../../services/groupes-api.service';
import { LienGroupeApiService } from '../../services/lien-groupe-api.service';
import {
  CalendrierApiService, Calendrier, CalendrierPayload,
  CalendrierPreview, CalendrierSyncResult, CalendrierWorkerEtat,
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
  checkingGoogle = false;
  checkingWorker = false;
  workerEtat: CalendrierWorkerEtat | null = null;
  error = '';
  info = '';
  isEditing = false;
  selectedId: number | null = null;
  calendars: Calendrier[] = [];
  groupes: Groupe[] = [];
  sessions: SessionRow[] = [];
  // Filtres independants pour les seances disponibles uniquement.
  sessionDateFilter = '';
  sessionNameFilter = '';
  sessionTypeFilter = '';
  // EXG-27 : par defaut, ne proposer que les seances futures non annulees.
  hidePastSessions = true;
  hideCancelledSessions = true;
  selectedGroupId: number | null = null;
  previewData: CalendrierPreview | null = null;
  syncResult: CalendrierSyncResult | null = null;
  showRsvps = false;
  rsvps: Array<any> = [];
  rsvpFilter: 'actions' | 'all' | 'synced' = 'actions';
  importingRsvps = false;
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
  get canEdit() { return this.isAdmin || (this.store.isProf() && !!this.selectedId); }
  typeLabel(type: string): string {
    const labels: Record<string, string> = {
      ENTRAINEMENT: $localize`Entraînement`,
      MATCH: $localize`Match`,
      SORTIE: $localize`Sortie`,
      EVENEMENT: $localize`Événement`,
    };
    return labels[type] ?? type;
  }
  private todayIso(): string {
    const d = new Date();
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')].join('-');
  }
  private matchesVisibleSession(s: SessionRow): boolean {
    if (this.hidePastSessions && String(s.date_seance ?? '').slice(0, 10) < this.todayIso()) return false;
    if (this.hideCancelledSessions &&
      String(s.statut ?? '').trim().toLocaleLowerCase('fr') === 'annulée') return false;
    return true;
  }
  get saisonId() {
    return Number(this.store.saison_consultation_id() ?? this.store.saison_active_id() ?? 0);
  }
  /** Tableau recapitulatif, independant des filtres des seances a ajouter. */
  get selectedSessions(): SessionRow[] {
    return this.sessions.filter((s) => this.hasSession(Number(s.seance_id ?? s.id)));
  }
  get availableSessions(): SessionRow[] {
    const nom = this.sessionNameFilter.trim().toLocaleLowerCase('fr');
    return this.sessions.filter((s) => {
      const id = Number(s.seance_id ?? s.id);
      if (this.hasSession(id) || (s.reserve && s.reserve !== this.selectedId)) return false;
      if (!this.matchesVisibleSession(s)) return false;
      if (this.sessionDateFilter && String(s.date_seance ?? '').slice(0, 10) !== this.sessionDateFilter) return false;
      if (nom && !String(s.label ?? '').toLocaleLowerCase('fr').includes(nom)) return false;
      if (this.sessionTypeFilter && s.type_seance !== this.sessionTypeFilter) return false;
      return true;
    });
  }
  get sessionTypes(): string[] {
    return [...new Set(this.sessions.map((s) => s.type_seance).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'fr'));
  }
  get selectedGroups(): Groupe[] {
    return this.groupes.filter((g) => this.hasGroup(g.id))
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  }
  get availableGroups(): Groupe[] {
    return this.groupes.filter((g) => !this.hasGroup(g.id))
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  }
  resetSessionFilters() {
    this.sessionDateFilter = '';
    this.sessionNameFilter = '';
    this.sessionTypeFilter = '';
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
    this.workerEtat = null;
    this.form = this.emptyForm();
    this.selectedGroupId = null;
    this.resetSessionFilters();
    this.previewData = null;
    this.syncResult = null;
    this.rsvps = [];
  }

  async edit(id: number) {
    this.error = '';
    this.selectedId = Number(id);
    this.isEditing = true;
    this.workerEtat = null;
    this.selectedGroupId = null;
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
  addGroup() {
    if (!this.canEdit) return;
    const id = Number(this.selectedGroupId);
    if (!id || this.hasGroup(id) || !this.groupes.some((g) => Number(g.id) === id)) return;
    this.form.groupe_ids = [...this.form.groupe_ids, id];
    this.selectedGroupId = null;
  }
  removeGroup(id: number) {
    if (!this.canEdit) return;
    this.form.groupe_ids = this.form.groupe_ids.filter((value) => value !== id);
  }
  sessionToggle(id: number) {
    if (!this.canEdit) return;
    this.form.seance_ids = this.hasSession(id)
      ? this.form.seance_ids.filter((value) => value !== id)
      : [...this.form.seance_ids, id];
  }

  async save() {
    if (!this.canEdit || this.saving) return;
    if (!this.form.nom.trim()) { this.error = 'Le nom du calendrier est obligatoire.'; return; }
    this.saving = true;
    this.error = '';
    this.info = '';
    try {
      // L'API creation exige saison_id, mais l'API modification le refuse.
      // La saison d'un calendrier existant reste inchangeable.
      const { nom, description, timezone, notifier_mises_a_jour, groupe_ids, seance_ids } = this.form;
      const dto = { nom, description, timezone, notifier_mises_a_jour, groupe_ids, seance_ids };
      const result = this.selectedId
        ? await this.api.update(this.selectedId, dto)
        : await this.api.create({ ...dto, saison_id: this.saisonId });
      this.selectedId = result.id;
      this.info = 'Calendrier enregistré sur Assolutions.';
      await this.reload(result.id);
      this.info = 'Calendrier enregistré localement. Synchronisation Google non lancée.';
      if (this.isAdmin && window.confirm(
        'Souhaites-tu maintenant synchroniser ce calendrier vers Google Agenda ?\n' +
        'Cela peut générer de nombreux e-mails Google.'
      )) await this.synchroniser();
      if (!this.isAdmin) this.info =
        'Modifications enregistrées. La synchronisation Google sera effectuée par un administrateur ou par le service automatique si activé.';
    } catch (e: any) { this.error = String(e?.message || e); }
    finally { this.saving = false; }
  }

  async verifierConnexionGoogle() {
    if (!this.isAdmin || this.checkingGoogle) return;
    this.checkingGoogle = true;
    this.error = '';
    this.info = '';
    try {
      const resultat = await this.api.googleStatus();
      this.info = resultat.proprietaire_verifie
        ? 'Connexion Google validee : ' + resultat.compte + '. Aucun agenda ou evenement cree.'
        : 'Google non actif. Configuration presente : ' +
          (resultat.credentials_present ? 'oui' : 'non') +
          '. Aucun agenda ou evenement cree.';
    } catch (e: any) {
      this.error = 'Verification Google : ' + String(e?.message || e);
    } finally {
      this.checkingGoogle = false;
    }
  }

  async verifierWorker() {
    if (!this.isAdmin || !this.selectedId || this.checkingWorker) return;
    this.checkingWorker = true;
    this.error = '';
    try {
      this.workerEtat = await this.api.workerStatus(this.selectedId);
    } catch (e: any) {
      this.error = 'Diagnostic auto-sync : ' + String(e?.message || e);
    } finally {
      this.checkingWorker = false;
    }
  }

  async synchroniser() {
    if (!this.isAdmin || !this.selectedId || this.syncing) return;
    this.error = ''; this.info = ''; this.syncResult = null;
    try {
      this.previewData = await this.api.preview(this.selectedId);
      const p = this.previewData;
      if (!window.confirm(
        `Synchroniser ${p.nb_seances} séance(s) avec Google, pour ${p.nb_comptes} compte(s) ?\n\n` +
        (p.nb_evenements_a_supprimer
          ? `Attention : ${p.nb_evenements_a_supprimer} événement(s) seront SUPPRIMÉS du calendrier Google.\n\n`
          : '') +
        'Même avec les notifications désactivées, Google peut envoyer certains e-mails.'
      )) return;
      if ((p.nb_evenements_a_supprimer ?? 0) > 0 && !window.confirm(
        `Confirmer la suppression de ${p.nb_evenements_a_supprimer} événement(s) sur Google ?\n` +
        'Les séances restent conservées dans Assolutions et peuvent être réassociées.'
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

  statutReponseGoogle(statut: string): string {
    const labels: Record<string, string> = {
      accepted: 'Accepté',
      declined: 'Refusé',
      tentative: 'Peut-être',
      needsAction: 'En attente de réponse',
    };
    return labels[statut] ?? 'Inconnu';
  }

  reponseDejaAJour(row: any, p: any): boolean {
    const attendu = row.google_reponse === 'accepted' ? 'présent'
      : row.google_reponse === 'declined' ? 'absent' : null;
    return !!attendu && p?.origine === 'inscription' && p.statut_inscription === attendu;
  }

  candidatsAImporter(row: any): any[] {
    return (row.personnes_details || []).filter((p: any) => !this.reponseDejaAJour(row, p));
  }

  dejaAJour(row: any): boolean {
    return !!row.peut_importer && !!row.personnes_details?.length
      && this.candidatsAImporter(row).length === 0;
  }

  actionRequise(row: any): boolean {
    return !!row.peut_importer && !this.dejaAJour(row);
  }

  get rsvpGroups(): Array<{ id: number; rows: any[]; actions: number }> {
    const grouped = new Map<number, any[]>();
    for (const row of this.rsvps) {
      const id = Number(row.seance_id);
      if (!grouped.has(id)) grouped.set(id, []);
      grouped.get(id)!.push(row);
    }
    return [...grouped.entries()].map(([id, rows]) => ({
      id, rows: rows.filter((r) =>
        this.rsvpFilter === 'all' ||
        (this.rsvpFilter === 'actions' ? this.actionRequise(r)
          : this.dejaAJour(r))),
      actions: rows.filter((r) => this.actionRequise(r)).length,
    })).filter((group) => group.rows.length > 0);
  }

  get rsvpActionsCount(): number {
    return this.rsvps.filter((r) => this.actionRequise(r)).length;
  }

  get rsvpSyncedCount(): number {
    return this.rsvps.filter((r) => this.dejaAJour(r)).length;
  }

  get rsvpSelectedCount(): number {
    return this.rsvps.filter((r) => this.actionRequise(r) &&
      this.candidatsAImporter(r).some((p) => Number(p.id) === Number(r.personne_choisie))).length;
  }

  statutImportGoogle(row: any): string {
    if (this.dejaAJour(row)) return 'Déjà à jour dans Assolutions';
    if (row.peut_importer) return 'Sélection manuelle';
    if (!['accepted', 'declined'].includes(row.google_reponse)) return 'En attente de réponse';
    if ((row.comptes || []).length !== 1) return 'Compte non reconnu ou ambigu';
    return 'Aucune personne éligible sur la séance';
  }

  async showResponses() {
    if (!this.isAdmin || !this.selectedId) return;
    this.error = ''; this.rsvps = [];
    try {
      const result = await this.api.responses(this.selectedId);
      this.showRsvps = true;
      this.rsvpFilter = 'actions';
      this.rsvps = (result.lignes || []).map((row: any) => ({
        ...row, personne_choisie: null,
      }));
    } catch (e: any) { this.error = String(e?.message || e); }
  }

  async importerReponses() {
    if (!this.isAdmin || !this.selectedId) return;
    if (this.importingRsvps) return;
    const selected = this.rsvps.filter((x) =>
      this.actionRequise(x) && x.personne_choisie &&
      this.candidatsAImporter(x).some((p) => Number(p.id) === Number(x.personne_choisie)));
    if (!selected.length) {
      this.error = 'Sélectionne au moins une personne dans les réponses Google.';
      return;
    }
    const creation = selected.filter((x) =>
      x.personnes_details?.some((p: any) =>
        Number(p.id) === Number(x.personne_choisie) && p.origine === 'groupe_seance'
      )).length;
    if (!window.confirm(
      `Importer ${selected.length} réponse(s) Google dans Assolutions ?\n` +
      (creation ? `Pour ${creation} personne(s) issue(s) d'un groupe de séance, une inscription explicite à la séance sera créée.\n` : '') +
      'Seules les personnes choisies seront modifiées. La présence réellement constatée reste inchangée.'
    )) return;
    this.importingRsvps = true;
    try {
      const response = await this.api.importerReponses(this.selectedId,
        selected.map((x) => ({
          seance_id: Number(x.seance_id),
          personne_id: Number(x.personne_choisie),
          google_email: String(x.google_email),
          google_reponse: x.google_reponse as 'accepted' | 'declined',
        })));
      this.error = '';
      this.info = `${response.importees} réponse(s) importée(s). La présence effective reste inchangée.`;
      await this.showResponses();
    } catch (e: any) { this.error = String(e?.message || e); }
    finally { this.importingRsvps = false; }
  }

  openSession(id: number) {
    this.router.navigate(['/seance'], { queryParams: { id } });
  }

  groupNames(calendar: Calendrier) {
    const byId = new Map(this.groupes.map((g) => [Number(g.id), g.nom]));
    return (calendar.groupe_ids || []).map((id) => byId.get(Number(id))).filter(Boolean).join(', ') || 'Aucun groupe';
  }
}
