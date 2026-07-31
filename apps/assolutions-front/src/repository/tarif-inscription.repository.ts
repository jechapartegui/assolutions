import { Injectable } from '@angular/core';
import {
  CreateTarifInscriptionDto,
  TarifInscription,
  UpdateTarifInscriptionDto,
} from '@shared/index';

import { TarifInscriptionApiService } from '../services/tarif-inscription-api.service';

@Injectable({ providedIn: 'root' })
export class TarifInscriptionRepository {
  constructor(
    private readonly api: TarifInscriptionApiService,
  ) {}

  async loadBySaison(
    saisonId: number,
  ): Promise<TarifInscription[]> {
    const items = await this.api.list(Number(saisonId));

    return (items ?? [])
      .map((item) => this.toTarif(item, Number(saisonId)))
      .sort((a, b) => this.compareTarifs(a, b));
  }

  async loadById(id: number): Promise<TarifInscription> {
    const item = await this.api.get(Number(id));
    return this.toTarif(item, Number(item.saison_id));
  }

  async create(
    tarif: TarifInscription,
  ): Promise<TarifInscription> {
    const dto = this.toCreateDto(tarif);
    const created = await this.api.create(dto);

    return this.toTarif(created, dto.saison_id);
  }

  async update(
    tarif: TarifInscription,
  ): Promise<TarifInscription> {
    const dto = this.toUpdateDto(tarif);
    const updated = await this.api.update(
      Number(tarif.id),
      dto,
    );

    return this.toTarif(updated, Number(tarif.saison_id));
  }

  async remove(id: number): Promise<void> {
    await this.api.remove(Number(id));
  }

  private toCreateDto(
    tarif: TarifInscription,
  ): CreateTarifInscriptionDto {
    return {
      saison_id: Number(tarif.saison_id),
      nom: (tarif.nom ?? '').trim(),
      prix_centimes: Number(tarif.prix_centimes ?? 0),
      date_debut_validite:
        this.normalizeOptionalDate(
          tarif.date_debut_validite,
        ),
      date_fin_validite:
        this.normalizeOptionalDate(
          tarif.date_fin_validite,
        ),
      reinscription: !!tarif.reinscription,
      paiement_plusieurs_fois: Number(
        tarif.paiement_plusieurs_fois ?? 1,
      ),
      age_min: this.normalizeOptionalInteger(
        tarif.age_min,
      ),
      age_max: this.normalizeOptionalInteger(
        tarif.age_max,
      ),
      naissance_avant:
        this.normalizeOptionalInteger(
          tarif.naissance_avant,
        ),
      naissance_apres:
        this.normalizeOptionalInteger(
          tarif.naissance_apres,
        ),
      limit_nb: this.normalizeOptionalInteger(
        tarif.limit_nb,
      ),
      actif: !!tarif.actif,
      ordre: Number(tarif.ordre ?? 0),
      groupe_ids: this.normalizeGroupIds(
        tarif.groupe_ids,
      ),
    };
  }

  private toUpdateDto(
    tarif: TarifInscription,
  ): UpdateTarifInscriptionDto {
    return this.toCreateDto(tarif);
  }

  private toTarif(
    raw: TarifInscription | Record<string, unknown>,
    saisonId: number,
  ): TarifInscription {
    const source = raw as TarifInscription;

    return {
      id: Number(source.id),
      saison_id: Number(source.saison_id ?? saisonId),
      nom: source.nom ?? '',
      prix_centimes: Number(source.prix_centimes ?? 0),
      date_debut_validite:
        this.normalizeOptionalDate(
          source.date_debut_validite,
        ),
      date_fin_validite:
        this.normalizeOptionalDate(
          source.date_fin_validite,
        ),
      reinscription: !!source.reinscription,
      paiement_plusieurs_fois: Number(
        source.paiement_plusieurs_fois ?? 1,
      ),
      age_min: this.normalizeOptionalInteger(
        source.age_min,
      ),
      age_max: this.normalizeOptionalInteger(
        source.age_max,
      ),
      naissance_avant:
        this.normalizeOptionalInteger(
          source.naissance_avant,
        ),
      naissance_apres:
        this.normalizeOptionalInteger(
          source.naissance_apres,
        ),
      limit_nb: this.normalizeOptionalInteger(
        source.limit_nb,
      ),
      actif: source.actif !== false,
      ordre: Number(source.ordre ?? 0),
      groupe_ids: this.normalizeGroupIds(
        source.groupe_ids,
      ),
      date_creation: source.date_creation,
      date_maj: source.date_maj,
    };
  }

  private normalizeOptionalInteger(
    value: number | string | null | undefined,
  ): number | null {
    if (
      value === null
      || value === undefined
      || value === ''
    ) {
      return null;
    }

    const normalized = Number(value);
    return Number.isFinite(normalized)
      ? normalized
      : null;
  }

  private normalizeOptionalDate(
    value: string | Date | null | undefined,
  ): string | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }

    const normalized = String(value).trim();
    return normalized
      ? normalized.slice(0, 10)
      : null;
  }

  private normalizeGroupIds(
    values: number[] | null | undefined,
  ): number[] {
    return Array.from(
      new Set(
        (values ?? [])
          .map((value) => Number(value))
          .filter(
            (value) =>
              Number.isInteger(value) && value > 0,
          ),
      ),
    ).sort((a, b) => a - b);
  }

  private compareTarifs(
    a: TarifInscription,
    b: TarifInscription,
  ): number {
    const order =
      Number(a.ordre ?? 0) - Number(b.ordre ?? 0);

    if (order !== 0) {
      return order;
    }

    return (a.nom ?? '').localeCompare(
      b.nom ?? '',
      'fr',
      { sensitivity: 'base' },
    );
  }
}
