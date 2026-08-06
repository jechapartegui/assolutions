import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router } from '@angular/router';
import { Seance_VM } from '@shared/index';
import { SeancePageVm } from '../../vm/seance-page.vm';
import { SeanceStore } from '../../store/seance.store';
import { SeanceMapper } from '../../mapper/seance.mapper';
import { ExcelExportService, ExcelColumn } from 'apps/assolutions-front/src/services/excel-export.service';

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
    private readonly excel: ExcelExportService,
    private readonly router: Router,
  ) {}

  isSelected(id: number): boolean {
    return (this.vm.selectedIds ?? []).includes(id);
  }

  toggleSelection(id: number): void {
    this.store.toggleSelectedSeance(id);
  }

  exportExcel(): void {
    const rows = this.vm.list ?? [];
    const columns: ExcelColumn<Seance_VM>[] = [
      { header: $localize`:@@common.id:ID`, value: s => s.id },
      { header: $localize`:@@session.name:Séance`, value: s => s.nom },
      { header: $localize`:@@course.name:Cours`, value: s => s.cours_nom ?? '' },
      { header: $localize`:@@session.type:Type`, value: s => s.type_seance },
      { header: $localize`:@@session.date:Date`, value: s => this.dateOnly(s.date_seance) },
      { header: $localize`:@@session.start:Heure début`, value: s => s.heure_debut },
      { header: $localize`:@@session.end:Heure fin`, value: s => s.heure_fin },
      { header: $localize`:@@course.duration:Durée`, value: s => s.duree_seance },
      { header: $localize`:@@place.name:Lieu`, value: s => s.lieu_nom ?? '' },
      { header: $localize`:@@group.list:Groupes`, value: s => (s.groupes ?? []).map(g => g.nom).join(', ') },
      {
        header: $localize`:@@teacher.list:Professeurs`,
        value: s => (s.seanceProfesseurs ?? [])
          .map(p => `${p.prenom ?? ''} ${p.nom ?? ''}`.trim())
          .join(', '),
      },
      { header: $localize`:@@session.status:Statut`, value: s => s.statut },
      { header: $localize`:@@member.minAge:Âge minimum`, value: s => s.age_minimum },
      { header: $localize`:@@member.maxAge:Âge maximum`, value: s => s.age_maximum },
      { header: $localize`:@@place.maximum:Places maximum`, value: s => s.place_maximum },
      { header: $localize`:@@trial.allowed:Essai possible`, value: s => s.essai_possible },
      { header: $localize`:@@trial.maximum:Nb essais`, value: s => s.nb_essai_possible },
      { header: $localize`:@@meeting.point:RDV`, value: s => s.rdv },
      { header: $localize`:@@session.info:Informations`, value: s => s.info_seance },
      { header: $localize`:@@attendance.display:Afficher présents`, value: s => s.afficher_present },
      { header: $localize`:@@convocation.nominative:Convocation nominative`, value: s => s.convocation_nominative },
    ];
    this.excel.export('seances', rows, columns);
  }

  private dateOnly(value: Date | string | null | undefined): string {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return '';
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
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
        : `Voulez-vous supprimer les ${count} séances sélectionnées ?`,
    );
    if (!confirmDelete) return;
    await this.store.deleteSelectedSeances();
  }

  sort(type: 'nom' | 'date' | 'cours' | 'lieu'): void {
    const nextSens = this.vm.selectedSort === type && this.vm.selectedSortSens === 'ASC' ? 'DESC' : 'ASC';
    this.store.applySort(type, nextSens);
  }

  open(item: Seance_VM): void {
    this.openSeance.emit(item.id);
  }

  openAttendance(item: Seance_VM, event?: Event): void {
    event?.stopPropagation();
    void this.router.navigate(['/ma-seance'], {
      queryParams: { id: item.id, vue: 'presents' },
    });
  }

  getFilteredSeances(): Seance_VM[] {
    return (this.vm.list ?? []).filter((seance) =>
      (!this.vm.filter.filter_nom || (seance.nom ?? '').toLowerCase().includes(this.vm.filter.filter_nom.toLowerCase())) &&
      (!this.vm.filter.filter_lieu || (seance.lieu_nom ?? '').toLowerCase().includes(this.vm.filter.filter_lieu.toLowerCase())) &&
      (!this.vm.filter.filter_date_avant || new Date(seance.date_seance) <= new Date(this.vm.filter.filter_date_avant)) &&
      (!this.vm.filter.filter_date_apres || new Date(seance.date_seance) >= new Date(this.vm.filter.filter_date_apres)) &&
      (!this.vm.filter.filter_statut || seance.statut === this.vm.filter.filter_statut) &&
      (!this.vm.filter.filter_groupe || (seance.groupes ?? []).some((x: any) =>
        (x.nom ?? '').toLowerCase().includes(this.vm.filter.filter_groupe!.toLowerCase()))) &&
      (!this.vm.filter.filter_prof || (seance.seanceProfesseurs ?? []).some((x: any) =>
        `${x.prenom ?? x.personne?.prenom ?? ''} ${x.nom ?? x.personne?.nom ?? ''}`
          .toLowerCase()
          .includes(this.vm.filter.filter_prof!.toLowerCase()))),
    );
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
      case 'ENTRAINEMENT': return 'Cours';
      case 'SORTIE': return 'Sortie';
      case 'MATCH': return 'Match';
      case 'EVENEMENT': return 'Événement';
      default: return seance.type_seance ?? '';
    }
  }

  getProfesseursLabel(seance: Seance_VM): string {
    return (seance.seanceProfesseurs ?? [])
      .map((x: any) => `${x.prenom ?? x.personne?.prenom ?? ''} ${x.nom ?? x.personne?.nom ?? ''}`.trim())
      .filter(Boolean)
      .join(', ');
  }

  getGroupesLabel(seance: Seance_VM): string {
    return (seance.groupes ?? []).map((g: any) => g.nom).filter(Boolean).join(', ');
  }

  getStatutClass(seance: Seance_VM): string {
    switch (seance.statut) {
      case 'prévue': return 'is-info is-light';
      case 'réalisée': return 'is-success is-light';
      case 'annulée': return 'is-danger is-light';
      default: return 'is-light';
    }
  }
}
