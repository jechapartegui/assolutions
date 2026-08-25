import { Component, OnInit } from '@angular/core';
import { SaisonStore } from '../../store/saison.store';
import { Saison_VM } from '../../vm/saison-page.vm';
import { ExcelColumn, ExcelExportService } from '../../services/excel-export.service';

@Component({
  standalone: false,
  selector: 'app-saison',
  templateUrl: './saison.component.html',
  styleUrls: ['./saison.component.css'],
})
export class SaisonComponent implements OnInit {
  constructor(
    public store: SaisonStore,
    private readonly excel: ExcelExportService,
  ) {}

  ngOnInit(): void {
    this.store.init();
  }

  get vm() {
    return this.store.vm();
  }

  get Liste(): Saison_VM[] {
    return this.vm.filteredList ?? [];
  }

  get Item(): Saison_VM | null {
    return this.vm.editSaison;
  }

  get loading(): boolean {
    return this.vm.loading;
  }

  get refreshing(): boolean {
    return this.vm.refreshing;
  }

  get readonly(): boolean {
    return this.vm.readonly;
  }

  get edit(): boolean {
    return !this.vm.readonly;
  }

  get hasSelection(): boolean {
    return (this.vm.selectedIds?.length ?? 0) > 0;
  }

  get canSave(): boolean {
    return !!this.Item && this.vm.isValid;
  }

  get availablePreviousSaisons(): Saison_VM[] {
    return this.store.getAvailablePreviousSaisons(this.Item?.id ?? 0);
  }

  trackById = (_: number, item: Saison_VM) => item.id;

  refresh(): void {
    this.store.refresh();
  }

  create(): void {
    this.store.createSaison();
  }

  editSaison(saison: Saison_VM): void {
    this.store.editSaison(saison.id);
  }

  retour(): void {
    this.store.cancelEdit();
  }

  cancel(): void {
    this.store.cancelEdit();
  }

  setEditMode(): void {
    this.store.setEditMode(true);
  }

  save(): void {
    if (!this.canSave) return;
    this.store.saveEditedSaison();
  }

  delete(saison: Saison_VM): void {
    if (saison.active) {
      window.alert($localize`Impossible de supprimer la saison active.`);
      return;
    }

    if (!window.confirm($localize`Voulez-vous supprimer cette saison ?`)) return;
    this.store.deleteSaison(saison.id);
  }

  setActive(saison: Saison_VM): void {
    if (saison.active) return;

    if (!window.confirm($localize`Définir cette saison comme saison active ?`)) return;
    this.store.setActiveSaison(saison.id);
  }

  updateNom(value: string): void {
    this.store.patchEditedSaison({ nom: value });
  }

  updateDateDebut(value: string): void {
    this.store.patchEditedSaison({ date_debut: value });
  }

  updateDateFin(value: string): void {
    this.store.patchEditedSaison({ date_fin: value });
  }

  updateSaisonPrecedente(value: string | number | null): void {
    const id = value === null || value === '' ? undefined : Number(value);
    this.store.patchEditedSaison({
      saison_precedente: Number.isFinite(id) && id > 0 ? id : undefined,
    });
  }

  updateTarifAvantGroupes(value: boolean): void {
    this.store.patchEditedSaison({ tarif_avant_groupes: !!value });
  }

  filter(value: string): void {
    this.store.setFilterNom(value);
  }

  clearFilter(): void {
    this.store.clearFilter();
  }

  sortNom(): void {
    this.store.sortBy('nom');
  }

  sortDateDebut(): void {
    this.store.sortBy('date_debut');
  }

  toggleSelection(id: number, checked: boolean): void {
    this.store.toggleSelection(id, checked);
  }

  toggleSelectAll(checked: boolean): void {
    this.store.toggleSelectAll(checked);
  }

  isSelected(id: number): boolean {
    return this.store.isSelected(id);
  }

  clearSelection(): void {
    this.store.clearSelection();
  }

  supprimerSelection(): void {
    if (!window.confirm($localize`Supprimer les saisons sélectionnées ?`)) return;
    this.store.deleteSelected();
  }

  copierSelection(): void {
    this.store.duplicateSelected();
  }

  previousLabel(saison: Saison_VM | null | undefined): string {
    return this.store.getPreviousLabel(saison);
  }

  exportExcel(): void {
    const rows = this.Liste;

    const columns: ExcelColumn<Saison_VM>[] = [
      { header: $localize`:@@common.id:ID`, value: s => s.id },
      { header: $localize`:@@season.name:Nom`, value: s => s.nom },
      { header: $localize`:@@season.active:Active`, value: s => s.active ? 'Oui' : 'Non' },
      { header: $localize`:@@season.start:Date début`, value: s => s.date_debut },
      { header: $localize`:@@season.end:Date fin`, value: s => s.date_fin },
      { header: $localize`:@@season.previous:Saison précédente`, value: s => this.previousLabel(s) },
      {
        header: $localize`Tarif avant groupes`,
        value: s => s.tarif_avant_groupes ? 'Oui' : 'Non',
      },
    ];

    this.excel.export('saisons', rows, columns);
  }
}
