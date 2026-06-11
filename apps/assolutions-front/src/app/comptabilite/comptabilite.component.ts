import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ErrorService } from '../../services/error.service';
import { CompteBancaireApiService } from '../../services/compte-bancaire-api.service';
import { SaisonApiService } from '../../services/saison-api.service';
import { AppStore } from '../app.store';
import { AddInfoApiService } from '../../services/addinfo-api.service';
import { DocumentApiService } from '../../services/document-api.service';
import { StockApiService } from '../../services/stock-api.service';
import { BudgetRealiseItem, FinanceApiService } from '../../services/finance-api.service';
import { FluxFinancierApiService } from '../../services/flux-financiers-api.service';

import {
  BudgetLigne,
  BudgetScenario,
  ClasseComptable,
  CompteBancaire,
  CreateBudgetLigneDto,
  CreateBudgetScenarioDto,
  CreateFluxFinancierDto,
  CreateOperationDto,
  FluxFinancier,
  Operation,
  Saison,
  UpdateFluxFinancierDto,
  UpdateOperationDto,
} from '@shared/index';

import { AddInfo } from '@shared/lib/addinfo.interface';
import { CreateDocumentDto, Document, UpdateDocumentDto } from '@shared/lib/document.interface';
import { CreateStockDto, Stock } from '@shared/lib/stock.interface';

type FinanceVue = 'DASHBOARD' | 'BUDGET' | 'FLUX';
type SensFilter = 'ALL' | 'RECETTE' | 'DEPENSE';
type DestinataireMode = 'LIBRE' | 'PERSONNE';

type FluxForm = Partial<FluxFinancier> & {
  id?: number;
  liste_operation?: Operation[];
};

interface LovItem {
  id: number;
  categorie?: string;
  libelle: string;
}

interface StockDraft {
  id?: number;
  qte: number;
  lieu_id: number | null;
  lieu_stockage: string;
  type_stock_id: number | null;
  type_stock: string;
  valeur_achat: number | null;
  date_achat: string | null;
  libelle: string;
  info: string;
}

@Component({
  standalone: false,
  selector: 'app-comptabilite',
  templateUrl: './comptabilite.component.html',
  styleUrls: ['./comptabilite.component.css'],
})
export class ComptabiliteComponent implements OnInit {
  vue: FinanceVue = 'DASHBOARD';

  loading = false;
  saving = false;
  action = '';

  saisons: Saison[] = [];
  active_saison = 0;

  comptes: CompteBancaire[] = [];

  classes: ClasseComptable[] = [];
  scenarios: BudgetScenario[] = [];
  lignes: BudgetLigne[] = [];
  flux: FluxFinancier[] = [];
  operations: Operation[] = [];
  realise: BudgetRealiseItem[] = [];

  selectedScenarioId: number | null = null;
  selectedFlux: FluxForm | null = null;

  documentsFlux: Document[] = [];
  recentDocuments: Document[] = [];
  stocksFlux: Stock[] = [];

  typedocLov: LovItem[] = [];
  stockTypeLov: LovItem[] = [];

  newDocumentType = 'Facture';
  newDocumentTitle = '';
  newDocumentComment = '';
  newDocumentFile: File | null = null;
  selectedExistingDocumentId: number | null = null;

  newStock: StockDraft = this.emptyStockDraft();

  newScenarioName = '';
  newLigneClasseId: number | null = null;
  newLigneMontant: number | null = null;
  newLigneInfo = '';

  filterTexte = '';
  filterClasseId: number | null = null;
  filterSens: SensFilter = 'ALL';
  showSystemFlux = false;

  dashboardDetail = true;

  constructor(
    private route: ActivatedRoute,
    private saisonApiService: SaisonApiService,
    private compteBancaireService: CompteBancaireApiService,
    private financeApi: FinanceApiService,
    private fluxApi: FluxFinancierApiService,
    private addInfoApi: AddInfoApiService,
    private documentApi: DocumentApiService,
    private stockApi: StockApiService,
    private store: AppStore,
  ) {}

  async ngOnInit(): Promise<void> {
    this.route.queryParams.subscribe((params) => {
      const vue = params['vue'];
      if (vue === 'BUDGET' || vue === 'FLUX' || vue === 'DASHBOARD') {
        this.vue = vue;
      }
    });

    await this.loadAll();
  }

  async loadAll(): Promise<void> {
    this.loading = true;

    try {
      this.action = 'Charger les saisons et comptes';
      const [saisons, comptes] = await Promise.all([
        this.saisonApiService.list(),
        this.compteBancaireService.list(),
      ]);

      this.saisons = saisons ?? [];
      this.comptes = comptes ?? [];
      this.active_saison = this.store.saison_active_id() || this.saisons[0]?.id || 0;

      this.action = 'Charger les référentiels';
      const [classes, typedocLov, stockTypeLov] = await Promise.all([
        this.financeApi.listClasses('FR', 'fr'),
        this.loadLov('TYPEDOC'),
        this.loadLov('stock'),
      ]);

      this.classes = classes ?? [];
      this.typedocLov = typedocLov;
      this.stockTypeLov = stockTypeLov;

      if (this.typedocLov.length) {
        this.newDocumentType = this.typedocLov[0].libelle;
      }

      await this.reloadFinanceData();
    } catch (err) {
      this.showError(err);
    } finally {
      this.loading = false;
    }
  }

  syncFluxMontantFromOperations(): void {
  if (!this.selectedFlux) return;

  const total = (this.selectedFlux.liste_operation ?? []).reduce(
    (sum, op) => sum + Math.abs(Number(op.solde ?? 0)),
    0,
  );

  /**
   * En base / UI flux :
   * - une recette reste positive
   * - une dépense reste positive aussi
   * Le signe réel est porté par l'opération bancaire.
   */
  this.selectedFlux.montant = Number(total.toFixed(2));
}

onStockLieuSelected(lieu: any | null): void {
  if (!lieu) {
    this.newStock.lieu_id = null;
    this.newStock.lieu_stockage = '';
    return;
  }

  this.newStock.lieu_id = lieu.id;
  this.newStock.lieu_stockage =
    lieu.nom ||
    lieu.libelle ||
    `Lieu #${lieu.id}`;
}

  async reloadFinanceData(): Promise<void> {
    if (!this.active_saison) return;

    this.action = 'Charger les données financières';

    const [scenarios, flux, operations, realise, recentDocuments] = await Promise.all([
      this.financeApi.listScenarios(this.active_saison),
      this.fluxApi.list(this.active_saison, true),
      this.financeApi.listOperations(),
      this.financeApi.budgetRealise(this.active_saison),
      this.documentApi.listRecent(50),
    ]);

    this.scenarios = scenarios ?? [];
    this.flux = flux ?? [];
    this.operations = operations ?? [];
    this.realise = realise ?? [];
    this.recentDocuments = recentDocuments ?? [];

    if (!this.selectedScenarioId && this.scenarios.length) {
      this.selectedScenarioId = this.scenarios[0]?.id ?? null;
    }

    if (this.selectedScenarioId && !this.scenarios.some((s) => s.id === this.selectedScenarioId)) {
      this.selectedScenarioId = this.scenarios[0]?.id ?? null;
    }

    await this.reloadBudgetLignes();
  }

  async reloadBudgetLignes(): Promise<void> {
    if (!this.selectedScenarioId) {
      this.lignes = [];
      return;
    }

    this.lignes = await this.financeApi.listLignes(this.selectedScenarioId);
  }

  async onSaisonChange(): Promise<void> {
    this.selectedScenarioId = null;
    this.selectedFlux = null;
    await this.reloadFinanceData();
  }

  async onScenarioChange(): Promise<void> {
    await this.reloadBudgetLignes();
  }

  setVue(vue: FinanceVue): void {
    this.vue = vue;
  }

  // ---------------------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------------------

isClasseRecette(classeId: number | null | undefined): boolean {
  const c = this.getClasse(classeId);
  return !!c?.recette;
}

get totalBudgetRecettes(): number {
  return this.lignes
    .filter(l => this.isClasseRecette(l.classe_comptable_id))
    .reduce((sum, l) => sum + Math.abs(Number(l.montant_budget ?? 0)), 0);
}

get totalBudgetDepenses(): number {
  return this.lignes
    .filter(l => !this.isClasseRecette(l.classe_comptable_id))
    .reduce((sum, l) => sum + Math.abs(Number(l.montant_budget ?? 0)), 0);
}

get totalBudgetNet(): number {
  return this.totalBudgetRecettes - this.totalBudgetDepenses;
}
get totalBudget(): number {
  return this.totalBudgetNet;
}

  get totalEngageRecettes(): number {
    return this.realFlux.filter((f) => f.recette).reduce((sum, f) => sum + Math.abs(Number(f.montant ?? 0)), 0);
  }

  get totalEngageDepenses(): number {
    return this.realFlux.filter((f) => !f.recette).reduce((sum, f) => sum + Math.abs(Number(f.montant ?? 0)), 0);
  }

  get totalPayeRecettes(): number {
    return this.operations
      .filter((op) => this.getFlux(op.flux_financier_id ?? null)?.recette)
      .filter((op) => op.paiement_execute)
      .reduce((sum, op) => sum + Math.abs(Number(op.solde ?? 0)), 0);
  }

  get totalPayeDepenses(): number {
    return this.operations
      .filter((op) => {
        const f = this.getFlux(op.flux_financier_id ?? null);
        return f && !f.recette;
      })
      .filter((op) => op.paiement_execute)
      .reduce((sum, op) => sum + Math.abs(Number(op.solde ?? 0)), 0);
  }

  get soldeEngage(): number {
    return this.totalEngageRecettes - this.totalEngageDepenses;
  }

  get soldePaye(): number {
    return this.totalPayeRecettes - this.totalPayeDepenses;
  }

  get realFlux(): FluxFinancier[] {
    return this.flux.filter((f) => !f.flux_systeme);
  }

  get dashboardRows() {
    const rows: Array<{
      classe: ClasseComptable;
      level: number;
      budget: number;
      engage: number;
      paye: number;
      ecart: number;
      isParent: boolean;
    }> = [];

    const roots = this.classes
      .filter((c) => !c.parent_id)
      .sort((a, b) => a.ordre - b.ordre || a.code.localeCompare(b.code));

    for (const root of roots) {
      const descendants = this.getDescendants(root.id);
      const ids = [root.id, ...descendants.map((d) => d.id)];

      rows.push({
        classe: root,
        level: 0,
        budget: this.getBudgetForClasses(ids),
        engage: this.getEngageForClasses(ids),
        paye: this.getPayeForClasses(ids),
        ecart: this.getBudgetForClasses(ids) - this.getEngageForClasses(ids),
        isParent: true,
      });

      if (this.dashboardDetail) {
        for (const child of descendants.filter((c) => c.parent_id === root.id)) {
          const sub = this.getDescendants(child.id);
          const childIds = [child.id, ...sub.map((s) => s.id)];

          rows.push({
            classe: child,
            level: 1,
            budget: this.getBudgetForClasses(childIds),
            engage: this.getEngageForClasses(childIds),
            paye: this.getPayeForClasses(childIds),
            ecart: this.getBudgetForClasses(childIds) - this.getEngageForClasses(childIds),
            isParent: false,
          });

          for (const grandChild of sub.filter((c) => c.parent_id === child.id)) {
            rows.push({
              classe: grandChild,
              level: 2,
              budget: this.getBudgetForClasses([grandChild.id]),
              engage: this.getEngageForClasses([grandChild.id]),
              paye: this.getPayeForClasses([grandChild.id]),
              ecart: this.getBudgetForClasses([grandChild.id]) - this.getEngageForClasses([grandChild.id]),
              isParent: false,
            });
          }
        }
      }
    }

    return rows;
  }

  private getBudgetForClasses(ids: number[]): number {
    return this.lignes
      .filter((l) => ids.includes(l.classe_comptable_id))
      .reduce((sum, l) => sum + Math.abs(Number(l.montant_budget ?? 0)), 0);
  }

  private getEngageForClasses(ids: number[]): number {
    return this.realFlux
      .filter((f) => ids.includes(this.getFluxClasseId(f) ?? -1))
      .reduce((sum, f) => sum + Math.abs(Number(f.montant ?? 0)), 0);
  }

  private getPayeForClasses(ids: number[]): number {
    return this.operations
      .filter((op) => op.paiement_execute)
      .filter((op) => {
        const f = this.getFlux(op.flux_financier_id ?? null);
        return f && ids.includes(this.getFluxClasseId(f) ?? -1);
      })
      .reduce((sum, op) => sum + Math.abs(Number(op.solde ?? 0)), 0);
  }

  // ---------------------------------------------------------------------------
  // Budget
  // ---------------------------------------------------------------------------

  async createScenario(): Promise<void> {
    const nom = this.newScenarioName.trim();
    if (!nom || !this.active_saison) return;

    try {
      this.saving = true;

      const dto: CreateBudgetScenarioDto = {
        saison_id: this.active_saison,
        nom,
        scenario_defaut: false,
        info: null,
      };

      const created = await this.financeApi.createScenario(dto);
      this.scenarios = [...this.scenarios, created];
      this.selectedScenarioId = created.id;
      this.newScenarioName = '';
      await this.reloadBudgetLignes();
    } catch (err) {
      this.showError(err);
    } finally {
      this.saving = false;
    }
  }

  async deleteScenario(scenario: BudgetScenario): Promise<void> {
    if (!confirm(`Supprimer le scénario "${scenario.nom}" ?`)) return;

    try {
      await this.financeApi.removeScenario(scenario.id);
      this.scenarios = this.scenarios.filter((s) => s.id !== scenario.id);
      if (this.selectedScenarioId === scenario.id) {
        this.selectedScenarioId = this.scenarios[0]?.id ?? null;
      }
      await this.reloadBudgetLignes();
    } catch (err) {
      this.showError(err);
    }
  }

  async addBudgetLigne(): Promise<void> {
    if (!this.selectedScenarioId || !this.newLigneClasseId || this.newLigneMontant === null) return;

    try {
      const dto: CreateBudgetLigneDto = {
        budget_scenario_id: this.selectedScenarioId,
        classe_comptable_id: this.newLigneClasseId,
        montant_budget: Number(this.newLigneMontant),
        info: this.newLigneInfo || null,
      };

      const created = await this.financeApi.createLigne(dto);
      this.lignes = [...this.lignes, created];
      this.newLigneClasseId = null;
      this.newLigneMontant = null;
      this.newLigneInfo = '';
    } catch (err) {
      this.showError(err);
    }
  }

  async updateBudgetLigne(ligne: BudgetLigne): Promise<void> {
    try {
      await this.financeApi.updateLigne(ligne.id, {
        classe_comptable_id: ligne.classe_comptable_id,
        montant_budget: Number(ligne.montant_budget ?? 0),
        info: ligne.info,
      });
    } catch (err) {
      this.showError(err);
    }
  }

  async deleteBudgetLigne(ligne: BudgetLigne): Promise<void> {
    if (!confirm('Supprimer cette ligne de budget ?')) return;

    try {
      await this.financeApi.removeLigne(ligne.id);
      this.lignes = this.lignes.filter((l) => l.id !== ligne.id);
    } catch (err) {
      this.showError(err);
    }
  }

  // ---------------------------------------------------------------------------
  // Flux financiers
  // ---------------------------------------------------------------------------

  get filteredFlux(): FluxFinancier[] {
    const txt = this.filterTexte.trim().toLowerCase();

    return this.flux.filter((f) => {
      if (!this.showSystemFlux && f.flux_systeme) return false;

      const matchTexte =
        !txt ||
        String(f.libelle ?? '').toLowerCase().includes(txt) ||
        String(f.destinataire ?? '').toLowerCase().includes(txt) ||
        String(f.info ?? '').toLowerCase().includes(txt);

      const matchClasse = !this.filterClasseId || this.getFluxClasseId(f) === this.filterClasseId;

      const matchSens =
        this.filterSens === 'ALL' ||
        (this.filterSens === 'RECETTE' && f.recette) ||
        (this.filterSens === 'DEPENSE' && !f.recette);

      return matchTexte && matchClasse && matchSens;
    });
  }

  createFlux(): void {
    this.selectedFlux = {
      id: 0,
      libelle: '',
      date: this.today(),
      destinataire: '',
      recette: false,
      statut: 0,
      montant: 0,
      info: null,
      saison_id: this.active_saison,
      classe_comptable_id: null,
      nb_paiement: 1,
      flux_systeme: false,
      origine: null,
      personne_id: null,
      contrat_prof_id: null,
      liste_operation: [],
    };

    this.documentsFlux = [];
    this.stocksFlux = [];
    this.newStock = this.emptyStockDraft();
    this.resetDocumentForm();
  }

  async editFlux(f: FluxFinancier): Promise<void> {
    try {
      const [full, ops] = await Promise.all([
        this.fluxApi.get(f.id),
        this.financeApi.listOperations(f.id),
      ]);

      this.selectedFlux = {
        ...full,
        liste_operation: ops ?? [],
      };

      await this.reloadFluxLinkedData(full.id);
    } catch (err) {
      this.showError(err);
    }
  }

  closeFlux(): void {
    this.selectedFlux = null;
    this.documentsFlux = [];
    this.stocksFlux = [];
  }

  async saveFlux(): Promise<void> {
    if (!this.selectedFlux) return;

    try {
      this.saving = true;
      const saved = await this.ensureSelectedFluxSaved();
      await this.saveFluxOperations(saved.id);

      this.selectedFlux = null;
      await this.reloadFinanceData();
    } catch (err) {
      this.showError(err);
    } finally {
      this.saving = false;
    }
  }

  async deleteFlux(f: FluxFinancier): Promise<void> {
    if (f.flux_systeme) {
      alert('Un flux système ne peut pas être supprimé.');
      return;
    }

    if (!confirm(`Supprimer le flux "${f.libelle}" ?`)) return;

    try {
      await this.fluxApi.remove(f.id);
      await this.reloadFinanceData();
    } catch (err) {
      this.showError(err);
    }
  }

  addOperation(): void {
    if (!this.selectedFlux) return;

    const compteId = this.comptes[0]?.id ?? 0;

    const op: Operation = {
      id: 0,
      solde: this.selectedFlux.recette
        ? Math.abs(Number(this.selectedFlux.montant ?? 0))
        : -Math.abs(Number(this.selectedFlux.montant ?? 0)),
      date_operation: this.today(),
      date_previsionnelle: this.today(),
      mode: 0,
      destinataire: String(this.selectedFlux.destinataire ?? ''),
      paiement_execute: false,
      compte_bancaire_id: compteId,
      flux_financier_id: this.selectedFlux.id ?? 0,
      saison_id: this.active_saison,
      libelle_bancaire: null,
      import_key: null,
      source_import: null,
      info: null,
    } as any;

    this.selectedFlux.liste_operation = [...(this.selectedFlux.liste_operation ?? []), op];
  }

  async deleteOperation(op: Operation): Promise<void> {
    if (!this.selectedFlux?.liste_operation) return;

    if (op.id) {
      await this.financeApi.removeOperation(op.id);
    }

    this.selectedFlux.liste_operation = this.selectedFlux.liste_operation.filter((x) => x !== op);
  }

  private async saveFluxOperations(fluxId: number): Promise<void> {
    const ops = this.selectedFlux?.liste_operation ?? [];

    for (const op of ops) {
      const dto: CreateOperationDto | UpdateOperationDto = {
        solde: Number(op.solde ?? 0),
        date_operation: this.toDateOnly(op.date_operation),
        date_previsionnelle: op.date_previsionnelle ? this.toDateOnly(op.date_previsionnelle) : null,
        mode: Number(op.mode ?? 0),
        destinataire: String(op.destinataire ?? ''),
        paiement_execute: Boolean(op.paiement_execute),
        compte_bancaire_id: Number(op.compte_bancaire_id ?? 0),
        flux_financier_id: fluxId,
        saison_id: this.active_saison,
        libelle_bancaire: (op as any).libelle_bancaire ?? null,
        source_import: (op as any).source_import ?? null,
        import_key: (op as any).import_key ?? null,
        info: op.info ?? null,
      } as any;

      if (op.id) {
        await this.financeApi.updateOperation(op.id, dto as UpdateOperationDto);
      } else {
        await this.financeApi.createOperation(dto as CreateOperationDto);
      }
    }
  }

  get totalOperationsSelectedFlux(): number {
    return (this.selectedFlux?.liste_operation ?? []).reduce(
      (sum, op) => sum + Math.abs(Number(op.solde ?? 0)),
      0,
    );
  }

  get deltaSelectedFlux(): number {
    const montant = Math.abs(Number(this.selectedFlux?.montant ?? 0));
    return Number((montant - this.totalOperationsSelectedFlux).toFixed(2));
  }

  // ---------------------------------------------------------------------------
  // Destinataire
  // ---------------------------------------------------------------------------

destinataireMode: 'LIBRE' | 'PERSONNE' = 'LIBRE';
onDestinataireModeChange(): void {
  if (!this.selectedFlux) return;

  if (this.destinataireMode === 'LIBRE') {
    this.selectedFlux.personne_id = null;
  } else {
    this.selectedFlux.destinataire = '';
  }
}
lieuMode: 'LIBRE' | 'EXISTE' = 'LIBRE';
onLieuModeChange(): void {
  if (!this.newStock) return;

  if (this.lieuMode === 'LIBRE') {
    this.newStock.lieu_id = null;
  } else {
    this.newStock.lieu_stockage = '';
  }
}

async downloadDocument(doc: Document): Promise<void> {
  try {
    const fullDoc = await this.documentApi.get(doc.id);
    const anyDoc: any = fullDoc;

    if (!anyDoc.file_data) {
      alert('Aucun fichier disponible pour ce document.');
      return;
    }

    let blob: Blob;

    if (anyDoc.file_data instanceof Blob) {
      blob = anyDoc.file_data;
    } else if (typeof anyDoc.file_data === 'string') {
      const base64 = anyDoc.file_data.includes(',')
        ? anyDoc.file_data.split(',')[1]
        : anyDoc.file_data;

      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);

      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      blob = new Blob([bytes], {
        type: anyDoc.mimetype || 'application/octet-stream',
      });
    } else if (Array.isArray(anyDoc.file_data?.data)) {
      blob = new Blob([new Uint8Array(anyDoc.file_data.data)], {
        type: anyDoc.mimetype || 'application/octet-stream',
      });
    } else {
      alert('Format de fichier non reconnu.');
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = fullDoc.titre || fullDoc.file_path || 'document';
    a.click();

    URL.revokeObjectURL(url);
  } catch (err) {
    this.showError(err);
  }
}

  onFluxPersonneSelected(personne: any | null): void {
    if (!this.selectedFlux) return;

    if (!personne) {
      this.selectedFlux.personne_id = null;
      return;
    }

    this.selectedFlux.personne_id = personne.id;
    this.selectedFlux.destinataire =
      personne.libelle ||
      `${personne.prenom ?? ''} ${personne.nom ?? ''}`.trim() ||
      `Personne #${personne.id}`;
  }

  get destinataireSuggestions(): string[] {
    return [...new Set(
      this.flux
        .map((f) => f.destinataire)
        .filter((x): x is string => !!x && x.trim().length > 0)
        .map((x) => x.trim()),
    )].sort((a, b) => a.localeCompare(b, 'fr'));
  }

  get libelleSuggestions(): string[] {
    return [...new Set(
      this.flux
        .map((f) => f.libelle)
        .filter((x): x is string => !!x && x.trim().length > 0)
        .map((x) => x.trim()),
    )].sort((a, b) => a.localeCompare(b, 'fr'));
  }

  // ---------------------------------------------------------------------------
  // Documents
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

  async addDocumentToFlux(): Promise<void> {
    if (!this.selectedFlux) return;

    if (!this.newDocumentFile && !this.newDocumentTitle.trim()) {
      alert('Choisis un fichier ou saisis un titre de document.');
      return;
    }

    try {
      const flux = await this.ensureSelectedFluxSaved();
      const file = this.newDocumentFile;

      const dto: CreateDocumentDto = {
        titre: this.newDocumentTitle.trim() || file?.name || 'Document',
        objet_id: flux.id,
        objet_type: 'flux_financier',
        typedoc: this.newDocumentType || 'Document libre',
        storage_type: 'DB' ,
        mimetype: file?.type || 'application/octet-stream',
        file_path: file?.name || null,
        file_data: file,
        commentaire: this.newDocumentComment || null,
        auteur: null,
      } as CreateDocumentDto;

      await this.documentApi.create(dto);
      this.resetDocumentForm();
      await this.reloadFluxLinkedData(flux.id);
      await this.reloadFinanceData();
    } catch (err) {
      this.showError(err);
    }
  }

  async attachExistingDocument(): Promise<void> {
    if (!this.selectedFlux || !this.selectedExistingDocumentId) return;

    try {
      const flux = await this.ensureSelectedFluxSaved();

      await this.documentApi.update(this.selectedExistingDocumentId, {
        objet_id: flux.id,
        objet_type: 'flux_financier',
      } as UpdateDocumentDto);

      this.selectedExistingDocumentId = null;
      await this.reloadFluxLinkedData(flux.id);
      await this.reloadFinanceData();
    } catch (err) {
      this.showError(err);
    }
  }

  async removeDocumentFromFlux(doc: Document): Promise<void> {
    if (!confirm(`Supprimer le document "${doc.titre}" ?`)) return;

    try {
      await this.documentApi.remove(doc.id);
      if (this.selectedFlux?.id) {
        await this.reloadFluxLinkedData(this.selectedFlux.id);
      }
      await this.reloadFinanceData();
    } catch (err) {
      this.showError(err);
    }
  }

  resetDocumentForm(): void {
    this.newDocumentFile = null;
    this.newDocumentTitle = '';
    this.newDocumentComment = '';
    this.newDocumentType = this.typedocLov[0]?.libelle ?? 'Facture';
  }

  // ---------------------------------------------------------------------------
  // Stocks
  // ---------------------------------------------------------------------------

  async addStockToFlux(): Promise<void> {
    if (!this.selectedFlux) return;

    if (!this.newStock.libelle.trim()) {
      alert('Saisis un libellé de stock.');
      return;
    }

    if (!this.newStock.type_stock.trim()) {
      alert('Choisis ou saisis un type de stock.');
      return;
    }

    try {
      const flux = await this.ensureSelectedFluxSaved();

      const dto: CreateStockDto = {
        qte: Number(this.newStock.qte ?? 1),
        lieu_id: this.newStock.lieu_id ?? null,
        lieu_stockage: this.newStock.lieu_stockage || 'Non renseigné',
        type_stock_id: this.newStock.type_stock_id ?? null,
        type_stock: this.newStock.type_stock,
        valeur_achat: this.newStock.valeur_achat === null ? null : Number(this.newStock.valeur_achat),
        date_achat: this.newStock.date_achat || this.toDateOnly(flux.date),
        flux_financier_id: flux.id,
        libelle: this.newStock.libelle,
        info: this.newStock.info || '',
      } as any;

      await this.stockApi.create(dto);
      this.newStock = this.emptyStockDraft();
      await this.reloadFluxLinkedData(flux.id);
    } catch (err) {
      this.showError(err);
    }
  }

  async attachExistingStock(stock: Stock): Promise<void> {
    if (!this.selectedFlux) return;

    try {
      const flux = await this.ensureSelectedFluxSaved();
      await this.stockApi.update(stock.id, { flux_financier_id: flux.id } as any);
      await this.reloadFluxLinkedData(flux.id);
    } catch (err) {
      this.showError(err);
    }
  }

  async deleteStock(stock: Stock): Promise<void> {
    if (!confirm(`Supprimer le stock "${stock.libelle}" ?`)) return;

    try {
      await this.stockApi.remove(stock.id);
      if (this.selectedFlux?.id) {
        await this.reloadFluxLinkedData(this.selectedFlux.id);
      }
    } catch (err) {
      this.showError(err);
    }
  }

  onStockTypeChange(typeId: number | null): void {
    this.newStock.type_stock_id = typeId;

    const item = this.stockTypeLov.find((x) => x.id === typeId);
    if (item) {
      this.newStock.type_stock = item.libelle;
      if (!this.newStock.libelle) {
        this.newStock.libelle = item.libelle;
      }
    }
  }

  private emptyStockDraft(): StockDraft {
    return {
      qte: 1,
      lieu_id: null,
      lieu_stockage: '',
      type_stock_id: null,
      type_stock: '',
      valeur_achat: null,
      date_achat: this.today(),
      libelle: '',
      info: '',
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  async ensureSelectedFluxSaved(): Promise<FluxFinancier> {
    if (!this.selectedFlux) {
      throw new Error('Aucun flux sélectionné');
    }

    const dto = this.buildFluxDto(this.selectedFlux);

    let saved: FluxFinancier;
    if (!this.selectedFlux.id) {
      saved = await this.fluxApi.create(dto as CreateFluxFinancierDto);
    } else {
      saved = await this.fluxApi.update(this.selectedFlux.id, dto as UpdateFluxFinancierDto);
    }

    this.selectedFlux = {
      ...this.selectedFlux,
      ...saved,
      liste_operation: this.selectedFlux.liste_operation ?? [],
    };

    const index = this.flux.findIndex((f) => f.id === saved.id);
    if (index >= 0) {
      this.flux[index] = saved;
      this.flux = [...this.flux];
    } else {
      this.flux = [saved, ...this.flux];
    }

    return saved;
  }

  async reloadFluxLinkedData(fluxId: number): Promise<void> {
    const [documents, stocks, recentDocuments] = await Promise.all([
      this.documentApi.listByObject('flux_financier', fluxId),
      this.stockApi.list(fluxId),
      this.documentApi.listRecent(50),
    ]);

    this.documentsFlux = documents ?? [];
    this.stocksFlux = stocks ?? [];
    this.recentDocuments = recentDocuments ?? [];
  }

  getClasse(id: number | null | undefined): ClasseComptable | undefined {
    return this.classes.find((c) => c.id === id);
  }

  getClasseLabel(id: number | null | undefined): string {
    const c = this.getClasse(id);
    return c ? `${c.code} - ${c.libelle}` : '';
  }

  getClasseChildren(): ClasseComptable[] {
    return this.classes
      .filter((c) => !!c.parent_id && c.actif)
      .sort((a, b) => a.ordre - b.ordre || a.code.localeCompare(b.code));
  }

  getFlux(id: number | null): FluxFinancier | undefined {
    if (!id) return undefined;
    return this.flux.find((f) => f.id === id);
  }

  getFluxClasseId(f: any): number | null {
    return f?.classe_comptable_id ?? null;
  }

  getDescendants(parentId: number): ClasseComptable[] {
    const result: ClasseComptable[] = [];
    const direct = this.classes.filter((c) => c.parent_id === parentId);

    for (const child of direct) {
      result.push(child);
      result.push(...this.getDescendants(child.id));
    }

    return result;
  }

  getCompteLabel(id: number | null | undefined): string {
    const c: any = this.comptes.find((x) => x.id === id);
    return c?.nom || c?.libelle || (id ? `Compte #${id}` : '');
  }

  getSaisonLabel(saison: Saison): string {
    const s: any = saison;
    return s.nom || s.libelle || `Saison #${s.id}`;
  }

  formatMontant(value: number | string | null | undefined): string {
    return `${Number(value ?? 0).toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} €`;
  }

  private buildFluxDto(f: FluxForm): CreateFluxFinancierDto | UpdateFluxFinancierDto {
    return {
      libelle: String(f.libelle ?? ''),
      date: this.toDateOnly(f.date ?? this.today()),
      destinataire: String(f.destinataire ?? ''),
      recette: Boolean(f.recette),
      statut: Number(f.statut ?? 0),
      montant: Math.abs(Number(f.montant ?? 0)),
      info: f.info ?? null,
      saison_id: Number(f.saison_id ?? this.active_saison),
      classe_comptable_id: f.classe_comptable_id ?? null,
      nb_paiement: Number(f.nb_paiement ?? 1),
      type_frais: f.type_frais ?? null,
      personne_id: f.personne_id ?? null,
      contrat_prof_id: f.contrat_prof_id ?? null,
      flux_systeme: f.flux_systeme ?? false,
      origine: f.origine ?? null,
    } as any;
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

  private defaultLov(code: string): LovItem[] {
    if (code === 'LV_TYPEDOC_FR') {
      return [
        { id: 1, categorie: 'Finance', libelle: 'Facture' },
        { id: 2, categorie: 'Finance', libelle: 'Devis' },
        { id: 3, categorie: 'Finance', libelle: 'Avoir' },
        { id: 4, categorie: 'Finance', libelle: 'Bon de commande' },
        { id: 5, categorie: 'Finance', libelle: 'Reçu' },
        { id: 99, categorie: 'Autre', libelle: 'Document libre' },
      ];
    }

    if (code === 'LV_STOCK_FR') {
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

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private toDateOnly(value: any): string {
    if (!value) return this.today();
    if (typeof value === 'string') return value.slice(0, 10);
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value).slice(0, 10);
  }

  private showError(err: unknown): void {
    const message =
      (err as HttpErrorResponse)?.message ??
      (err instanceof Error ? err.message : String(err));

    const errorService = ErrorService.instance;
    errorService.emitChange(errorService.CreateError(this.action || 'Finance', message));
  }
}
