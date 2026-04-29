import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Seance_VM } from '@shared/index';
import { SeancePageVm } from '../../vm/seance-page.vm';
import { SeanceStore } from '../../store/seance.store';
import { SeanceMapper } from '../../mapper/seance.mapper';

@Component({
  selector: 'app-seance-list',
  templateUrl: './seance-list.component.html',
  styleUrls: ['./seance-list.component.css'],
  standalone: false,
})
export class SeanceListComponent {
  @Input({ required: true }) vm!: SeancePageVm;
@Input() isAdmin = false;
  @Output() openSeance = new EventEmitter<number>();
  @Output() createSeance = new EventEmitter<boolean>();

  constructor(
    public readonly store: SeanceStore,
    private readonly mapper: SeanceMapper,
  ) {}
isSelected(id: number): boolean {
  return (this.vm.selectedIds ?? []).includes(id);
}

toggleSelection(id: number): void {
  this.store.toggleSelectedSeance(id);
}

toggleMultiSelectMode(): void {
  this.store.toggleMultiSelectMode();
}

async deleteSelection(): Promise<void> {
  const count = this.vm.selectedIds?.length ?? 0;
  if (!count) return;

  const confirmDelete = window.confirm(
    count === 1
      ? 'Voulez-vous supprimer la séance sélectionnée ?'
      : `Voulez-vous supprimer les ${count} séances sélectionnées ?`
  );

  if (!confirmDelete) return;

  await this.store.deleteSelectedSeances();
}
  sort(type: 'nom' | 'date' | 'cours' | 'lieu'): void {
    const nextSens =
      this.vm.selectedSort === type && this.vm.selectedSortSens === 'ASC'
        ? 'DESC'
        : 'ASC';

    this.store.applySort(type, nextSens);
  }

  open(item: Seance_VM): void {
    this.openSeance.emit(item.id);
  }

  getFilteredSeances(): Seance_VM[] {
    return (this.vm.list ?? []).filter((seance) => {
      return (
        (!this.vm.filter.filter_nom ||
          (seance.nom ?? '').toLowerCase().includes(this.vm.filter.filter_nom.toLowerCase())) &&
        (!this.vm.filter.filter_lieu ||
          (seance.lieu_nom ?? '').toLowerCase().includes(this.vm.filter.filter_lieu.toLowerCase())) &&
        (!this.vm.filter.filter_date_avant ||
          new Date(seance.date_seance) <= new Date(this.vm.filter.filter_date_avant)) &&
        (!this.vm.filter.filter_date_apres ||
          new Date(seance.date_seance) >= new Date(this.vm.filter.filter_date_apres)) &&
        (!this.vm.filter.filter_statut || seance.statut === this.vm.filter.filter_statut) &&
        (!this.vm.filter.filter_groupe ||
          (seance.groupes ?? []).some((x: any) =>
            (x.nom ?? '').toLowerCase().includes(this.vm.filter.filter_groupe!.toLowerCase())
          )) &&
        (!this.vm.filter.filter_prof ||
          (seance.seanceProfesseurs ?? []).some((x: any) =>
            `${x.prenom ?? x.personne?.prenom ?? ''} ${x.nom ?? x.personne?.nom ?? ''}`
              .toLowerCase()
              .includes(this.vm.filter.filter_prof!.toLowerCase())
          ))
      );
    });
  }

  calculerHeureFin(heureDebut: string, duree: number): string {
    return this.mapper.calculerHeureFin(heureDebut, duree);
  }

  clearFilters(): void {
    this.vm.filter.reset();
  }

  getTypeLabel(seance: Seance_VM): string {
    if (seance.cours_nom) return seance.cours_nom;

    switch (seance.type_seance) {
      case 'ENTRAINEMENT':
        return 'Cours';
      case 'SORTIE':
        return 'Sortie';
      case 'MATCH':
        return 'Match';
      case 'EVENEMENT':
        return 'Événement';
      default:
        return seance.type_seance ?? '';
    }
  }

  getProfesseursLabel(seance: Seance_VM): string {
    const profs = (seance.seanceProfesseurs ?? []).map((x: any) =>
      `${x.prenom ?? x.personne?.prenom ?? ''} ${x.nom ?? x.personne?.nom ?? ''}`.trim()
    ).filter(Boolean);

    return profs.join(', ');
  }

  getGroupesLabel(seance: Seance_VM): string {
    return (seance.groupes ?? []).map((g: any) => g.nom).filter(Boolean).join(', ');
  }

  getStatutClass(seance: Seance_VM): string {
    switch (seance.statut) {
      case 'prévue':
        return 'is-info is-light';
      case 'réalisée':
        return 'is-success is-light';
      case 'annulée':
        return 'is-danger is-light';
      default:
        return 'is-light';
    }
  }
}