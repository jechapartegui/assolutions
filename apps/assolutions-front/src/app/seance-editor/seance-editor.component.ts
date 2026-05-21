import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { ValidationItem } from '@shared/lib/autres.interface';
import {
  Seance_VM,
  SeanceProfesseur_VM,
} from '@shared/index';
import { ErrorService } from '../../services/error.service';
import { SeanceRepository } from '../../repository/seance.repository';
import { SeancePageVm } from '../../vm/seance-page.vm';
import { SeanceMapper } from '../../mapper/seance.mapper';
import { SeanceStore } from '../../store/seance.store';
import { AddInfoEditorComponent } from '../add-info-editor/add-info-editor.component';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

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
@ViewChild('addInfoEditor')
addInfoEditor?: AddInfoEditorComponent;

  public currentProfId: number | null = null;
  public profDispo: any[] = [];
  public rNom: ValidationItem = { key: true, value: '' };
  public rProf: ValidationItem = {
    key: false,
    value: $localize`Un encadrant est nécessaire pour le cours`,
  };

  constructor(
    private readonly repository: SeanceRepository,
    private readonly mapper: SeanceMapper,
    private readonly store: SeanceStore,
  private readonly router: Router,
  ) {}

  get seance(): Seance_VM {
    return this.vm.editSeance as Seance_VM;
  }

  ngOnInit(): void {
    this.syncViewState();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vm']) {
      this.syncViewState();
    }
  }
  
async duplicateSeance(): Promise<void> {
  const confirmDuplication = window.confirm(
    `Voulez-vous dupliquer la séance ? Cela implique de sauvegarder la séance en cours et d'en créer une nouvelle exactement identique.`
  );

  if (!confirmDuplication) return;

  await this.store.duplicateCurrentSeance();
}
  private syncViewState(): void {
    if (!this.seance) return;

    if (!this.seance.seanceProfesseurs) {
      this.seance.seanceProfesseurs = [];
    }

    if (!this.seance.groupes) {
      this.seance.groupes = [];
    }

    this.majListeProf();
    this.checkall();
  }

  get dateValue(): string {
    const raw = this.seance?.date_seance;
    if (!raw) return '';

    const d = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(d.getTime())) return '';

    const year = d.getFullYear();
    const month = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  set dateValue(value: string) {
    if (!value || !this.seance) return;
    this.seance.date_seance = new Date(`${value}T00:00:00`);
  }

  get coursDisponibles() {
    return this.vm?.refs?.listeCours ?? [];
  }

  get lieuxDisponibles() {
    return this.vm?.refs?.listeLieu ?? [];
  }

  get groupesDisponibles() {
    return this.vm?.refs?.listeGroupe ?? [];
  }

  get isTraining(): boolean {
    return this.seance?.type_seance === 'ENTRAINEMENT';
  }

async save(): Promise<void> {
  const errorService = ErrorService.instance;
  this.checkall();

  if (!this.vm.isValid || !this.seance) {
    return;
  }

  try {
    const saved = await this.store.saveEditedSeance();
if (this.addInfoEditor && saved?.id > 0) {
  this.addInfoEditor.objectId = saved.id;
  await this.addInfoEditor.save();
}
    errorService.emitChange(
      errorService.OKMessage(
        this.seance.id > 0
          ? $localize`Mettre à jour une séance`
          : $localize`Ajouter une séance`
      )
    );

    this.back.emit();
  } catch (err: any) {
    errorService.emitChange(
      errorService.CreateError(
        $localize`Sauvegarder la séance`,
        err?.message ?? $localize`Erreur inconnue`
      )
    );
  }
}

  async deleteSeance(): Promise<void> {
    if (!this.seance?.id) return;

    const confirmDelete = window.confirm($localize`Voulez-vous supprimer cette séance ?`);
    if (!confirmDelete) return;

    await this.repository.deleteSeance(this.seance.id);
    this.back.emit();
  }

  async ajouterProf(): Promise<void> {
    if (!this.currentProfId) return;

    const prof = this.vm.refs.listeProf.find((x) => x.key === this.currentProfId);
    if (!prof) return;

    const sp = new SeanceProfesseur_VM();
    sp.seance_id = this.seance.id;
    sp.statut = this.seance.statut;
    sp.minutes = this.seance.duree_seance;
    sp.personne = {
      id: prof.key,
      prenom: prof.value.split(' ')[0] ?? '',
      nom: prof.value.split(' ').slice(1).join(' ') ?? '',
    } as any;

    (sp as any).prenom = sp.personne.prenom;
    (sp as any).nom = sp.personne.nom;
    (sp as any).contrat_id = prof.key;

    this.seance.seanceProfesseurs.push(sp as any);

    if (this.seance.id > 0) {
      await this.repository.updateSeanceProfs(this.seance.id, this.seance.seanceProfesseurs as any);
    }

    this.currentProfId = null;
    this.majListeProf();
  }

  async removeProf(item: any): Promise<void> {
    this.seance.seanceProfesseurs = this.seance.seanceProfesseurs.filter(
      (x: any) => (x.personne?.id ?? x.id ?? x.contrat_id) !== (item.personne?.id ?? item.id ?? item.contrat_id)
    ) as any;

    if (this.seance.id > 0) {
      await this.repository.updateSeanceProfs(this.seance.id, this.seance.seanceProfesseurs as any);
    }

    this.majListeProf();
  }

  majListeProf(): void {
    const idsPris = new Set(
      (this.seance?.seanceProfesseurs ?? []).map((x: any) => x.personne?.id ?? x.id)
    );

    this.profDispo = (this.vm?.refs?.listeProf ?? []).filter((x) => !idsPris.has(x.key));
    this.checkall();
  }

  checkall(): void {
    this.rNom = { key: true, value: '' };
    this.rProf = { key: true, value: '' };

    if (!this.seance?.nom) {
      this.rNom = { key: false, value: $localize`Un nom doit être saisi` };
    } else if (this.seance.nom.trim().length < 4) {
      this.rNom = { key: false, value: $localize`Le nom doit faire au moins 4 caractères` };
    }

    if (!this.seance?.seanceProfesseurs?.length) {
      this.rProf = {
        key: false,
        value: $localize`Un encadrant est nécessaire pour le cours`,
      };
    }

    this.vm.isValid = this.rNom.key && this.rProf.key;
  }

  onTypeChange(): void {
    if (this.seance.type_seance !== 'ENTRAINEMENT') {
      this.seance.cours = 0 as any;
      this.seance.cours_nom = '';
    } else {
      this.syncCoursNom();
    }
    this.checkall();
  }

  onCoursChange(): void {
    this.syncCoursNom();
  }

  onLieuChange(): void {
    const lieu = this.lieuxDisponibles.find((x) => x.key === this.seance.lieu_id);
    this.seance.lieu_nom = lieu?.value ?? '';
  }

  onDureeChange(): void {
    if (!this.seance) return;
    this.seance.heure_fin = this.mapper.calculerHeureFin(
      this.seance.heure_debut,
      this.seance.duree_seance
    );
  }

  toggleGroupe(groupeId: number): void {
    const exists = (this.seance.groupes ?? []).some((g: any) => g.id === groupeId);

    if (exists) {
      this.seance.groupes = (this.seance.groupes ?? []).filter((g: any) => g.id !== groupeId);
      return;
    }

    const groupe = this.groupesDisponibles.find((g: any) => g.id === groupeId);
    if (groupe) {
      this.seance.groupes = [...(this.seance.groupes ?? []), groupe as any];
    }
  }

  hasGroupe(groupeId: number): boolean {
    return (this.seance.groupes ?? []).some((g: any) => g.id === groupeId);
  }

  getType(type: string): string {
    switch (type) {
      case 'ENTRAINEMENT':
        return $localize`Entraînement`;
      case 'SORTIE':
        return $localize`Sortie`;
      case 'MATCH':
        return $localize`Match`;
      case 'EVENEMENT':
        return $localize`Événement`;
      default:
        return '';
    }
  }

  getCoursLabel(coursId: number): string {
    return this.vm.refs.listeCours.find((x) => x.id === coursId)?.nom ?? '';
  }

  getProfLabel(p: any): string {
    return `${p?.prenom ?? p?.personne?.prenom ?? ''} ${p?.nom ?? p?.personne?.nom ?? ''}`.trim();
  }

  private syncCoursNom(): void {
    const cours = this.coursDisponibles.find((x) => x.id === this.seance.cours);
    this.seance.cours_nom = cours?.nom ?? '';
  }
  openMaSeance(): void {
  if (!this.seance?.id) return;

  this.router.navigate(['/ma-seance'], {
    queryParams: { id: this.seance.id },
  });
}

async copyWhatsappSurvey(): Promise<void> {
  if (!this.seance?.id) return;

  const message = this.buildWhatsappSurveyText();

  await navigator.clipboard.writeText(message);

  ErrorService.instance.emitChange(
    ErrorService.instance.OKMessage($localize`Sondage WhatsApp copié`)
  );
}

private buildWhatsappSurveyText(): string {
  const type = this.seance.type_seance == 'ENTRAINEMENT' ? $localize`Entraînement` : this.seance.type_seance == 'MATCH' ? $localize`Match` : this.seance.type_seance == 'SORTIE' ? $localize`Sortie` : $localize`Événement`;
  const nom = this.seance.nom ?? '';
  const date = this.formatDateFr(this.seance.date_seance);
  const heure = this.seance.heure_debut ?? '';
  const rdv = this.seance.rdv ?? '';

  return `${type} ${nom} le ${date} à ${heure} ${rdv}. Vous venez ?
Oui : ${this.buildShortLink(1)}
Non : ${this.buildShortLink(0)}`;
}

private buildShortLink(reponse: 0 | 1): string {
  const slug = this.jsonToB64Url({
    i: this.seance.id,
    r: reponse,
  });
return `${environment.frontUrl}/s/${slug}`;
}

private jsonToB64Url(value: unknown): string {
  const json = JSON.stringify(value);
  const b64 = btoa(unescape(encodeURIComponent(json)));

  return b64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

private formatDateFr(value: Date | string | null | undefined): string {
  if (!value) return '';

  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';

  return d.toLocaleDateString('fr-FR');
}
}