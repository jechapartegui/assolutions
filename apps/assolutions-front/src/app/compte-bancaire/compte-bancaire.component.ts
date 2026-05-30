import { Component, OnInit } from '@angular/core';
import { CompteBancaire_VM } from '@shared/lib/compte-bancaire.interface';
import { CompteBancaireStore } from '../../store/compte-bancaire.store';
import { ExcelColumn, ExcelExportService } from '../../services/excel-export.service';
import { PersonneApiService } from '../../services/personne-api.service';
import { PersonneLight_VM } from '@shared/lib/personne.interface';

@Component({
  standalone: false,
  selector: 'app-compte-bancaire',
  templateUrl: './compte-bancaire.component.html',
  styleUrls: ['./compte-bancaire.component.css'],
})
export class CompteBancaireComponent implements OnInit {
  constructor(
    public store: CompteBancaireStore,
    private readonly excel: ExcelExportService,private readonly personneApi: PersonneApiService,
  ) {}

async ngOnInit(): Promise<void> {
  await this.store.init();
  await this.loadPersonnesForComptes();
}

async loadPersonnesForComptes(): Promise<void> {
  const ids = [
    ...new Set(
      this.Liste
        .map(c => c.carte_titulaire_id)
        .filter((id): id is number => !!id),
    ),
  ];

  if (!ids.length) {
    this.personnesById = {};
    return;
  }

  const personnes = await this.personneApi.list_personnelight(ids, false);
  this.personnesById = Object.fromEntries(personnes.map(p => [p.id, p]));
}



  get vm() {
    return this.store.vm();
  }

  get Liste(): CompteBancaire_VM[] {
    return this.vm.filteredList ?? [];
  }

  get Item(): CompteBancaire_VM | null {
    return this.vm.editCompteBancaire;
  }

  get loading(): boolean {
    return this.vm.loading;
  }

  get refreshing(): boolean {
    return this.vm.refreshing;
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

  get carteText(): string {
    return this.store.carteToText(this.Item?.carte);
  }
  personnesById: Record<number, PersonneLight_VM> = {};

  trackById = (_: number, item: CompteBancaire_VM) => item.id;

  refresh(): void {
    this.store.refresh();
  }

  create(): void {
    this.store.createCompte();
  }

  editCompte(compte: CompteBancaire_VM): void {
    this.store.editCompte(compte.id);
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
    this.store.saveEditedCompte();
  }

  delete(compte: CompteBancaire_VM): void {
    if (!window.confirm($localize`Voulez-vous supprimer ce compte bancaire ?`)) return;
    this.store.deleteCompte(compte.id);
  }

  updateNom(value: string): void {
    this.store.patchEditedCompte({ nom: value });
  }

  updateType(value: string): void {
    this.store.patchEditedCompte({ type: value });
  }

  updateInfo(value: string): void {
    this.store.patchEditedCompte({ info: value });
  }

  updateActif(value: boolean): void {
    this.store.patchEditedCompte({ actif: value });
  }

  updateIban(value: string): void {
    this.store.patchEditedCompte({ iban: value });
  }

async updateCarteTitulaire(value: number | null): Promise<void> {
  this.store.patchEditedCompte({
    carte_titulaire_id: value ?? undefined,
  });

  if (value && !this.personnesById[value]) {
    const personnes = await this.personneApi.list_personnelight([value], false);
    this.personnesById = {
      ...this.personnesById,
      ...Object.fromEntries(personnes.map(p => [p.id, p])),
    };
  }
}

getPersonneLabel(id?: number | null): string {
  if (!id) return '—';

  const p = this.personnesById[id];
  return  [p?.prenom, p?.nom, p?.surnom].filter(Boolean).join(' ') || `Personne #${id}`;
}

  updateCarteJson(value: string): void {
    this.store.patchEditedCompte({
      carte: this.store.textToCarte(value),
    });
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

  sortType(): void {
    this.store.sortBy('type');
  }

  sortActif(): void {
    this.store.sortBy('actif');
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
    if (!window.confirm($localize`Supprimer les comptes bancaires sélectionnés ?`)) return;
    this.store.deleteSelected();
  }

  copierSelection(): void {
    this.store.duplicateSelected();
  }

  exportExcel(): void {
    const rows = this.Liste;

    const columns: ExcelColumn<CompteBancaire_VM>[] = [
      { header: 'ID', value: c => c.id },
      { header: 'Nom', value: c => c.nom },
      { header: 'Type', value: c => c.type },
      { header: 'Actif', value: c => c.actif ? 'Oui' : 'Non' },
      { header: 'IBAN', value: c => c.iban ?? '' },
      { header: 'Info', value: c => c.info ?? '' },
      { header: 'Titulaire carte ID', value: c => c.carte_titulaire_id ?? '' },
    ];

    this.excel.export('comptes-bancaires', rows, columns);
  }
}