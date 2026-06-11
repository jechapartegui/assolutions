import { Component, OnInit } from '@angular/core';

import { ErrorService } from '../../services/error.service';
import { FinanceApiService } from '../../services/finance-api.service';
import { FluxFinancierApiService } from '../../services/flux-financiers-api.service';
import { CompteBancaireApiService } from '../../services/compte-bancaire-api.service';
import { SaisonApiService } from '../../services/saison-api.service';
import { FluxFinancier, CompteBancaire, Operation, Saison, CreateOperationDto, CreateFluxFinancierDto, ClasseComptable } from '@shared/index';
import { AppStore } from '../app.store';

type ImportStatus = 'OK' | 'DOUBLON' | 'PROCHE' | 'ERREUR';

interface ImportPreviewRow {
  selected: boolean;
  status: ImportStatus;
  message: string;
  flux_financier_id: number | null;
  date_operation: string;
  libelle_bancaire: string;
  montant: number;

  destinataire: string;
  import_key: string;

  existingOperation?: Operation;
}

@Component({
  standalone: false,
  selector: 'app-operations',
  templateUrl: './operations.component.html',
  styleUrls: ['./operations.component.css'],
})
export class OperationsComponent implements OnInit {
  loading = false;
  saving = false;
  importing = false;

  operations: Operation[] = [];
  flux: FluxFinancier[] = [];
  comptes: CompteBancaire[] = [];
  classes_comptables: ClasseComptable[] = [];
  saisons: Saison[] = [];

  selected: Operation | null = null;

  active_saison = 0;
  importCompteId: number | null = null;

  filterTexte = '';
  filterFluxId: number | null = null;
  filterStatut: 'ALL' | 'PAYE' | 'A_PAYER' = 'ALL';
  filterRattachement: 'ALL' | 'SYSTEME' | 'NORMAL' = 'ALL';

  importPreview: ImportPreviewRow[] = [];
  importResult: string | null = null;
  importError: string | null = null;

  constructor(
    private financeApi: FinanceApiService,
    private fluxApi: FluxFinancierApiService,
    private compteApi: CompteBancaireApiService,
    private saisonApi: SaisonApiService,
    private store:AppStore,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadAll();
  }

  async loadAll(): Promise<void> {
    try {
      this.loading = true;

      const [saisons, comptes, classes_comptables] = await Promise.all([
        this.saisonApi.list(),
        this.compteApi.list(),
        this.financeApi.listClasses(),
      ]);

      this.saisons = saisons ?? [];
      this.classes_comptables = classes_comptables ?? [];
      this.comptes = comptes ?? [];

      this.active_saison = this.store.saison_active_id();

      this.importCompteId = this.comptes[0]?.id ?? null;

      await this.reloadData();
    } catch (err) {
      this.showError('Chargement opérations', err);
    } finally {
      this.loading = false;
    }
  }

  async reloadData(): Promise<void> {
    const [operations, flux] = await Promise.all([
      this.financeApi.listOperations(),
      this.fluxApi.list(this.active_saison || undefined, true),
    ]);

    this.operations = operations ?? [];
    this.flux = flux ?? [];
  }

  async onSaisonChange(): Promise<void> {
    this.selected = null;
    this.importPreview = [];
    await this.reloadData();
  }

  get filteredOperations(): Operation[] {
    const txt = this.filterTexte.trim().toLowerCase();

    return this.operations.filter((op) => {
      const flux = this.getFlux(op.flux_financier_id ?? null);

      const matchTexte =
        !txt ||
        String(op.destinataire ?? '').toLowerCase().includes(txt) ||
        String(op.libelle_bancaire ?? '').toLowerCase().includes(txt) ||
        String(op.info ?? '').toLowerCase().includes(txt) ||
        String(flux?.libelle ?? '').toLowerCase().includes(txt);

      const matchFlux =
        !this.filterFluxId || op.flux_financier_id === this.filterFluxId;

      const matchStatut =
        this.filterStatut === 'ALL' ||
        (this.filterStatut === 'PAYE' && op.paiement_execute) ||
        (this.filterStatut === 'A_PAYER' && !op.paiement_execute);

      const isSysteme = !!flux?.flux_systeme;

      const matchRattachement =
        this.filterRattachement === 'ALL' ||
        (this.filterRattachement === 'SYSTEME' && isSysteme) ||
        (this.filterRattachement === 'NORMAL' && !isSysteme);

      return matchTexte && matchFlux && matchStatut && matchRattachement;
    });
  }

  get nbAClasser(): number {
    return this.operations.filter((op) => this.getFlux(op.flux_financier_id ?? null)?.flux_systeme).length;
  }

  get totalOperations(): number {
    return this.filteredOperations.reduce((sum, op) => sum + Number(op.solde ?? 0), 0);
  }

  get selectedPreviewCount(): number {
    return this.importPreview.filter((r) => r.selected).length;
  }

  newOperation(): void {
    this.selected = {
      id: 0,
      solde: 0,
      date_operation: this.today(),
      date_previsionnelle: this.today(),
      mode: 1,
      destinataire: '',
      paiement_execute: false,
      compte_bancaire_id: this.comptes[0]?.id ?? 0,
      flux_financier_id: null,
      saison_id: this.active_saison,
      libelle_bancaire: null,
      import_key: null,
      source_import: null,
      info: null,
    };
  }

  edit(op: Operation): void {
    this.selected = { ...op };
  }

  cancel(): void {
    this.selected = null;
  }

  async save(): Promise<void> {
    if (!this.selected) return;

    try {
      this.saving = true;

      const dto = this.buildOperationDto(this.selected);

      if (this.selected.id) {
        await this.financeApi.updateOperation(this.selected.id, dto);
      } else {
        await this.financeApi.createOperation(dto as CreateOperationDto);
      }

      this.selected = null;
      await this.reloadData();
    } catch (err) {
      this.showError('Sauvegarde opération', err);
    } finally {
      this.saving = false;
    }
  }

  async remove(op: Operation): Promise<void> {
    if (!confirm('Supprimer cette opération ?')) return;

    try {
      await this.financeApi.removeOperation(op.id);
      await this.reloadData();
    } catch (err) {
      this.showError('Suppression opération', err);
    }
  }

  async rattacherFlux(op: Operation, fluxId: number | null): Promise<void> {
    try {
      await this.financeApi.updateOperation(op.id, {
        flux_financier_id: fluxId,
      });

      op.flux_financier_id = fluxId;
    } catch (err) {
      this.showError('Rattachement au flux', err);
    }
  }

  async creerFluxDepuisOperation(op: Operation): Promise<void> {
    if (!this.active_saison) {
      alert('Aucune saison active sélectionnée.');
      return;
    }

    try {
      const result = await this.financeApi.createFluxFromOperation(op.id, this.active_saison);

      op.flux_financier_id = result.flux.id;

      await this.reloadData();
    } catch (err) {
      this.showError('Création flux depuis opération', err);
    }
  }

  async onCsvSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    this.importResult = null;
    this.importError = null;
    this.importPreview = [];

    try {
      if (!this.importCompteId) {
        this.importError = 'Sélectionne un compte bancaire avant import.';
        return;
      }

      if (!this.active_saison) {
        this.importError = 'Sélectionne une saison avant import.';
        return;
      }

      this.importPreview = await this.buildImportPreview(file, this.importCompteId);
      input.value = '';
    } catch (err) {
      this.importError = err instanceof Error ? err.message : String(err);
      this.showError('Prévisualisation import CSV', err);
    }
  }

  async confirmImport(): Promise<void> {
    if (!this.importCompteId || !this.active_saison) return;

    const rows = this.importPreview.filter((r) => r.selected);

    if (!rows.length) {
      this.importError = 'Aucune ligne sélectionnée.';
      return;
    }

    try {
      this.importing = true;
      this.importError = null;
      this.importResult = null;

      let imported = 0;
      let failed = 0;
      let classes_comptables6 = this.classes_comptables.find(x => x.code === '6');
      let classes_comptables7 = this.classes_comptables.find(x => x.code === '7');
      let ff_aclasser6 = this.flux.find((f) => f.classe_comptable_id === classes_comptables6?.id);
      let ff_aclasser7 = this.flux.find((f) => f.classe_comptable_id === classes_comptables7?.id);
      if(!ff_aclasser6)
       ff_aclasser6 = await this.fluxApi.create({
          libelle: 'À classer 6',
          date: new Date().toISOString(),
          destinataire: '',
          recette: false,
          classe_comptable_id: classes_comptables6?.id,
          statut: 0,  
          montant: 0,
          nb_paiement: 0,
          info: $localize`Flux système pour opérations à classer en classe 6`,
          saison_id: this.store.saison_active_id() ?? undefined,
      }as CreateFluxFinancierDto) ;
      if(!ff_aclasser7) 
        ff_aclasser7 = await this.fluxApi.create({
          libelle: 'À classer 7',
          date: new Date().toISOString(),
          destinataire: '',
          recette: true,
          classe_comptable_id: classes_comptables7?.id,
          statut: 0,
          montant: 0,
          nb_paiement: 0,
          info: $localize`Flux système pour opérations à classer en classe 7`,
          saison_id: this.store.saison_active_id() ?? undefined,
      }as CreateFluxFinancierDto) ;


      for (const row of rows) {
        try {

          if(row.montant < 0 && ff_aclasser6) {
            row.flux_financier_id = ff_aclasser6.id;
            ff_aclasser6.montant += row.montant;
            ff_aclasser6.nb_paiement += 1;
            await this.fluxApi.update(ff_aclasser6.id, ff_aclasser6);
          } else if(row.montant >= 0 && ff_aclasser7) {
            row.flux_financier_id = ff_aclasser7.id;
            ff_aclasser7.montant += row.montant;
            ff_aclasser7.nb_paiement += 1;
            await this.fluxApi.update(ff_aclasser7.id, ff_aclasser7);
          }

          await this.financeApi.createOperation({
            solde: row.montant,
            date_operation: row.date_operation,
            date_previsionnelle: row.date_operation,
            mode: 1,
            destinataire: row.destinataire,
            paiement_execute: true,
            compte_bancaire_id: this.importCompteId,
            flux_financier_id: row.flux_financier_id,
            saison_id: this.active_saison,
            libelle_bancaire: row.libelle_bancaire,
            source_import: 'CSV_BANQUE',
            import_key: row.import_key,
            info: null,
          });

          imported++;
        } catch {
          failed++;
        }
      }

      this.importResult = `${imported} opération(s) importée(s). ${failed} erreur(s).`;
      this.importPreview = [];
      await this.reloadData();
    } catch (err) {
      this.importError = err instanceof Error ? err.message : String(err);
      this.showError('Import CSV bancaire', err);
    } finally {
      this.importing = false;
    }
  }

  cancelImportPreview(): void {
    this.importPreview = [];
    this.importResult = null;
    this.importError = null;
  }

  toggleAllPreview(selected: boolean): void {
    this.importPreview.forEach((r) => {
      if (r.status !== 'DOUBLON') {
        r.selected = selected;
      }
    });
  }

  private async buildImportPreview(file: File, compteBancaireId: number): Promise<ImportPreviewRow[]> {
    const text = await file.text();
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    const headerIndex = lines.findIndex((l) =>
      this.normalizeHeader(l).includes('date;libelle;montant'),
    );

    if (headerIndex === -1) {
      throw new Error('Format CSV bancaire non reconnu. Attendu : Date;Libellé;Montant');
    }

    const rows = lines.slice(headerIndex + 1);
    const preview: ImportPreviewRow[] = [];

    for (const row of rows) {
      const cols = this.splitCsvRow(row);
      const dateFr = cols[0];
      const libelle = cols[1];
      const montantRaw = cols[2];

      if (!dateFr || !libelle || !montantRaw) continue;

      const date = this.parseDateFr(dateFr);
      const montant = this.parseMontantFr(montantRaw);
      const cleanLibelle = libelle.trim();

      const importKey = [
        compteBancaireId,
        date,
        cleanLibelle,
        montant.toFixed(2),
      ].join('|');

      const exact = this.operations.find((op) => op.import_key === importKey);

      const proche = this.operations.find((op) =>
        op.compte_bancaire_id === compteBancaireId &&
        this.toDateOnly(op.date_operation) === date &&
        Math.abs(Number(op.solde ?? 0) - montant) < 0.001,
      );

      let status: ImportStatus = 'OK';
      let message = 'Nouvelle opération';
      let selected = true;

      if (exact) {
        status = 'DOUBLON';
        message = 'Déjà importée';
        selected = false;
      } else if (proche) {
        status = 'PROCHE';
        message = 'Opération proche déjà existante';
        selected = false;
      }

      preview.push({
        selected,
        status,
        message,
        date_operation: date,
        libelle_bancaire: cleanLibelle,
        montant,
        destinataire: cleanLibelle,
        import_key: importKey,
        existingOperation: exact ?? proche,
        flux_financier_id: null,
      });
    }

    return preview;
  }

  getFlux(id: number | null): FluxFinancier | undefined {
    if (!id) return undefined;
    return this.flux.find((f) => f.id === id);
  }

  getCompte(id: number | null | undefined): CompteBancaire | undefined {
    if (!id) return undefined;
    return this.comptes.find((c) => c.id === id);
  }

  getCompteLabel(id: number | null | undefined): string {
    const c: CompteBancaire | undefined = this.getCompte(id);
    return c?.nom  || (id ? `Compte #${id}` : '');
  }

  getSaisonLabel(saison: Saison): string {
    const s: Saison = saison;
    return s.nom || `Saison #${s.id}`;
  }

  getFluxLabel(id: number | null | undefined): string {
    const f = this.getFlux(id ?? null);
    return f?.libelle ?? '';
  }

  isSystemFlux(op: Operation): boolean {
    return !!this.getFlux(op.flux_financier_id ?? null)?.flux_systeme;
  }

  formatMontant(value: number | string | null | undefined): string {
    return `${Number(value ?? 0).toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} €`;
  }

  private buildOperationDto(op: Operation): Partial<Operation> {
    return {
      solde: Number(op.solde ?? 0),
      date_operation: this.toDateOnly(op.date_operation),
      date_previsionnelle: op.date_previsionnelle
        ? this.toDateOnly(op.date_previsionnelle)
        : null,
      mode: Number(op.mode ?? 0),
      destinataire: String(op.destinataire ?? ''),
      paiement_execute: Boolean(op.paiement_execute),
      compte_bancaire_id: Number(op.compte_bancaire_id ?? 0),
      flux_financier_id: op.flux_financier_id ?? null,
      saison_id: this.active_saison,
      libelle_bancaire: op.libelle_bancaire ?? null,
      source_import: op.source_import ?? null,
      import_key: op.import_key ?? null,
      info: op.info ?? null,
    };
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private toDateOnly(value: any): string {
    if (!value) return this.today();
    if (typeof value === 'string') return value.slice(0, 10);
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value).slice(0, 10);
  }

  private parseDateFr(value: string): string {
    const [dd, mm, yyyy] = value.trim().split('/');
    return `${yyyy}-${mm}-${dd}`;
  }

  private parseMontantFr(value: string): number {
    return Number(
      value
        .replace('€', '')
        .replace(/\s/g, '')
        .replace(',', '.')
        .trim(),
    );
  }

  private normalizeHeader(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private splitCsvRow(row: string): string[] {
    return row.split(';').map((x) => x.replace(/^"|"$/g, '').trim());
  }

  private showError(action: string, err: unknown): void {
    const errorService = ErrorService.instance;
    errorService.emitChange(
      errorService.CreateError(
        action,
        err instanceof Error ? err.message : String(err),
      ),
    );
  }
}