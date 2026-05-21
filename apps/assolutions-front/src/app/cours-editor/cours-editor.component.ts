import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { ValidationItem } from '@shared/lib/autres.interface';
import { Cours_VM, PersonneLight_VM } from '@shared/index';
import { ErrorService } from '../../services/error.service';
import { CoursRepository } from '../../repository/cours.repository';
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

  public currentProfId: number | null = null;
  public profDispo: any[] = [];
  public rNom: ValidationItem = { key: true, value: '' };
  public rProf: ValidationItem = {
    key: false,
    value: $localize`Un professeur responsable est nécessaire pour le cours`,
  };

  constructor(private readonly repository: CoursRepository, private readonly store: CoursStore) {}

  get cours(): Cours_VM {
    return this.vm.editCours as Cours_VM;
  }

  ngOnInit(): void {
    this.syncViewState();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vm']) {
      this.syncViewState();
    }
  }

  private syncViewState(): void {
    if (!this.cours) return;

    if (!this.cours.professeursCours) {
      this.cours.professeursCours = [];
    }

    if (!this.cours.groupes) {
      this.cours.groupes = [];
    }

    this.majListeProf();
    this.checkall();
  }

  get lieuxDisponibles() {
    return this.vm?.refs?.listeLieu ?? [];
  }

  get groupesDisponibles() {
    return this.vm?.refs?.listeGroupe ?? [];
  }

  get joursDisponibles() {
    return this.vm?.refs?.liste_jour_filter ?? [];
  }

async save(): Promise<void> {
  const errorService = ErrorService.instance;
  this.checkall();

  if (!this.vm.isValid || !this.cours) {
    return;
  }

  try {
    await this.store.saveEditedCours();

    errorService.emitChange(
      errorService.OKMessage(
        this.cours.id > 0
          ? $localize`Mettre à jour un cours`
          : $localize`Ajouter un cours`
      )
    );

    this.back.emit();
  } catch (err: any) {
    errorService.emitChange(
      errorService.CreateError(
        $localize`Sauvegarder le cours`,
        err?.message ?? $localize`Erreur inconnue`
      )
    );
  }
}
  async duplicateCours(): Promise<void> {
  const confirmDuplication = window.confirm(
    `Voulez-vous dupliquer le cours ? Cela implique de sauvegarder le cours et d'en créer un nouveau exactement identique.`
  );

  if (!confirmDuplication) return;

  await this.store.duplicateCurrentCours();
}

  async deleteCours(): Promise<void> {
    if (!this.cours?.id) return;

    const confirmDelete = window.confirm($localize`Voulez-vous supprimer ce cours ?`);
    if (!confirmDelete) return;

    await this.repository.deleteCours(this.cours.id);
    this.back.emit();
  }

  async modifierSerie(): Promise<void> {
  if (!this.cours?.id) return;

  const errorService = ErrorService.instance;

  try {
    await this.repository.updateCours(this.cours);
    await this.repository.updateSerieCours(this.cours, new Date());

    errorService.emitChange(
      errorService.OKMessage($localize`Application des modifications à la série`)
    );
  } catch (err: any) {
    errorService.emitChange(
      errorService.CreateError(
        $localize`Application des modifications à la série`,
        err?.message ?? $localize`Erreur inconnue`
      )
    );
  }
}

  async ajouterProf(): Promise<void> {
    if (!this.currentProfId) return;

    const prof = (this.vm.refs.listeProf ?? []).find((x) => x.key === this.currentProfId);
    if (!prof) return;

    const person: PersonneLight_VM = {
      id: prof.key,
      prenom: prof.value.split(' ')[0] ?? '',
      nom: prof.value.split(' ').slice(1).join(' ') ?? '',
    } as PersonneLight_VM;

    this.cours.professeursCours.push(person);

    if (!this.cours.prof_principal_id || this.cours.prof_principal_id <= 0) {
      this.cours.prof_principal_id = person.id;
    }

    if (this.cours.id > 0) {
      await this.repository.updateCoursProfs(this.cours.id, this.cours.professeursCours);
    }

    this.currentProfId = null;
    this.majListeProf();
    this.checkall();
  }

  async removeProf(item: PersonneLight_VM): Promise<void> {
    this.cours.professeursCours = (this.cours.professeursCours ?? []).filter(
      (x: PersonneLight_VM) => x.id !== item.id
    );

    if (this.cours.prof_principal_id === item.id) {
      this.cours.prof_principal_id = this.cours.professeursCours?.[0]?.id ?? 0;
    }

    if (this.cours.id > 0) {
      await this.repository.updateCoursProfs(this.cours.id, this.cours.professeursCours);
    }

    this.majListeProf();
    this.checkall();
  }

  majListeProf(): void {
    const idsPris = new Set((this.cours?.professeursCours ?? []).map((x: PersonneLight_VM) => x.id));

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

  toggleGroupe(groupeId: number): void {
    const exists = (this.cours.groupes ?? []).some((g: any) => g.id === groupeId);

    if (exists) {
      this.cours.groupes = (this.cours.groupes ?? []).filter((g: any) => g.id !== groupeId);
      return;
    }

    const groupe = this.groupesDisponibles.find((g: any) => g.id === groupeId);
    if (groupe) {
      this.cours.groupes = [...(this.cours.groupes ?? []), groupe as any];
    }
  }

  hasGroupe(groupeId: number): boolean {
    return (this.cours.groupes ?? []).some((g: any) => g.id === groupeId);
  }

  getProfLabel(p: PersonneLight_VM): string {
    return `${p?.prenom ?? ''} ${p?.nom ?? ''}`.trim();
  }

  getJourLabel(jour: string): string {
    switch ((jour ?? '').toLowerCase()) {
      case 'lundi':
        return 'Lundi';
      case 'mardi':
        return 'Mardi';
      case 'mercredi':
        return 'Mercredi';
      case 'jeudi':
        return 'Jeudi';
      case 'vendredi':
        return 'Vendredi';
      case 'samedi':
        return 'Samedi';
      case 'dimanche':
        return 'Dimanche';
      default:
        return jour ?? '';
    }
  }
}