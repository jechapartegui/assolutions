import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AddInfoApiService } from '../../services/addinfo-api.service';
import { ErrorService } from '../../services/error.service';
import { ExcelService } from '../../services/excel-export.service';
import { StockApiService } from '../../services/stock-api.service';
import { TypeStock, TypeTransaction, StaticClass } from '../global';
import { AppStore } from '../app.store';
import { GenericLink_VM, Stock_VM } from '@shared/index';

type StockSortField = 'libelle' | 'type' | 'date' | 'lieu' | 'qte' | 'valeur';
type SortSens = 'ASC' | 'DESC';

class StockFilters {
  libelle = '';
  typeEquipement: string | null = null;
  equipement: string | null = null;
  lieu: GenericLink_VM | null = null;
  dateDu = '';
  dateAu = '';
}

@Component({
  standalone: false,
  selector: 'app-stock',
  templateUrl: './stock.component.html',
  styleUrls: ['./stock.component.css'],
})
export class StockComponent implements OnInit {
  loading = false;
  saving = false;
  action = '';

  liste_lieu: GenericLink_VM[] = [];
  liste_transaction: GenericLink_VM[] = [];

  liste_stock: Stock_VM[] = [];
  TypeStock: TypeStock[] = [];
  TypeTransaction: TypeTransaction[] = [];

  filters = new StockFilters();

  selectedSort: StockSortField = 'date';
  selectedSortSens: SortSens = 'DESC';

  editStock: Stock_VM | null = null;
  editMode = false;

  afficher_filtre = false;
  IsVendre = false;

  showScrollToTop = false;

  constructor(
    public store: AppStore,
    private router: Router,
    private stockservice: StockApiService,
    public SC: StaticClass,
    private excelService: ExcelService,
    private addinfo_serv: AddInfoApiService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    const errorService = ErrorService.instance;
    this.loading = true;

    try {
      if (!this.store.isLoggedIn()) {
        errorService.emitChange(
          errorService.CreateError('Stock', $localize`Accès impossible, vous n'êtes pas connecté`),
        );
        this.router.navigate(['/login']);
        return;
      }

      if (this.store.mode() === 'APPLI') {
        this.store.updateSelectedMenu('MENU');
        this.router.navigate(['/menu']);
        return;
      }

      await Promise.all([
        this.loadLieuxEtTransactions(),
        this.loadTypesStock(),
        this.loadTypesTransaction(),
      ]);

      await this.UpdateListeStock();
    } catch (err: any) {
      errorService.emitChange(
        errorService.CreateError(this.action || 'Stock', err?.message ?? err),
      );
    } finally {
      this.loading = false;
    }
  }

  private async loadLieuxEtTransactions(): Promise<void> {
    this.action = $localize`Charger la liste des endroits de stockage`;

    if (!this.SC.ListeObjet || this.SC.ListeObjet.length === 0) {
      const liste = await this.addinfo_serv.getall_liste(['rider', 'lieu']);
      this.SC.ListeObjet = liste;
    }

    this.liste_lieu = this.SC.ListeObjet.filter(x =>
      x.type === 'rider' || x.type === 'lieu' || x.type === 'autre',
    );

    this.liste_transaction = this.SC.ListeObjet.filter(x => x.type === 'transaction');
  }

  private async loadTypesStock(): Promise<void> {
    this.action = $localize`Charger les types de stock`;

    if (!this.SC.TypeStock || this.SC.TypeStock.length === 0) {
      const liste = await this.addinfo_serv.get_lv('stock', false);
      this.SC.TypeStock = JSON.parse(liste.text);
    }

    this.TypeStock = this.SC.TypeStock ?? [];
  }

  private async loadTypesTransaction(): Promise<void> {
    this.action = $localize`Charger les types d'achat`;

    if (!this.SC.TypeTransaction || this.SC.TypeTransaction.length === 0) {
      const liste = await this.addinfo_serv.get_lv('type_achat', false);
      this.SC.TypeTransaction = JSON.parse(liste.text);
    }

    this.TypeTransaction = this.SC.TypeTransaction ?? [];
  }

  async UpdateListeStock(): Promise<void> {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger les équipements`;

    try {
      const stocks = await this.stockservice.getAll();
      this.liste_stock = stocks ?? [];
    } catch (err: any) {
      errorService.emitChange(
        errorService.CreateError(this.action, err?.message ?? err),
      );
    }
  }

  get filteredStocks(): Stock_VM[] {
    let list = [...this.liste_stock];

    const q = this.normalize(this.filters.libelle);

    if (q) {
      list = list.filter(s =>
        this.normalize(`${s.libelle ?? ''} ${s.type_stock ?? ''} ${s.info ?? ''}`).includes(q),
      );
    }

    if (this.filters.typeEquipement) {
      list = list.filter(s =>
        this.getTypeCategorieFromStock(s) === this.filters.typeEquipement,
      );
    }

    if (this.filters.equipement) {
      list = list.filter(s => String(s.type_stock ?? '') === this.filters.equipement);
    }

    if (this.filters.lieu) {
      list = list.filter(s =>
        Number(s.lieu_stockage?.id) === Number(this.filters.lieu?.id),
      );
    }

    if (this.filters.dateDu) {
      list = list.filter(s => this.toDateOnly(s.date_achat) >= this.filters.dateDu);
    }

    if (this.filters.dateAu) {
      list = list.filter(s => this.toDateOnly(s.date_achat) <= this.filters.dateAu);
    }

    return this.sortStocks(list);
  }

  get liste_type_equipement(): string[] {
    return Array.from(
      new Set(this.TypeStock.map(t => t.categorie).filter(Boolean)),
    );
  }

  get liste_equipement(): string[] {
    return Array.from(
      new Set(
        this.TypeStock
          .filter(t => !this.filters.typeEquipement || t.categorie === this.filters.typeEquipement)
          .map(t => this.getTypeStockLabel(t)),
      ),
    );
  }

  get hasFilters(): boolean {
    return !!(
      this.filters.libelle ||
      this.filters.typeEquipement ||
      this.filters.equipement ||
      this.filters.lieu ||
      this.filters.dateDu ||
      this.filters.dateAu
    );
  }

  get canSave(): boolean {
    return !!(
      this.editStock &&
      this.editStock.type_stock &&
      this.editStock.date_achat &&
      (this.editStock.libelle ?? '').trim().length >= 3 &&
      Number(this.editStock.qte ?? 0) > 0
    );
  }

  getTypeStockLabel(t: TypeStock): string {
    return `${t.libelle}${t.categorie ? ` (${t.categorie})` : ''}`;
  }

  getTypeCategorieFromStock(stock: Stock_VM): string | null {
    const found = this.TypeStock.find(t => this.getTypeStockLabel(t) === stock.type_stock);
    return found?.categorie ?? null;
  }

  getTransactionLabel(id: number | null | undefined): string {
    if (!id || id <= 0) return $localize`Aucune`;
    return this.liste_transaction.find(x => Number(x.id) === Number(id))?.value ?? $localize`Aucune`;
  }

  getLieuLabel(stock: Stock_VM | null): string {
    if (!stock?.lieu_stockage) return '—';
    return `${stock.lieu_stockage.value ?? ''}${stock.lieu_stockage.type ? ` (${stock.lieu_stockage.type})` : ''}`;
  }

  sortBy(field: StockSortField): void {
    if (this.selectedSort === field) {
      this.selectedSortSens = this.selectedSortSens === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.selectedSort = field;
      this.selectedSortSens = field === 'date' ? 'DESC' : 'ASC';
    }
  }

  private sortStocks(list: Stock_VM[]): Stock_VM[] {
    return list.sort((a, b) => {
      let cmp = 0;

      switch (this.selectedSort) {
        case 'libelle':
          cmp = this.normalize(a.libelle).localeCompare(this.normalize(b.libelle), 'fr');
          break;
        case 'type':
          cmp = this.normalize(a.type_stock).localeCompare(this.normalize(b.type_stock), 'fr');
          break;
        case 'date':
          cmp = this.toDateOnly(a.date_achat).localeCompare(this.toDateOnly(b.date_achat));
          break;
        case 'lieu':
          cmp = this.normalize(a.lieu_stockage?.value).localeCompare(this.normalize(b.lieu_stockage?.value), 'fr');
          break;
        case 'qte':
          cmp = Number(a.qte ?? 0) - Number(b.qte ?? 0);
          break;
        case 'valeur':
          cmp = Number(a.valeur_achat ?? 0) - Number(b.valeur_achat ?? 0);
          break;
      }

      return this.selectedSortSens === 'ASC' ? cmp : -cmp;
    });
  }

  Creer(): void {
    const stock = new Stock_VM();

    stock.id = 0;
    stock.libelle = '';
    stock.type_stock = '';
    stock.date_achat = new Date() as any;
    stock.qte = 1;
    stock.valeur_achat = 0;
    stock.info = '';
    stock.lieu_stockage = null as any;
    stock.flux_financier_id = null as any;

    this.editStock = stock;
    this.editMode = true;
  }

  async Voir(stock: Stock_VM): Promise<void> {
    await this.loadStock(stock.id, false);
  }

  async Edit(stock: Stock_VM): Promise<void> {
    await this.loadStock(stock.id, true);
  }

  private async loadStock(id: number, editMode: boolean): Promise<void> {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger l'équipement`;

    try {
      this.editStock = await this.stockservice.get(id);
      this.editMode = editMode;
    } catch (err: any) {
      errorService.emitChange(
        errorService.CreateError(this.action, err?.message ?? err),
      );
    }
  }

  setEditMode(): void {
    this.editMode = true;
  }

  async Save(): Promise<void> {
    if (!this.editStock || !this.canSave) return;

    const errorService = ErrorService.instance;
    this.saving = true;

    try {
      if (this.editStock.id === 0) {
        this.action = $localize`Ajouter un équipement`;
        const id = await this.stockservice.add(this.editStock);

        if (id > 0) {
          this.editStock.id = id;
          errorService.emitChange(errorService.OKMessage(this.action));
        } else {
          errorService.emitChange(errorService.UnknownError(this.action));
        }
      } else {
        this.action = $localize`Mettre à jour un équipement`;
        const ok = await this.stockservice.update(this.editStock);

        if (ok) {
          errorService.emitChange(errorService.OKMessage(this.action));
        } else {
          errorService.emitChange(errorService.UnknownError(this.action));
        }
      }

      await this.UpdateListeStock();
      this.editMode = false;
    } catch (err: any) {
      errorService.emitChange(
        errorService.CreateError(this.action, err?.message ?? err),
      );
    } finally {
      this.saving = false;
    }
  }

  async Refresh(): Promise<void> {
    if (!this.editStock?.id) return;
    await this.loadStock(this.editStock.id, this.editMode);
  }

  Retour(): void {
    if (this.editMode) {
      const ok = window.confirm(
        $localize`Vous perdrez les modifications non sauvegardées. Continuer ?`,
      );
      if (!ok) return;
    }

    this.editMode = false;
    this.editStock = null;
    this.UpdateListeStock();
  }

  async Delete(stock: Stock_VM): Promise<void> {
    const ok = window.confirm(
      $localize`Voulez-vous supprimer cet équipement ? Cette action est définitive.`,
    );

    if (!ok) return;

    const errorService = ErrorService.instance;
    this.action = $localize`Supprimer un équipement`;

    try {
      const result = await this.stockservice.delete(stock.id);

      if (result) {
        await this.UpdateListeStock();
        errorService.emitChange(errorService.OKMessage(this.action));
      } else {
        errorService.emitChange(errorService.UnknownError(this.action));
      }
    } catch (err: any) {
      errorService.emitChange(
        errorService.CreateError(this.action, err?.message ?? err),
      );
    }
  }

  Acheter(): void {
    this.Creer();
  }

  Vendre(stock: Stock_VM): void {
    stock.to_sell = true;
    this.IsVendre = true;
  }

  VendreList(): void {
    const selected = this.liste_stock.filter(s => s.to_sell);

    if (!selected.length) {
      window.alert('Aucun équipement sélectionné pour la vente.');
      return;
    }

    window.alert(`À brancher : vente de ${selected.length} équipement(s).`);
  }

  clearFilters(): void {
    this.filters = new StockFilters();
  }

  ExporterExcel(): void {
    const headers = {
      ID: 'ID',
      Libelle: 'Libellé',
      TypeStockLibelle: 'Type équipement',
      LieuStockageLibelle: 'Lieu de stockage',
      Valeur_Achat: 'Valeur achat',
      Quantite: 'Quantité',
      Transaction: 'Transaction',
    };

    const list = this.filteredStocks.map(s => ({
      ...s,
      TypeStockLibelle: s.type_stock,
      LieuStockageLibelle: this.getLieuLabel(s),
      Valeur_Achat: s.valeur_achat,
      Quantite: s.qte,
      Transaction: this.getTransactionLabel(s.flux_financier_id),
    }));

    this.excelService.exportAsExcelFile(list, 'liste_stock', headers);
  }

  updateDateAchat(value: string): void {
    if (!this.editStock) return;
    this.editStock.date_achat = value as any;
  }

  toDateInput(value: string | Date | null | undefined): string {
    return this.toDateOnly(value);
  }

  onContentScroll(event: Event): void {
    const el = event.target as HTMLElement;
    this.showScrollToTop = (el?.scrollTop ?? 0) > 200;
  }

  scrollToTop(container: HTMLElement): void {
    container.scrollTo({ top: 0, behavior: 'smooth' });
  }

  trackById = (_: number, item: Stock_VM) => item.id;

  private toDateOnly(value: string | Date | null | undefined): string {
    if (!value) return '';

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      const yyyy = value.getFullYear();
      const mm = String(value.getMonth() + 1).padStart(2, '0');
      const dd = String(value.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }

    if (typeof value === 'string') {
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);

      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return this.toDateOnly(parsed);
      }
    }

    return '';
  }

  private normalize(value: string | null | undefined): string {
    return (value ?? '')
      .toString()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .trim()
      .toLowerCase();
  }
}