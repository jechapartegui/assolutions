import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { ValidationItem } from '@shared/lib/autres.interface';
import { Cours_VM, PersonneLight_VM } from '@shared/index';
import { ContratProfDataStore } from '../../data-store/contrat-prof-data.store';
import { ErrorService } from '../../services/error.service';
import { CoursPageVm } from '../../vm/cours-page.vm';
import { CoursStore } from '../../store/cours.store';

@Component({
  selector: 'app-cours-editor',
  templateUrl: './cours-editor.component.html',
  styleUrls: ['./cours-editor.component.css'],
  standalone: false,
})
export class CoursEditorComponent implements OnInit, OnChanges {
  @Input({ required: true }) vm!: CoursPageVm;
  @Input() isAdmin = false;
  @Output() back = new EventEmitter<void>();

  public saving = false;
  public currentProfId: number | null = null;
  public profDispo: any[] = [];
  public rNom: ValidationItem = { key: true, value: '' };
  public rProf: ValidationItem = {
    key: false,
    value: $localize`Un professeur responsable est nécessaire pour le cours`,
  };

  constructor(
    private readonly store: CoursStore,
    private readonly contratProfDataStore: ContratProfDataStore,
  ) {}

  get cours(): Cours_VM {
    return this.vm.editCours as Cours_VM;
  }

  ngOnInit(): void {
    this.syncViewState();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vm']) this.syncViewState();
  }

  private syncViewState(): void {
    if (!this.cours) return;
    this.cours.professeursCours ??= [];
    this.cours.groupes ??= [];
    this.majListeProf();
    this.checkall();
  }

  get lieuxDisponibles() { return this.vm?.refs?.listeLieu ?? []; }
  get groupesDisponibles() { return this.vm?.refs?.listeGroupe ?? []; }
  get joursDisponibles() { return this.vm?.refs?.liste_jour_filter ?? []; }

  async save(): Promise<void> {
    const errorService = ErrorService.instance;
    this.checkall();
    if (!this.vm.isValid || !this.cours || this.saving) return;

    const wasExisting = (this.cours.id ?? 0) > 0;
    this.saving = true;
    try {
      await this.store.saveEditedCours();
      errorService.emitChange(
        errorService.OKMessage(
          wasExisting ? $localize`Mettre à jour un cours` : $localize`Ajouter un cours`,
        ),
      );
      this.back.emit();
    } catch (err: any) {
      errorService.emitChange(
        errorService.CreateError(
          $localize`Sauvegarder le cours`,
          err?.message ?? $localize`Erreur inconnue`,
        ),
      );
    } finally {
      this.saving = false;
    }
  }

  async duplicateCours(): Promise<void> {
    if (this.saving) return;
    const confirmDuplication = window.confirm(
      `Voulez-vous dupliquer le cours ? Cela implique de sauvegarder le cours et d'en créer un nouveau exactement identique.`,
    );
    if (!confirmDuplication) return;
    await this.store.duplicateCurrentCours();
  }

  async deleteCours(): Promise<void> {
    if (!this.cours?.id || this.saving) return;
    const confirmDelete = window.confirm($localize`Voulez-vous supprimer ce cours ?`);
    if (!confirmDelete) return;
    await this.store.deleteCurrentCours();
    this.back.emit();
  }

  async modifierSerie(): Promise<void> {
    if (!this.cours?.id || this.saving) return;

    const confirmed = window.confirm(
      $localize`Voulez-vous modifier l'ensemble des séances liées à ce cours à partir de la date du jour ? Les paramètres, professeurs et groupes des séances futures seront remplacés par ceux du cours.`,
    );
    if (!confirmed) return;

    const errorService = ErrorService.instance;
    this.saving = true;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      await this.store.updateSerieCurrentCours(today);
      errorService.emitChange(
        errorService.OKMessage($localize`Application des modifications à la série`),
      );
    } catch (err: any) {
      errorService.emitChange(
        errorService.CreateError(
          $localize`Application des modifications à la série`,
          err?.message ?? $localize`Erreur inconnue`,
        ),
      );
    } finally {
      this.saving = false;
    }
  }

  async ajouterProf(): Promise<void> {
    if (!this.currentProfId) return;
    const contratId = Number(this.currentProfId);
    const prof = this.contratProfDataStore
      .profLights()
      .find((item) => Number(item.contrat_id) === contratId);
    if (!prof) return;

    const alreadySelected = (this.cours.professeursCours ?? []).some(
      (item: PersonneLight_VM) => this.getProfKey(item) === contratId,
    );
    if (alreadySelected) return;

    const selectedProf = {
      ...prof,
      id: Number(prof.id),
      contrat_id: contratId,
    } as any;

    this.cours.professeursCours.push(selectedProf);
    if (!this.cours.prof_principal_id || this.cours.prof_principal_id <= 0) {
      this.cours.prof_principal_id = contratId;
    }
    if (this.cours.id > 0) await this.store.updateCurrentCoursProfs();

    this.currentProfId = null;
    this.majListeProf();
    this.checkall();
  }

  async removeProf(item: PersonneLight_VM): Promise<void> {
    const itemId = this.getProfKey(item);
    this.cours.professeursCours = (this.cours.professeursCours ?? []).filter(
      (x: PersonneLight_VM) => this.getProfKey(x) !== itemId,
    );

    if (Number(this.cours.prof_principal_id) === itemId) {
      const next = this.cours.professeursCours?.[0] as any;
      this.cours.prof_principal_id = this.getProfKey(next);
    }
    if (this.cours.id > 0) await this.store.updateCurrentCoursProfs();

    this.majListeProf();
    this.checkall();
  }

  majListeProf(): void {
    const idsPris = new Set(
      (this.cours?.professeursCours ?? []).map((x: PersonneLight_VM) => this.getProfKey(x)),
    );
    this.profDispo = (this.vm?.refs?.listeProf ?? []).filter((x) => !idsPris.has(Number(x.key)));
  }

  checkall(): void {
    this.rNom = { key: true, value: '' };
    this.rProf = { key: true, value: '' };

    if (!this.cours?.nom) {
      this.rNom = { key: false, value: $localize`Un nom doit être saisi` };
    } else if (this.cours.nom.trim().length < 4) {
      this.rNom = { key: false, value: $localize`Le nom doit faire au moins 4 caractères` };
    }

    if (!this.cours?.prof_principal_id || this.cours.prof_principal_id <= 0) {
      this.rProf = {
        key: false,
        value: $localize`Un professeur responsable est nécessaire pour le cours`,
      };
    }
    this.vm.isValid = this.rNom.key && this.rProf.key;
  }

  onLieuChange(): void {
    const lieu = this.lieuxDisponibles.find((x: any) => x.key === this.cours.lieu_id);
    this.cours.lieu = lieu ? ({ id: lieu.key, nom: lieu.value } as any) : ({} as any);
  }

  onPlaceLimitChange(): void {
    if (!this.cours.est_place_maximum) this.cours.place_maximum = undefined;
  }

  onAgeMinLimitChange(): void {
    if (!this.cours.est_limite_age_minimum) this.cours.age_minimum = undefined;
  }

  onAgeMaxLimitChange(): void {
    if (!this.cours.est_limite_age_maximum) this.cours.age_maximum = undefined;
  }

  toggleGroupe(groupeId: number): void {
    const exists = (this.cours.groupes ?? []).some((g: any) => g.id === groupeId);
    if (exists) {
      this.cours.groupes = (this.cours.groupes ?? []).filter((g: any) => g.id !== groupeId);
      return;
    }
    const groupe = this.groupesDisponibles.find((g: any) => g.id === groupeId);
    if (groupe) this.cours.groupes = [...(this.cours.groupes ?? []), groupe as any];
  }

  hasGroupe(groupeId: number): boolean {
    return (this.cours.groupes ?? []).some((g: any) => g.id === groupeId);
  }

  getProfLabel(p: PersonneLight_VM): string {
    return `${p?.prenom ?? ''} ${p?.nom ?? ''}`.trim();
  }

  getProfKey(p: PersonneLight_VM | any): number {
    return Number(p?.contrat_id ?? p?.contratId ?? p?.id ?? 0);
  }

  getJourLabel(jour: string): string {
    switch ((jour ?? '').toLowerCase()) {
      case 'lundi': return 'Lundi';
      case 'mardi': return 'Mardi';
      case 'mercredi': return 'Mercredi';
      case 'jeudi': return 'Jeudi';
      case 'vendredi': return 'Vendredi';
      case 'samedi': return 'Samedi';
      case 'dimanche': return 'Dimanche';
      default: return jour ?? '';
    }
  }
}
