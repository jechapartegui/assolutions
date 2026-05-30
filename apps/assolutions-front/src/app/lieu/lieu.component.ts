import { Component, OnInit } from '@angular/core';
import { Lieu_VM } from '@shared/lib/lieu.interface';
import { Adresse } from '@shared/lib/adresse.interface';
import { LieuStore } from '../../store/lieu.store';
import { ExcelColumn, ExcelExportService } from '../../services/excel-export.service';

@Component({
  standalone: false,
  selector: 'app-lieu',
  templateUrl: './lieu.component.html',
  styleUrls: ['./lieu.component.css'],
})
export class LieuComponent implements OnInit {
  constructor(public store: LieuStore,private readonly excel: ExcelExportService) {}

  ngOnInit(): void {
    this.store.init();
  }

  get vm() {
    return this.store.vm();
  }

  get Liste(): Lieu_VM[] {
    return this.vm.filteredList ?? [];
  }

  get Item(): Lieu_VM | null {
    return this.vm.editLieu;
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

  trackById = (_: number, item: Lieu_VM) => item.id;

  refresh(): void {
    this.store.refresh();
  }

  create(): void {
    this.store.createLieu();
  }

  editLieu(lieu: Lieu_VM): void {
    this.store.editLieu(lieu.id);
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
    this.store.saveEditedLieu();
  }

  delete(lieu: Lieu_VM): void {
    if (!window.confirm($localize`Voulez-vous supprimer ce lieu ?`)) return;
    this.store.deleteLieu(lieu.id);
  }

  updateNom(value: string): void {
    this.store.patchEditedLieu({ nom: value });
  }

  updateAdresseField(field: 'Street' | 'PostCode' | 'City', value: string): void {
    const current = this.Item;
    if (!current) return;

    const adresse = {
      ...(current.adresse ?? {}),
      [field]: value,
    } as Adresse;

    this.store.patchEditedLieu({ adresse } as Partial<Lieu_VM>);
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
    if (!window.confirm($localize`Supprimer les lieux sélectionnés ?`)) return;
    this.store.deleteSelected();
  }

  copierSelection(): void {
    this.store.duplicateSelected();
  }

  getAdresseLabel(lieu: Lieu_VM): string {
    return this.store.formatAdresse(lieu.adresse);
  }

  exportExcel(): void {
    const rows = this.Liste;
  
  const columns: ExcelColumn<Lieu_VM>[] = [
    { header: $localize`:@@common.id:ID`, value: a => a.id },
    { header: $localize`:@@location.name:Nom`, value: a => a.nom },
   
    {
      header: $localize`:@@address.full:Adresse`,
      value: a =>
        [
          a.adresse?.Street,
          a.adresse?.PostCode,
          a.adresse?.City,
          a.adresse?.Country
        ]
        .filter(Boolean)
        .join(' ')
    },
  

  ];
  
    this.excel.export('lieux', rows, columns);
  }
}