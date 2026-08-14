import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ValidationItem } from '@shared/lib/autres.interface';
import { SeanceProfesseur_VM, Seance_VM } from '@shared/index';

import { ContratProfDataStore } from '../../data-store/contrat-prof-data.store';
import { environment } from '../../environments/environment';
import { SeanceMapper } from '../../mapper/seance.mapper';
import { SeanceRepository } from '../../repository/seance.repository';
import { ErrorService } from '../../services/error.service';
import { SeanceStore } from '../../store/seance.store';
import { SeancePageVm } from '../../vm/seance-page.vm';
import { AddInfoEditorComponent } from '../add-info-editor/add-info-editor.component';

@Component({
  selector: 'app-seance-editor',
  templateUrl: './seance-editor.component.html',
  styleUrls: ['./seance-editor.component.css'],
  standalone: false,
})
export class SeanceEditorComponent implements OnInit, OnChanges {
  @Input({ required: true }) vm!: SeancePageVm;
  @Input() isAdmin = false;
  @Output() back = new EventEmitter<void>();
  @ViewChild('addInfoEditor') addInfoEditor?: AddInfoEditorComponent;

  saving = false;
  currentProfId: number | null = null;
  profDispo: any[] = [];
  serieDateDebut = '';
  serieDateFin = '';
  rNom: ValidationItem = { key: true, value: '' };
  rProf: ValidationItem = { key: false, value: $localize`Un encadrant est nécessaire pour le cours` };

  constructor(
    private readonly repository: SeanceRepository,
    private readonly mapper: SeanceMapper,
    private readonly store: SeanceStore,
    private readonly router: Router,
    private readonly contratProfDataStore: ContratProfDataStore,
  ) {}

  get seance(): Seance_VM {
    return this.vm.editSeance as Seance_VM;
  }

  ngOnInit(): void {
    this.syncViewState();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vm']) this.syncViewState();
  }

  private syncViewState(): void {
    if (!this.seance) return;
    this.seance.seanceProfesseurs ??= [];
    this.seance.groupes ??= [];

    if (this.vm.editModeSerie) {
      this.serieDateDebut ||= this.toDateInput(this.vm.activeSaison?.date_debut ?? this.seance.date_seance);
      this.serieDateFin ||= this.toDateInput(this.vm.activeSaison?.date_fin);
      if (this.serieDateDebut) this.seance.date_seance = new Date(`${this.serieDateDebut}T00:00:00`);
    }

    this.majListeProf();
    this.checkall();
  }

  get dateValue(): string {
    return this.toDateInput(this.seance?.date_seance);
  }

  set dateValue(value: string) {
    if (value && this.seance) this.seance.date_seance = new Date(`${value}T00:00:00`);
  }

  get coursDisponibles() { return this.vm?.refs?.listeCours ?? []; }
  get lieuxDisponibles() { return this.vm?.refs?.listeLieu ?? []; }
  get groupesDisponibles() { return this.vm?.refs?.listeGroupe ?? []; }
  get isTraining(): boolean { return this.seance?.type_seance === 'ENTRAINEMENT'; }

  async save(): Promise<void> {
    const errors = ErrorService.instance;
    this.checkall();
    if (!this.vm.isValid || !this.seance || this.saving) return;

    this.saving = true;
    try {
      if (this.vm.editModeSerie && this.seance.id === 0) {
        const saisonId = await this.saveSerie();

        // Le refresh global masque/détruit l'éditeur. On ferme donc l'éditeur
        // AVANT de rafraîchir, sinon la série est créée mais l'écran se rouvre.
        this.store.closeEditor();
        errors.emitChange(errors.OKMessage($localize`Créer une série de séances`));
        this.back.emit();

        if (saisonId) await this.store.refreshNow(saisonId);
        return;
      }

      const wasExisting = this.seance.id > 0;
      const saved = await this.store.saveEditedSeance();
      if (this.addInfoEditor && saved?.id > 0) {
        this.addInfoEditor.objectId = saved.id;
        await this.addInfoEditor.save();
      }
      errors.emitChange(
        errors.OKMessage(wasExisting ? $localize`Mettre à jour une séance` : $localize`Ajouter une séance`),
      );
      this.store.closeEditor();
      this.back.emit();
    } catch (error: unknown) {
      errors.emitChange(errors.CreateError($localize`Sauvegarder la séance`, error));
    } finally {
      this.saving = false;
    }
  }

  private async saveSerie(): Promise<number> {
    if (!this.serieDateDebut || !this.serieDateFin) {
      throw new Error('Les dates de début et de fin de la série sont obligatoires.');
    }
    if (this.serieDateDebut > this.serieDateFin) {
      throw new Error('La date de début doit précéder la date de fin.');
    }

    const cours = this.coursDisponibles.find((item: any) => Number(item.id) === Number(this.seance.cours));
    const jour = cours?.jour_semaine || this.dayName(this.serieDateDebut);
    const ids = await this.repository.createSerie(
      this.seance,
      new Date(`${this.serieDateDebut}T00:00:00`),
      new Date(`${this.serieDateFin}T00:00:00`),
      jour,
    );

    const groupeIds = (this.seance.groupes ?? [])
      .map((g: any) => Number(g.id ?? g.groupe_id))
      .filter((id) => id > 0);

    for (const id of ids) {
      await Promise.all([
        this.repository.updateSeanceProfs(id, this.seance.seanceProfesseurs ?? []),
        this.repository.updateSeanceGroupes(id, groupeIds),
      ]);
    }

    return Number(this.seance.saison_id || this.vm.activeSaison?.id || 0);
  }

  async duplicateSeance(): Promise<void> {
    if (this.saving) return;
    if (!window.confirm('Voulez-vous dupliquer la séance ? La séance courante sera sauvegardée.')) return;
    await this.store.duplicateCurrentSeance();
  }

  async deleteSeance(): Promise<void> {
    if (this.saving || !this.seance?.id || !window.confirm($localize`Voulez-vous supprimer cette séance ?`)) return;
    await this.repository.deleteSeance(this.seance.id);
    this.store.closeEditor();
    this.back.emit();
  }

  async ajouterProf(): Promise<void> {
    if (!this.currentProfId) return;
    const prof = this.vm.refs.listeProf.find((item) => Number(item.key) === Number(this.currentProfId));
    if (!prof) return;

    this.seance.seanceProfesseurs.push(this.profFromReference(Number(prof.key), prof.value) as any);
    if (this.seance.id > 0) {
      await this.repository.updateSeanceProfs(this.seance.id, this.seance.seanceProfesseurs as any);
    }
    this.currentProfId = null;
    this.majListeProf();
  }

  async removeProf(item: any): Promise<void> {
    const selectedId = this.profKey(item);
    this.seance.seanceProfesseurs = this.seance.seanceProfesseurs.filter(
      (candidate: any) => this.profKey(candidate) !== selectedId,
    ) as any;
    if (this.seance.id > 0) {
      await this.repository.updateSeanceProfs(this.seance.id, this.seance.seanceProfesseurs as any);
    }
    this.majListeProf();
  }

  majListeProf(): void {
    const idsPris = new Set(
      (this.seance?.seanceProfesseurs ?? []).map((item: any) => this.profKey(item)),
    );
    this.profDispo = (this.vm?.refs?.listeProf ?? []).filter((item) => !idsPris.has(Number(item.key)));
    this.checkall();
  }

  checkall(): void {
    this.rNom = { key: true, value: '' };
    this.rProf = { key: true, value: '' };
    if (!this.seance?.nom) this.rNom = { key: false, value: $localize`Un nom doit être saisi` };
    else if (this.seance.nom.trim().length < 4) this.rNom = { key: false, value: $localize`Le nom doit faire au moins 4 caractères` };
    if (!this.seance?.seanceProfesseurs?.length) {
      this.rProf = { key: false, value: $localize`Un encadrant est nécessaire pour le cours` };
    }
    const datesOk = !this.vm.editModeSerie || (!!this.serieDateDebut && !!this.serieDateFin && this.serieDateDebut <= this.serieDateFin);
    this.vm.isValid = this.rNom.key && this.rProf.key && datesOk;
  }

  onTypeChange(): void {
    if (this.seance.type_seance !== 'ENTRAINEMENT') {
      this.seance.cours = 0 as any;
      this.seance.cours_nom = '';
    } else this.syncCoursNom();
    this.checkall();
  }

  onCoursChange(): void {
    const cours: any = this.coursDisponibles.find((item: any) => Number(item.id) === Number(this.seance.cours));
    if (!cours) {
      this.syncCoursNom();
      return;
    }

    this.seance.nom = cours.nom ?? this.seance.nom;
    this.seance.cours_nom = cours.nom ?? '';
    this.seance.heure_debut = cours.heure ?? this.seance.heure_debut;
    this.seance.duree_seance = Number(cours.duree ?? this.seance.duree_seance);
    this.seance.lieu_id = Number(cours.lieu_id ?? 0);
    this.seance.lieu_nom = cours.lieu?.nom ?? this.lieuxDisponibles.find((l) => l.key === this.seance.lieu_id)?.value ?? '';
    this.seance.rdv = cours.rdv ?? cours.appointment ?? '';
    this.seance.essai_possible = !!cours.essai_possible;
    this.seance.convocation_nominative = !!cours.convocation_nominative;
    this.seance.afficher_present = !!cours.afficher_present;
    this.seance.age_minimum = cours.age_minimum ?? null;
    this.seance.age_maximum = cours.age_maximum ?? null;
    this.seance.place_maximum = cours.place_maximum ?? null;
    this.seance.est_limite_age_minimum = cours.age_minimum != null;
    this.seance.est_limite_age_maximum = cours.age_maximum != null;
    this.seance.est_place_maximum = cours.place_maximum != null;
    this.seance.groupes = [...(cours.groupes ?? [])];
    this.seance.seanceProfesseurs = (cours.professeursCours ?? []).map((prof: any) =>
      this.profFromReference(
        Number(prof.contrat_id ?? prof.contratId ?? prof.id),
        `${prof.prenom ?? ''} ${prof.nom ?? ''}`.trim(),
      ),
    ) as any;
    this.onDureeChange();
    this.majListeProf();
  }

  onLieuChange(): void {
    const lieu = this.lieuxDisponibles.find((item) => item.key === this.seance.lieu_id);
    this.seance.lieu_nom = lieu?.value ?? '';
  }

  onDureeChange(): void {
    this.seance.heure_fin = this.mapper.calculerHeureFin(this.seance.heure_debut, this.seance.duree_seance);
  }

  toggleGroupe(groupeId: number): void {
    const exists = (this.seance.groupes ?? []).some((g: any) => g.id === groupeId);
    if (exists) this.seance.groupes = this.seance.groupes.filter((g: any) => g.id !== groupeId);
    else {
      const groupe = this.groupesDisponibles.find((g: any) => g.id === groupeId);
      if (groupe) this.seance.groupes = [...this.seance.groupes, groupe as any];
    }
  }

  hasGroupe(groupeId: number): boolean {
    return (this.seance.groupes ?? []).some((g: any) => g.id === groupeId);
  }

  getType(type: string): string {
    return type === 'ENTRAINEMENT' ? $localize`Entraînement` : type === 'SORTIE' ? $localize`Sortie` : type === 'MATCH' ? $localize`Match` : type === 'EVENEMENT' ? $localize`Événement` : '';
  }

  getCoursLabel(coursId: number): string {
    return this.vm.refs.listeCours.find((item) => item.id === coursId)?.nom ?? '';
  }

  getProfLabel(prof: any): string {
    return `${prof?.prenom ?? prof?.personne?.prenom ?? ''} ${prof?.nom ?? prof?.personne?.nom ?? ''}`.trim();
  }

  private profKey(prof: any): number {
    return Number(prof?.contrat_id ?? prof?.contratId ?? prof?.personne?.id ?? prof?.id ?? 0);
  }

  private syncCoursNom(): void {
    const cours = this.coursDisponibles.find((item) => item.id === this.seance.cours);
    this.seance.cours_nom = cours?.nom ?? '';
  }

  private profFromReference(contratId: number, label: string): SeanceProfesseur_VM {
    const prof = this.contratProfDataStore
      .profLights()
      .find((item) => Number(item.contrat_id) === Number(contratId));
    const [fallbackPrenom = '', ...fallbackNomParts] = label.split(' ');
    const prenom = prof?.prenom ?? fallbackPrenom;
    const nom = prof?.nom ?? fallbackNomParts.join(' ');
    const personneId = Number(prof?.id ?? 0);

    const result = new SeanceProfesseur_VM();
    result.seance_id = this.seance.id;
    result.statut = this.seance.statut;
    result.minutes = this.seance.duree_seance;
    result.personne = { id: personneId, prenom, nom } as any;
    (result as any).prenom = prenom;
    (result as any).nom = nom;
    (result as any).contrat_id = Number(contratId);
    return result;
  }

  openMaSeance(): void {
    if (this.seance?.id) this.router.navigate(['/ma-seance'], { queryParams: { id: this.seance.id } });
  }

  async copyWhatsappSurvey(): Promise<void> {
    if (!this.seance?.id) return;
    await navigator.clipboard.writeText(this.buildWhatsappSurveyText());
    ErrorService.instance.emitChange(ErrorService.instance.OKMessage($localize`Sondage WhatsApp copié`));
  }

  private buildWhatsappSurveyText(): string {
    const type = this.getType(this.seance.type_seance);
    return `${type} ${this.seance.nom ?? ''} le ${this.formatDateFr(this.seance.date_seance)} à ${this.seance.heure_debut ?? ''} ${this.seance.rdv ?? ''}. Vous venez ?\nOui : ${this.buildShortLink(1)}\nNon : ${this.buildShortLink(0)}`;
  }

  private buildShortLink(reponse: 0 | 1): string {
    const slug = this.jsonToB64Url({ i: this.seance.id, r: reponse });
    return `${environment.frontUrl}/s/${slug}`;
  }

  private jsonToB64Url(value: unknown): string {
    return btoa(unescape(encodeURIComponent(JSON.stringify(value))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  private formatDateFr(value: Date | string | null | undefined): string {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('fr-FR');
  }

  private toDateInput(value: Date | string | null | undefined): string {
    if (!value) return '';
    if (typeof value === 'string') return value.slice(0, 10);
    return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
  }

  private dayName(value: string): string {
    const date = new Date(`${value}T12:00:00`);
    return ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][date.getDay()];
  }
}
