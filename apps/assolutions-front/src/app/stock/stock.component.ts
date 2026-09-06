import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CreateStockDto, Stock, UpdateStockDto } from '@shared/lib/stock.interface';
import { FluxFinancier } from '@shared/lib/flux-financier.interface';
import { Lieu } from '@shared/lib/lieu.interface';

import { StockApiService } from '../../services/stock-api.service';
import { LieuApiService } from '../../services/lieu-api.service';
import { FluxFinancierApiService } from '../../services/flux-financiers-api.service';
import { AppStore } from '../app.store';

type StockDraft = {
  qte: number;
  lieu_id: number | null;
  lieu_stockage: string;
  type_stock_id: number | null;
  type_stock: string;
  valeur_achat: number | null;
  date_achat: string | null;
  flux_financier_id: number | null;
  libelle: string;
  info: string;
};

type StockLocationGroup = {
  key: string;
  label: string;
  referenced: boolean;
  items: Stock[];
  quantity: number;
};

@Component({
  selector: 'app-stock',
  templateUrl: './stock.component.html',
  styleUrls: ['./stock.component.css'],
  standalone: false,
})
export class StockComponent implements OnInit {
  stocks: Stock[] = [];
  lieux: Lieu[] = [];
  flux: FluxFinancier[] = [];

  loading = false;
  saving = false;
  error = '';
  message = '';
  search = '';
  locationFilter = 'ALL';

  editorOpen = false;
  editingId: number | null = null;
  draft: StockDraft = this.emptyDraft();

  constructor(
    public readonly store: AppStore,
    private readonly stockApi: StockApiService,
    private readonly lieuApi: LieuApiService,
    private readonly fluxApi: FluxFinancierApiService,
    private readonly router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    this.store.updateSelectedMenu('STOCK');
    await this.load();
  }

  get searchedStocks(): Stock[] {
    const query = this.search.trim().toLowerCase();
    if (!query) return this.stocks;

    return this.stocks.filter((stock) =>
      [
        stock.libelle,
        stock.type_stock,
        stock.info,
        this.getLieuLabel(stock),
        stock.flux_financier_id ? this.getFluxLabel(stock.flux_financier_id) : '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }

  get filteredStocks(): Stock[] {
    if (this.locationFilter === 'ALL') return this.searchedStocks;
    return this.searchedStocks.filter(
      (stock) => this.getLocationKey(stock) === this.locationFilter,
    );
  }

  get locationGroups(): StockLocationGroup[] {
    const groups = new Map<string, StockLocationGroup>();

    for (const stock of this.filteredStocks) {
      const key = this.getLocationKey(stock);
      const current = groups.get(key) ?? {
        key,
        label: this.getLieuLabel(stock),
        referenced: Number(stock.lieu_id) > 0,
        items: [],
        quantity: 0,
      };

      current.items.push(stock);
      current.quantity += Number(stock.qte ?? 0);
      groups.set(key, current);
    }

    return [...groups.values()].sort((a, b) => {
      if (a.referenced !== b.referenced) return a.referenced ? -1 : 1;
      return a.label.localeCompare(b.label, 'fr');
    });
  }

  get locationFilterOptions(): Array<{ key: string; label: string }> {
    const groups = new Map<string, string>();

    for (const stock of this.stocks) {
      groups.set(this.getLocationKey(stock), this.getLieuLabel(stock));
    }

    return [...groups.entries()]
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  }

  get totalQuantity(): number {
    return this.stocks.reduce((sum, stock) => sum + Number(stock.qte ?? 0), 0);
  }

  get totalValue(): number {
    return this.stocks.reduce(
      (sum, stock) => sum + Number(stock.qte ?? 0) * Number(stock.valeur_achat ?? 0),
      0,
    );
  }

  get existingTypes(): string[] {
    return [...new Set(
      this.stocks
        .map((stock) => String(stock.type_stock ?? '').trim())
        .filter(Boolean),
    )].sort((a, b) => a.localeCompare(b, 'fr'));
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = '';

    try {
      const saisonId = Number(this.store.saison_consultation_id() ?? 0) || undefined;
      const [stocks, lieux, flux] = await Promise.all([
        this.stockApi.list(),
        this.lieuApi.list(),
        this.fluxApi.list(saisonId, true),
      ]);

      this.stocks = [...(stocks ?? [])].sort((a, b) =>
        String(a.libelle ?? '').localeCompare(String(b.libelle ?? ''), 'fr'),
      );
      this.lieux = [...(lieux ?? [])].sort((a, b) =>
        String(a.nom ?? '').localeCompare(String(b.nom ?? ''), 'fr'),
      );
      this.flux = [...(flux ?? [])].sort((a, b) =>
        String(b.date ?? '').localeCompare(String(a.date ?? '')),
      );

      if (
        this.locationFilter !== 'ALL' &&
        !this.locationFilterOptions.some((option) => option.key === this.locationFilter)
      ) {
        this.locationFilter = 'ALL';
      }
    } catch (error) {
      console.error('Chargement du stock impossible', error);
      this.error = 'Impossible de charger le stock.';
    } finally {
      this.loading = false;
    }
  }

  openCreate(): void {
    this.editingId = null;
    this.draft = this.emptyDraft();
    this.message = '';
    this.error = '';
    this.editorOpen = true;
  }

  openEdit(stock: Stock): void {
    this.editingId = stock.id;
    this.draft = {
      qte: Number(stock.qte ?? 0),
      lieu_id: stock.lieu_id ?? null,
      lieu_stockage: stock.lieu_stockage ?? '',
      type_stock_id: stock.type_stock_id ?? null,
      type_stock: stock.type_stock ?? '',
      valeur_achat: stock.valeur_achat ?? null,
      date_achat: stock.date_achat ?? null,
      flux_financier_id: stock.flux_financier_id ?? null,
      libelle: stock.libelle ?? '',
      info: stock.info ?? '',
    };
    this.message = '';
    this.error = '';
    this.editorOpen = true;
  }

  closeEditor(): void {
    if (this.saving) return;
    this.editorOpen = false;
    this.editingId = null;
  }

  onLieuChange(lieuId: number | null): void {
    this.draft.lieu_id = lieuId ? Number(lieuId) : null;
    const lieu = this.lieux.find((item) => Number(item.id) === Number(this.draft.lieu_id));
    if (lieu) this.draft.lieu_stockage = lieu.nom;
  }

  async save(): Promise<void> {
    this.error = '';
    this.message = '';

    const libelle = this.draft.libelle.trim();
    if (!libelle) {
      this.error = 'Le libellé du matériel est obligatoire.';
      return;
    }

    if (!Number.isFinite(Number(this.draft.qte)) || Number(this.draft.qte) < 0) {
      this.error = 'La quantité doit être un nombre positif ou nul.';
      return;
    }

    const payload: CreateStockDto = {
      qte: Number(this.draft.qte),
      lieu_id: this.draft.lieu_id || null,
      lieu_stockage: this.draft.lieu_stockage.trim(),
      type_stock_id: this.draft.type_stock_id || null,
      type_stock: this.draft.type_stock.trim(),
      valeur_achat:
        this.draft.valeur_achat === null || this.draft.valeur_achat === undefined
          ? null
          : Number(this.draft.valeur_achat),
      date_achat: this.draft.date_achat || null,
      flux_financier_id: this.draft.flux_financier_id || null,
      libelle,
      info: this.draft.info.trim(),
    };

    this.saving = true;
    try {
      if (this.editingId) {
        await this.stockApi.update(this.editingId, payload as UpdateStockDto);
        this.message = 'Le matériel a été mis à jour.';
      } else {
        await this.stockApi.create(payload);
        this.message = 'Le matériel a été ajouté au stock.';
      }

      this.editorOpen = false;
      this.editingId = null;
      await this.load();
    } catch (error) {
      console.error('Enregistrement du stock impossible', error);
      this.error = "Impossible d'enregistrer le matériel.";
    } finally {
      this.saving = false;
    }
  }

  async remove(stock: Stock): Promise<void> {
    const confirmed = window.confirm(
      `Supprimer « ${stock.libelle} » du stock ? Cette action est définitive.`,
    );
    if (!confirmed) return;

    this.error = '';
    this.message = '';
    try {
      await this.stockApi.remove(stock.id);
      this.message = 'Le matériel a été supprimé.';
      await this.load();
    } catch (error) {
      console.error('Suppression du stock impossible', error);
      this.error = 'Impossible de supprimer ce matériel.';
    }
  }

  getLieuLabel(stock: Stock): string {
    const lieu = this.lieux.find((item) => Number(item.id) === Number(stock.lieu_id));
    if (lieu?.nom) return lieu.nom;

    const legacy = String(stock.lieu_stockage ?? '').trim();
    return legacy || 'Sans lieu référencé';
  }

  getLocationKey(stock: Stock): string {
    const lieuId = Number(stock.lieu_id);
    if (Number.isFinite(lieuId) && lieuId > 0) return `LIEU:${lieuId}`;

    const legacy = String(stock.lieu_stockage ?? '').trim().toLowerCase();
    return legacy ? `LEGACY:${legacy}` : 'UNASSIGNED';
  }

  getFluxLabel(id: number): string {
    const item = this.flux.find((flux) => Number(flux.id) === Number(id));
    if (!item) return `Flux #${id}`;
    const montant = Number(item.montant ?? 0).toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    });
    return `${item.libelle} · ${montant}`;
  }

  formatMoney(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';
    return Number(value).toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    });
  }

  back(): void {
    void this.router.navigate(['/menu-admin']);
  }

  trackById(_index: number, item: Stock): number {
    return item.id;
  }

  trackByLocation(_index: number, group: StockLocationGroup): string {
    return group.key;
  }

  private emptyDraft(): StockDraft {
    return {
      qte: 1,
      lieu_id: null,
      lieu_stockage: '',
      type_stock_id: null,
      type_stock: '',
      valeur_achat: null,
      date_achat: null,
      flux_financier_id: null,
      libelle: '',
      info: '',
    };
  }
}
