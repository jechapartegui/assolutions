import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Cours_VM } from '@shared/index';
import { CoursPageVm } from '../../vm/cours-page.vm';
import { CoursStore } from '../../store/cours.store';
import { ExcelExportService, ExcelColumn } from 'apps/assolutions-front/src/services/excel-export.service';

@Component({
  selector: 'app-cours-list',
  templateUrl: './cours-list.component.html',
  styleUrls: ['./cours-list.component.css'],
  standalone: false,
})
export class CoursListComponent {
  @Input({ required: true }) vm!: CoursPageVm;
@Input() isAdmin = false;
  @Output() openCours = new EventEmitter<number>();
  @Output() createCours = new EventEmitter<void>();

  constructor(public readonly store: CoursStore, private readonly excel: ExcelExportService) {}
isSelected(id: number): boolean {
  return (this.vm.selectedIds ?? []).includes(id);
}

toggleSelection(id: number): void {
  this.store.toggleSelectedCours(id);
}

toggleMultiSelectMode(): void {
  this.store.toggleMultiSelectMode();
}
exportExcel(): void {
  const rows = this.vm.list ?? [];

  const columns: ExcelColumn<Cours_VM>[] = [
    {
      header: $localize`:@@common.id:ID`,
      value: c => c.id
    },

    {
      header: $localize`:@@course.name:Cours`,
      value: c => c.nom
    },

    {
      header: $localize`:@@course.day:Jour`,
      value: c => c.jour_semaine
    },

    {
      header: $localize`:@@common.time:Heure`,
      value: c => c.heure
    },

    {
      header: $localize`:@@course.duration:Durée`,
      value: c => c.duree
    },

    {
      header: $localize`:@@place.name:Lieu`,
      value: c => c.lieu?.nom ?? ''
    },

    {
      header: $localize`:@@group.list:Groupes`,
      value: c => (c.groupes ?? []).map(g => g.nom).join(', ')
    },

    {
      header: $localize`:@@teacher.list:Professeurs`,
      value: c => (c.professeursCours ?? [])
        .map(p => `${p.prenom ?? ''} ${p.nom ?? ''}`.trim())
        .join(', ')
    },

    {
      header: $localize`:@@course.season:Saison`,
      value: c =>
        this.vm.refs?.listeSaison?.find(s => s.id === c.saison_id)?.nom ?? ''
    },

    {
      header: $localize`:@@member.minAge:Âge minimum`,
      value: c => c.age_minimum
    },

    {
      header: $localize`:@@member.maxAge:Âge maximum`,
      value: c => c.age_maximum
    },

    {
      header: $localize`:@@place.maximum:Places maximum`,
      value: c => c.place_maximum
    },

    {
      header: $localize`:@@trial.allowed:Essai possible`,
      value: c => c.essai_possible
    },

    {
      header: $localize`:@@meeting.point:RDV`,
      value: c => c.rdv
    },

    {
      header: $localize`:@@attendance.display:Afficher présents`,
      value: c => c.afficher_present
    },

    {
      header: $localize`:@@convocation.nominative:Convocation nominative`,
      value: c => c.convocation_nominative
    },
  ];

  this.excel.export('cours', rows, columns);
}

async deleteSelection(): Promise<void> {
  const count = this.vm.selectedIds?.length ?? 0;
  if (!count) return;

  const confirmDelete = window.confirm(
    count === 1
      ? 'Voulez-vous supprimer le cours sélectionné ?'
      : `Voulez-vous supprimer les ${count} cours sélectionnés ?`
  );

  if (!confirmDelete) return;

  await this.store.deleteSelectedCours();
}
  sort(type: 'nom' | 'jour' | 'lieu'): void {
    const nextSens =
      this.vm.selectedSort === type && this.vm.selectedSortSens === 'ASC'
        ? 'DESC'
        : 'ASC';

    this.store.applySort(type, nextSens);
  }

  open(item: Cours_VM): void {
    this.openCours.emit(item.id);
  }

  clearFilters(): void {
    this.vm.filter.reset();
  }

  getFilteredCours(): Cours_VM[] {
    return (this.vm.list ?? []).filter((cours) => {
      return (
        (!this.vm.filter.filter_nom ||
          (cours.nom ?? '').toLowerCase().includes(this.vm.filter.filter_nom.toLowerCase())) &&
        (!this.vm.filter.filter_jour ||
          (cours.jour_semaine ?? '').toLowerCase() === this.vm.filter.filter_jour.toLowerCase()) &&
        (!this.vm.filter.filter_lieu || cours.lieu_id === this.vm.filter.filter_lieu) &&
        (!this.vm.filter.filter_prof || cours.prof_principal_id === this.vm.filter.filter_prof) &&
        (!this.vm.filter.filter_groupe ||
          (cours.groupes ?? []).some((g: any) =>
            (g.nom ?? '').toLowerCase().includes(this.vm.filter.filter_groupe!.toLowerCase())
          ))
      );
    });
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

  getProfesseurLabel(cours: Cours_VM): string {
    const prof = (this.vm.refs.listeProf ?? []).find((x) => x.key === cours.prof_principal_id);
    return prof?.value ?? '';
  }

  getLieuLabel(cours: Cours_VM): string {
    if (cours.lieu?.nom) return cours.lieu.nom;
    return (this.vm.refs.listeLieu ?? []).find((x) => x.key === cours.lieu_id)?.value ?? '';
  }

  getGroupesLabel(cours: Cours_VM): string {
    return (cours.groupes ?? []).map((g: any) => g.nom).filter(Boolean).join(', ');
  }
}