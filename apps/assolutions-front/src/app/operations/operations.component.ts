import { Component, OnInit } from '@angular/core';

import { ErrorService } from '../../services/error.service';
import { FinanceApiService } from '../../services/finance-api.service';
import { FluxFinancierApiService } from '../../services/flux-financiers-api.service';
import { CompteBancaireApiService } from '../../services/compte-bancaire-api.service';
import { SaisonApiService } from '../../services/saison-api.service';
import { AddInfoApiService } from '../../services/addinfo-api.service';
import { DocumentApiService } from '../../services/document-api.service';
import {
  FluxFinancier,
  CompteBancaire,
  Operation,
  Saison,
  CreateOperationDto,
  CreateFluxFinancierDto,
  ClasseComptable,
  UpdateOperationDto,
  AddInfo,
} from '@shared/index';
import { CreateDocumentDto, Document, UpdateDocumentDto } from '@shared/lib/document.interface';
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

interface LovItem {
  id: number;
  categorie?: string;
  libelle: string;
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

  documentsOperation: Document[] = [];
  recentDocuments: Document[] = [];
  typedocLov: LovItem[] = [];
  newDocumentType = 'Facture';
  newDocumentTitle = '';
  newDocumentComment = '';
  newDocumentFile: File | null = null;
  selectedExistingDocumentId: number | null = null;

  createFluxClasseId: number | null = null;
  createFluxLibelle = '';

  constructor(
    private financeApi: FinanceApiService,
    private fluxApi: FluxFinancierApiService,
    private compteApi: CompteBancaireApiService,
    private saisonApi: SaisonApiService,
    private addInfoApi: AddInfoApiService,
    private documentApi: DocumentApiService,
    private store: AppStore,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadAll();
  }

  async loadAll(): Promise<void> {
    try {
      this.loading = true;

      const [saisons, comptes, classesComptables, typedocLov] = await Promise.all([
        this.saisonApi.list(),
        this.compteApi.list(),
        this.financeApi.listClasses(),
        this.loadLov('TYPEDOC'),
      ]);

      this.saisons = saisons ?? [];
      this.classes_comptables = classesComptables ?? [];
      this.comptes = comptes ?? [];
      this.typedocLov = typedocLov ?? [];
      this.newDocumentType = this.typedocLov[0]?.libelle ?? 'Facture';

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
    const [operations, flux, recentDocuments] = await Promise.all([
      this.financeApi.listOperations(),
      this.fluxApi.list(this.active_saison || undefined, true),
      this.documentApi.listRecent(50),
    ]);

    this.operations = operations ?? [];
    this.flux = flux ?? [];
    this.recentDocuments = recentDocuments ?? [];
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

      const matchFlux = !this.filterFluxId || op.flux_financier_id === this.filterFluxId;

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
    return this.operations.filter((op) => this.isSystemFlux(op)).length;
  }

  get totalOperations(): number {
    return this.filteredOperations.reduce((sum, op) => sum + Number(op.solde ?? 0), 0);
  }

  get selectedPreviewCount(): number {
    return this.importPreview.filter((r) => r.selected).length;
  }

  get currentFlux(): FluxFinancier | undefined {
    return this.getFlux(this.selected?.flux_financier_id ?? null);
  }

  get isSelectedSystemFlux(): boolean {
    return !!this.currentFlux?.flux_systeme;
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

    this.createFluxClasseId = null;
    this.createFluxLibelle = '';
    this.documentsOperation = [];
    this.resetDocumentForm();
  }

  async edit(op: Operation): Promise<void> {
    this.selected = { ...op };
    this.createFluxClasseId = this.getFlux(op.flux_financier_id ?? null)?.classe_comptable_id ?? null;
    this.createFluxLibelle = op.libelle_bancaire || op.destinataire || `Opération ${op.id}`;
    this.resetDocumentForm();
    await this.reloadOperationLinkedData(op.id);
  }

  cancel(): void {
    this.selected = null;
    this.documentsOperation = [];
  }

  async save(): Promise<void> {
    if (!this.selected) return;

    try {
      this.saving = true;
      await this.ensureSelectedOperationSaved();
      this.selected = null;
      await this.reloadData();
    } catch (err) {
      this.showError('Sauvegarde opération', err);
    } finally {
      this.saving = false;
    }
  }

  async ensureSelectedOperationSaved(): Promise<Operation> {
    if (!this.selected) throw new Error('Aucune opération sélectionnée');

    const dto = this.buildOperationDto(this.selected);
    let saved: Operation;

    if (this.selected.id) {
      saved = await this.financeApi.updateOperation(this.selected.id, dto as UpdateOperationDto);
    } else {
      saved = await this.financeApi.createOperation(dto as CreateOperationDto);
    }

    this.selected = { ...this.selected, ...saved };

    const index = this.operations.findIndex((op) => op.id === saved.id);
    if (index >= 0) {
      this.operations[index] = saved;
      this.operations = [...this.operations];
    } else {
      this.operations = [saved, ...this.operations];
    }

    return saved;
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
      await this.financeApi.updateOperation(op.id, { flux_financier_id: fluxId });
      op.flux_financier_id = fluxId;
      if (this.selected?.id === op.id) this.selected.flux_financier_id = fluxId;
    } catch (err) {
      this.showError('Rattachement au flux', err);
    }
  }

  async createFluxFromSelectedOperation(): Promise<void> {
    if (!this.selected) return;
    if (!this.active_saison) {
      alert('Aucune saison active sélectionnée.');
      return;
    }

    try {
      this.saving = true;
      const op = await this.ensureSelectedOperationSaved();
      const libelle = this.createFluxLibelle.trim() || op.libelle_bancaire || op.destinataire || `Opération ${op.id}`;
      const montant = Math.abs(Number(op.solde ?? 0));
      const recette = Number(op.solde ?? 0) > 0;

      const flux = await this.fluxApi.create({
        libelle,
        date: this.toDateOnly(op.date_operation),
        destinataire: op.destinataire || libelle,
        recette,
        statut: 0,
        montant,
        info: op.info ?? null,
        saison_id: this.active_saison,
        classe_comptable_id: this.createFluxClasseId ?? null,
        nb_paiement: 1,
        type_frais: null,
        personne_id: null,
        contrat_prof_id: null,
        flux_systeme: false,
        origine: 'CREATED_FROM_OPERATION',
      } as CreateFluxFinancierDto);

      const updated = await this.financeApi.updateOperation(op.id, { flux_financier_id: flux.id });
      this.selected = { ...this.selected, ...updated };
      await this.reloadData();
    } catch (err) {
      this.showError('Création flux depuis opération', err);
    } finally {
      this.saving = false;
    }
  }

  async creerFluxDepuisOperation(op: Operation): Promise<void> {
    await this.edit(op);
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
        this.importError = 'Aucune saison active détectée.';
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

      const fluxDepense = await this.getOrCreateFluxAClasser(false);
      const fluxRecette = await this.getOrCreateFluxAClasser(true);
      let totalDepense = 0;
      let totalRecette = 0;
      let nbDepense = 0;
      let nbRecette = 0;

      for (const row of rows) {
        try {
          const isRecette = Number(row.montant) >= 0;
          const fluxCible = isRecette ? fluxRecette : fluxDepense;

          await this.financeApi.createOperation({
            solde: row.montant,
            date_operation: row.date_operation,
            date_previsionnelle: row.date_operation,
            mode: 1,
            destinataire: row.destinataire,
            paiement_execute: true,
            compte_bancaire_id: this.importCompteId,
            flux_financier_id: fluxCible.id,
            saison_id: this.active_saison,
            libelle_bancaire: row.libelle_bancaire,
            source_import: 'CSV_BANQUE',
            import_key: row.import_key,
            info: null,
          });

          if (isRecette) {
            totalRecette += Math.abs(Number(row.montant ?? 0));
            nbRecette++;
          } else {
            totalDepense += Math.abs(Number(row.montant ?? 0));
            nbDepense++;
          }

          imported++;
        } catch {
          failed++;
        }
      }

      if (nbDepense) {
        await this.fluxApi.update(fluxDepense.id, {
          montant: Math.abs(Number(fluxDepense.montant ?? 0)) + totalDepense,
          nb_paiement: Number(fluxDepense.nb_paiement ?? 0) + nbDepense,
        });
      }

      if (nbRecette) {
        await this.fluxApi.update(fluxRecette.id, {
          montant: Math.abs(Number(fluxRecette.montant ?? 0)) + totalRecette,
          nb_paiement: Number(fluxRecette.nb_paiement ?? 0) + nbRecette,
        });
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

  async getOrCreateFluxAClasser(recette: boolean): Promise<FluxFinancier> {
    const classeCode = recette ? '7' : '6';
    const origine = recette ? 'IMPORT_A_CLASSER_RECETTE' : 'IMPORT_A_CLASSER_DEPENSE';
    const libelle = recette ? 'À classer 7' : 'À classer 6';
    const classe = this.classes_comptables.find((x) => x.code === classeCode);

    const existing = this.flux.find((f) =>
      f.saison_id === this.active_saison &&
      (f.origine === origine || (f.flux_systeme && f.classe_comptable_id === classe?.id)),
    );

    if (existing) return existing;

    const created = await this.fluxApi.create({
      libelle,
      date: this.today(),
      destinataire: 'Import bancaire',
      recette,
      classe_comptable_id: classe?.id ?? null,
      statut: 0,
      montant: 0,
      nb_paiement: 0,
      type_frais: null,
      personne_id: null,
      contrat_prof_id: null,
      flux_systeme: true,
      origine,
      info: `Flux système pour opérations à classer en classe ${classeCode}`,
      saison_id: this.active_saison,
    } as CreateFluxFinancierDto);

    this.flux = [created, ...this.flux];
    return created;
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

    const headerIndex = lines.findIndex((l) => this.normalizeHeader(l).includes('date;libelle;montant'));

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

      const importKey = [compteBancaireId, date, cleanLibelle, montant.toFixed(2)].join('|');

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

  // ---------------------------------------------------------------------------
  // Documents liés à l'opération
  // ---------------------------------------------------------------------------

  async onDocumentFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    this.newDocumentFile = file;

    if (file && !this.newDocumentTitle) {
      this.newDocumentTitle = file.name;
    }

    input.value = '';
  }

  async addDocumentToOperation(): Promise<void> {
    if (!this.selected) return;

    if (!this.newDocumentFile && !this.newDocumentTitle.trim()) {
      alert('Choisis un fichier ou saisis un titre de document.');
      return;
    }

    try {
      const op = await this.ensureSelectedOperationSaved();
      const file = this.newDocumentFile;

      const dto: CreateDocumentDto = {
        titre: this.newDocumentTitle.trim() || file?.name || 'Document',
        objet_id: op.id,
        objet_type: 'OPERATION',
        typedoc: this.newDocumentType || 'Document libre',
        storage_type: 'DB',
        mimetype: file?.type || 'application/octet-stream',
        file_path: file?.name || null,
        commentaire: this.newDocumentComment || null,
        auteur: null,
      } as any;

      await this.documentApi.create(dto);
      this.resetDocumentForm();
      await this.reloadOperationLinkedData(op.id);
    } catch (err) {
      this.showError('Ajout document', err);
    }
  }

  async attachExistingDocument(): Promise<void> {
    if (!this.selected || !this.selectedExistingDocumentId) return;

    try {
      const op = await this.ensureSelectedOperationSaved();

      await this.documentApi.update(this.selectedExistingDocumentId, {
        objet_id: op.id,
        objet_type: 'OPERATION',
      } as UpdateDocumentDto);

      this.selectedExistingDocumentId = null;
      await this.reloadOperationLinkedData(op.id);
      await this.reloadData();
    } catch (err) {
      this.showError('Association document', err);
    }
  }

  async removeDocumentFromOperation(doc: Document): Promise<void> {
    if (!confirm(`Supprimer le document "${doc.titre}" ?`)) return;

    try {
      await this.documentApi.remove(doc.id);
      if (this.selected?.id) await this.reloadOperationLinkedData(this.selected.id);
    } catch (err) {
      this.showError('Suppression document', err);
    }
  }

  async reloadOperationLinkedData(operationId: number): Promise<void> {
    const [documents, recentDocuments] = await Promise.all([
      this.documentApi.listByObject('OPERATION', operationId),
      this.documentApi.listRecent(50),
    ]);

    this.documentsOperation = documents ?? [];
    this.recentDocuments = recentDocuments ?? [];
  }

  resetDocumentForm(): void {
    this.newDocumentFile = null;
    this.newDocumentTitle = '';
    this.newDocumentComment = '';
    this.newDocumentType = this.typedocLov[0]?.libelle ?? 'Facture';
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
    return c?.nom || (id ? `Compte #${id}` : '');
  }

  getSaisonLabel(saison: Saison): string {
    return saison.nom || `Saison #${saison.id}`;
  }

  getFluxLabel(id: number | null | undefined): string {
    const f = this.getFlux(id ?? null);
    return f?.libelle ?? '';
  }

  isSystemFlux(op: Operation): boolean {
    return !!this.getFlux(op.flux_financier_id ?? null)?.flux_systeme;
  }

  getClasseLabel(id: number | null | undefined): string {
    const c = this.classes_comptables.find((x) => x.id === id);
    return c ? `${c.code} - ${c.libelle}` : '';
  }

  getClasseChildren(): ClasseComptable[] {
    return this.classes_comptables
      .filter((c) => !!c.parent_id && c.actif)
      .sort((a, b) => a.ordre - b.ordre || a.code.localeCompare(b.code));
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
      date_previsionnelle: op.date_previsionnelle ? this.toDateOnly(op.date_previsionnelle) : null,
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
  destinataireMode: 'LIBRE' | 'PERSONNE' = 'LIBRE';
onDestinataireModeChange(): void {
  if (!this.selected) return;

  if (this.destinataireMode === 'LIBRE') {
    this.selected.personne_id = null;
  } else {
    this.selected.destinataire = '';
  }
}

  onOperationPersonneSelected(personne: any | null): void {
    if (!this.selected) return;

    if (!personne) {
      this.selected.personne_id = null;
      return;
    }

    this.selected.personne_id = personne.id;
    this.selected.destinataire =
      personne.libelle ||
      `${personne.prenom ?? ''} ${personne.nom ?? ''}`.trim() ||
      `Personne #${personne.id}`;
  }

 get destinataireSuggestions(): string[] {
    return [...new Set(
      this.operations
        .map((f) => f.destinataire)
        .filter((x): x is string => !!x && x.trim().length > 0)
        .map((x) => x.trim()),
    )].sort((a, b) => a.localeCompare(b, 'fr'));
  }


  private async loadLov(code: string): Promise<LovItem[]> {
    try {
      const raw = await this.addInfoApi.getLov(code, 'FR');
      return this.normalizeLov(raw);
    } catch {
      return this.defaultLov(code);
    }
  }

  private normalizeLov(raw: AddInfo | LovItem[] | any | null): LovItem[] {
    if (!raw) return [];

    if (Array.isArray(raw)) {
      return raw.map((x) => this.normalizeLovItem(x)).filter((x): x is LovItem => !!x);
    }

    const text = typeof raw.text === 'string' ? raw.text : '';
    if (!text) return [];

    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((x) => this.normalizeLovItem(x)).filter((x): x is LovItem => !!x);
      }
    } catch {
      // texte non JSON : on le traite comme une valeur simple
    }

    return [{ id: Number(raw.value_type ?? raw.id ?? 0), categorie: '', libelle: text }];
  }
    private defaultLov(code: string): LovItem[] {
    if (code === 'TYPEDOC') {
      return [
        { id: 1, categorie: 'Finance', libelle: 'Facture' },
        { id: 2, categorie: 'Finance', libelle: 'Devis' },
        { id: 3, categorie: 'Finance', libelle: 'Avoir' },
        { id: 4, categorie: 'Finance', libelle: 'Bon de commande' },
        { id: 5, categorie: 'Finance', libelle: 'Reçu' },
        { id: 99, categorie: 'Autre', libelle: 'Document libre' },
      ];
    }

    if (code === 'stock') {
      return [
        { id: 1, categorie: 'Tenue', libelle: 'Chaussette' },
        { id: 2, categorie: 'Tenue', libelle: 'Maillot' },
        { id: 3, categorie: 'Tenue', libelle: 'Short' },
        { id: 21, categorie: 'Entraînement', libelle: 'Ballon RollBall Enfants' },
        { id: 22, categorie: 'Entraînement', libelle: 'Ballon RollBall Adultes' },
        { id: 31, categorie: 'Entraînement', libelle: 'Chasuble' },
      ];
    }

    return [];
  }
   private normalizeLovItem(item: any): LovItem | null {
    if (!item) return null;
    const libelle = String(item.libelle ?? item.label ?? item.text ?? '').trim();
    if (!libelle) return null;

    return {
      id: Number(item.id ?? item.value_type ?? 0),
      categorie: item.categorie ?? item.category ?? '',
      libelle,
    };
  }

  private showError(action: string, err: unknown): void {
    const errorService = ErrorService.instance;
    errorService.emitChange(
      errorService.CreateError(action, err instanceof Error ? err.message : String(err)),
    );
  }
}
