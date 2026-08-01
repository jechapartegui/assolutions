import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CodePromo, SaveCodePromoDto, TarifInscription } from '@shared/index';

import { CodePromoApiService } from '../../services/code-promo-api.service';
import { ErrorService } from '../../services/error.service';
import { TarifInscriptionApiService } from '../../services/tarif-inscription-api.service';
import { AppStore } from '../app.store';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  selector: 'app-code-promo',
  templateUrl: './code-promo.component.html',
  styleUrls: ['./code-promo.component.css'],
})
export class CodePromoComponent implements OnInit {
  promos: CodePromo[] = [];
  tarifs: TarifInscription[] = [];
  edit: CodePromo | null = null;
  loading = false;

  constructor(
    private readonly api: CodePromoApiService,
    private readonly tarifApi: TarifInscriptionApiService,
    public readonly store: AppStore,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  startCreate(): void {
    this.edit = {
      id: 0,
      project_id: Number(this.store.selectedProjectId()),
      saison_id: this.saisonId,
      code: '',
      libelle: '',
      type_remise: 'POURCENTAGE',
      valeur: 10,
      montant_min_centimes: null,
      max_remise_centimes: null,
      date_debut: null,
      date_fin: null,
      limit_nb: null,
      actif: true,
      tarif_ids: [],
    };
  }

  startEdit(promo: CodePromo): void {
    this.edit = { ...promo, tarif_ids: [...promo.tarif_ids] };
  }

  toggleTarif(id: number): void {
    if (!this.edit) return;
    const ids = new Set(this.edit.tarif_ids);
    ids.has(id) ? ids.delete(id) : ids.add(id);
    this.edit.tarif_ids = Array.from(ids);
  }

  isTarifSelected(id: number): boolean {
    return !!this.edit?.tarif_ids.includes(id);
  }

  async save(): Promise<void> {
    if (!this.edit) return;
    const dto = this.toDto(this.edit);
    await this.run('Sauvegarde du code promotionnel', async () => {
      if (this.edit!.id) await this.api.update(this.edit!.id, dto);
      else await this.api.create(dto);
      this.edit = null;
      await this.loadData();
    });
  }

  async remove(promo: CodePromo): Promise<void> {
    if (!window.confirm(`Supprimer le code ${promo.code} ?`)) return;
    await this.run('Suppression du code promotionnel', async () => {
      await this.api.remove(promo.id);
      if (this.edit?.id === promo.id) this.edit = null;
      await this.loadData();
    });
  }

  displayValue(promo: CodePromo): string {
    return promo.type_remise === 'POURCENTAGE'
      ? `${promo.valeur} %`
      : `${(promo.valeur / 100).toFixed(2)} €`;
  }

  private get saisonId(): number {
    const stored = Number(localStorage.getItem('assolutions.consultationSaisonId'));
    return Number.isInteger(stored) && stored > 0
      ? stored
      : Number(this.store.saison_active_id());
  }

  private async load(): Promise<void> {
    await this.run('Chargement des codes promotionnels', () => this.loadData());
  }

  private async loadData(): Promise<void> {
    [this.promos, this.tarifs] = await Promise.all([
      this.api.list(this.saisonId),
      this.tarifApi.list(this.saisonId),
    ]);
  }

  private toDto(promo: CodePromo): SaveCodePromoDto {
    return {
      saison_id: this.saisonId,
      code: promo.code.trim().toUpperCase(),
      libelle: promo.libelle.trim(),
      type_remise: promo.type_remise,
      valeur: Number(promo.valeur),
      montant_min_centimes: promo.montant_min_centimes ?? null,
      max_remise_centimes: promo.max_remise_centimes ?? null,
      date_debut: promo.date_debut || null,
      date_fin: promo.date_fin || null,
      limit_nb: promo.limit_nb ?? null,
      actif: !!promo.actif,
      tarif_ids: [...promo.tarif_ids],
    };
  }

  private errorMessage(error: any): string {
    const value = error?.error?.message ?? error?.message ?? 'Une erreur est survenue';
    return Array.isArray(value) ? value.join(' · ') : String(value);
  }

  private async run(label: string, action: () => Promise<void>): Promise<void> {
    this.loading = true;
    try {
      await action();
    } catch (error) {
      ErrorService.instance.emitChange(
        ErrorService.instance.CreateError(label, this.errorMessage(error)),
      );
    } finally {
      this.loading = false;
    }
  }
}
