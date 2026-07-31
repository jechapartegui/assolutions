import {
  computed,
  Injectable,
  signal,
} from '@angular/core';
import {
  Groupe,
  TarifInscription,
} from '@shared/index';

import { GroupeDataStore } from '../data-store/groupe-data.store';
import { TarifInscriptionDataStore } from '../data-store/tarif-inscription-data.store';
import {
  createInitialTarifInscriptionPageVm,
  TarifInscriptionPageVm,
} from '../vm/tarif-inscription-page.vm';

@Injectable({ providedIn: 'root' })
export class TarifInscriptionStore {
  private readonly state =
    signal<TarifInscriptionPageVm>(
      createInitialTarifInscriptionPageVm(),
    );

  readonly vm = computed(() => this.state());

  private initPromise: Promise<void> | null = null;

  constructor(
    private readonly tarifDataStore:
      TarifInscriptionDataStore,
    private readonly groupeDataStore:
      GroupeDataStore,
  ) {}

  async init(saisonId: number): Promise<void> {
    const normalizedSaisonId = Number(saisonId);
    const current = this.state();

    if (
      current.activeSaisonId === normalizedSaisonId
      && this.tarifDataStore.isFullLoadedFor(
        normalizedSaisonId,
      )
      && this.groupeDataStore.isFullLoadedFor(
        normalizedSaisonId,
      )
    ) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.reload(
      normalizedSaisonId,
    );

    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  async reload(
    saisonId =
      this.state().activeSaisonId ?? 0,
  ): Promise<void> {
    const normalizedSaisonId = Number(saisonId);

    if (!normalizedSaisonId) {
      return;
    }

    this.patch({
      loading: true,
      action: "Chargement des tarifs d'inscription",
    });

    try {
      const [tarifs, groupes] = await Promise.all([
        this.tarifDataStore.loadBySaison(
          normalizedSaisonId,
        ),
        this.groupeDataStore.loadBySaison(
          normalizedSaisonId,
        ),
      ]);

      const selectedStillExists = tarifs.some(
        (tarif) =>
          tarif.id === this.state().selectedTarifId,
      );

      this.state.set({
        ...this.state(),
        tarifs,
        groupes,
        activeSaisonId: normalizedSaisonId,
        selectedTarifId: selectedStillExists
          ? this.state().selectedTarifId
          : tarifs[0]?.id ?? null,
        editTarif: null,
        loading: false,
        action: '',
      });
    } catch (error) {
      this.patch({
        loading: false,
        action: '',
      });

      throw error instanceof Error
        ? error
        : new Error(
            "Chargement des tarifs d'inscription impossible",
          );
    }
  }

  patch(
    partial: Partial<TarifInscriptionPageVm>,
  ): void {
    this.state.update((vm) => ({
      ...vm,
      ...partial,
    }));
  }

  displayedTarifs(): TarifInscription[] {
    const vm = this.state();
    const filter =
      vm.filter.trim().toLocaleLowerCase('fr-FR');

    return vm.tarifs
      .filter(
        (tarif) =>
          vm.showInactive || tarif.actif,
      )
      .filter((tarif) => {
        if (!filter) {
          return true;
        }

        const groupeLabels = (tarif.groupe_ids ?? [])
          .map(
            (id) =>
              vm.groupes.find(
                (groupe) => groupe.id === id,
              )?.nom ?? '',
          )
          .join(' ');

        const searchable = [
          tarif.nom,
          groupeLabels,
          tarif.reinscription
            ? 'réinscription renouvellement'
            : 'nouvelle inscription général',
        ]
          .join(' ')
          .toLocaleLowerCase('fr-FR');

        return searchable.includes(filter);
      })
      .sort((a, b) => this.compareTarifs(a, b));
  }

  selectedTarif(): TarifInscription | null {
    const id = this.state().selectedTarifId;

    return this.state().tarifs.find(
      (tarif) => tarif.id === id,
    ) ?? null;
  }

  selectTarif(id: number): void {
    this.patch({
      selectedTarifId: Number(id),
      editTarif: null,
    });
  }

  startCreate(): void {
    const saisonId =
      this.state().activeSaisonId ?? 0;

    this.patch({
      selectedTarifId: null,
      editTarif: {
        id: 0,
        saison_id: saisonId,
        nom: '',
        prix_centimes: 0,
        date_debut_validite: null,
        date_fin_validite: null,
        reinscription: false,
        paiement_plusieurs_fois: 1,
        age_min: null,
        age_max: null,
        naissance_avant: null,
        naissance_apres: null,
        limit_nb: null,
        actif: true,
        ordre: 0,
        groupe_ids: [],
      },
    });
  }

  startEdit(tarif: TarifInscription): void {
    this.patch({
      selectedTarifId: tarif.id,
      editTarif: {
        ...tarif,
        groupe_ids: [...(tarif.groupe_ids ?? [])],
      },
    });
  }

  cancelEdit(): void {
    const current = this.state();

    this.patch({
      editTarif: null,
      selectedTarifId:
        current.selectedTarifId
        ?? current.tarifs[0]?.id
        ?? null,
    });
  }

  patchEdit(
    partial: Partial<TarifInscription>,
  ): void {
    const current = this.state().editTarif;

    if (!current) {
      return;
    }

    this.patch({
      editTarif: {
        ...current,
        ...partial,
      },
    });
  }

  setPriceEuros(value: string | number): void {
    const raw = String(value ?? '')
      .replace(/\s/g, '')
      .replace(',', '.');

    if (!raw) {
      this.patchEdit({ prix_centimes: 0 });
      return;
    }

    const euros = Number(raw);

    if (!Number.isFinite(euros)) {
      return;
    }

    this.patchEdit({
      prix_centimes:
        Math.max(0, Math.round(euros * 100)),
    });
  }

  toggleGroupe(groupeId: number): void {
    const current = this.state().editTarif;

    if (!current) {
      return;
    }

    const normalizedId = Number(groupeId);
    const ids = new Set(
      (current.groupe_ids ?? []).map(Number),
    );

    if (ids.has(normalizedId)) {
      ids.delete(normalizedId);
    } else {
      ids.add(normalizedId);
    }

    this.patchEdit({
      groupe_ids: Array.from(ids)
        .filter((id) => id > 0)
        .sort((a, b) => a - b),
    });
  }

  isGroupeSelected(groupeId: number): boolean {
    return (
      this.state().editTarif?.groupe_ids ?? []
    ).some((id) => Number(id) === Number(groupeId));
  }

  setFilter(value: string): void {
    this.patch({ filter: value ?? '' });
  }

  setShowInactive(value: boolean): void {
    this.patch({ showInactive: !!value });
  }

  async saveEdit(): Promise<void> {
    const current = this.state().editTarif;
    const saisonId =
      this.state().activeSaisonId ?? 0;

    if (!current || !saisonId) {
      return;
    }

    const normalized = this.normalizeTarif({
      ...current,
      saison_id: saisonId,
    });

    this.validateTarif(normalized);

    const duplicate = this.state().tarifs.some(
      (tarif) =>
        tarif.id !== normalized.id
        && tarif.nom
          .trim()
          .toLocaleLowerCase('fr-FR')
          === normalized.nom
            .trim()
            .toLocaleLowerCase('fr-FR'),
    );

    if (duplicate) {
      throw new Error(
        'Un tarif existe déjà avec ce nom pour cette saison',
      );
    }

    const wasExisting = normalized.id > 0;

    this.patch({
      loading: true,
      action: wasExisting
        ? "Mise à jour du tarif d'inscription"
        : "Création du tarif d'inscription",
    });

    try {
      const saved = wasExisting
        ? await this.tarifDataStore.update(normalized)
        : await this.tarifDataStore.create(normalized);

      const tarifs = wasExisting
        ? this.state().tarifs.map((tarif) =>
            tarif.id === saved.id ? saved : tarif,
          )
        : [...this.state().tarifs, saved];

      this.patch({
        tarifs: tarifs.sort(
          (a, b) => this.compareTarifs(a, b),
        ),
        selectedTarifId: saved.id,
        editTarif: null,
        loading: false,
        action: '',
      });
    } catch (error) {
      this.patch({
        loading: false,
        action: '',
      });

      throw error instanceof Error
        ? error
        : new Error(
            "Sauvegarde du tarif d'inscription impossible",
          );
    }
  }

  async deleteTarif(
    tarif: TarifInscription,
  ): Promise<void> {
    this.patch({
      loading: true,
      action: "Suppression du tarif d'inscription",
    });

    try {
      await this.tarifDataStore.remove(tarif.id);

      const tarifs = this.state().tarifs.filter(
        (item) => item.id !== tarif.id,
      );

      this.patch({
        tarifs,
        selectedTarifId:
          tarifs[0]?.id ?? null,
        editTarif: null,
        loading: false,
        action: '',
      });
    } catch (error) {
      this.patch({
        loading: false,
        action: '',
      });

      throw error instanceof Error
        ? error
        : new Error(
            "Suppression du tarif d'inscription impossible",
          );
    }
  }

  private normalizeTarif(
    tarif: TarifInscription,
  ): TarifInscription {
    return {
      ...tarif,
      nom: (tarif.nom ?? '').trim(),
      prix_centimes: Math.round(
        Number(tarif.prix_centimes ?? 0),
      ),
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
      groupe_ids: Array.from(
        new Set(
          (tarif.groupe_ids ?? [])
            .map(Number)
            .filter((id) => id > 0),
        ),
      ).sort((a, b) => a - b),
    };
  }

  private validateTarif(
    tarif: TarifInscription,
  ): void {
    if (!tarif.nom) {
      throw new Error(
        'Le nom du tarif est obligatoire',
      );
    }

    if (
      !Number.isInteger(tarif.prix_centimes)
      || tarif.prix_centimes < 0
    ) {
      throw new Error(
        'Le prix doit être un montant positif',
      );
    }

    if (
      !Number.isInteger(
        tarif.paiement_plusieurs_fois,
      )
      || tarif.paiement_plusieurs_fois < 1
      || tarif.paiement_plusieurs_fois > 12
    ) {
      throw new Error(
        "Le nombre maximal d'échéances doit être compris entre 1 et 12",
      );
    }

    if (!Number.isInteger(tarif.ordre)) {
      throw new Error(
        "L'ordre d'affichage doit être un entier",
      );
    }

    const fields = [
      {
        label: "L'âge minimum",
        value: tarif.age_min,
        minimum: 0,
      },
      {
        label: "L'âge maximum",
        value: tarif.age_max,
        minimum: 0,
      },
      {
        label: "L'année de naissance de début",
        value: tarif.naissance_avant,
        minimum: 0,
      },
      {
        label: "L'année de naissance de fin",
        value: tarif.naissance_apres,
        minimum: 0,
      },
      {
        label: 'La limite de souscriptions',
        value: tarif.limit_nb,
        minimum: 1,
      },
    ];

    for (const field of fields) {
      if (
        field.value !== null
        && field.value !== undefined
        && (
          !Number.isInteger(field.value)
          || field.value < field.minimum
        )
      ) {
        throw new Error(
          `${field.label} doit être un entier supérieur ou égal à ${field.minimum}`,
        );
      }
    }

    if (
      tarif.age_min != null
      && tarif.age_max != null
      && tarif.age_min > tarif.age_max
    ) {
      throw new Error(
        "L'âge minimum ne peut pas dépasser l'âge maximum",
      );
    }

    if (
      tarif.naissance_avant != null
      && tarif.naissance_apres != null
      && tarif.naissance_avant
        > tarif.naissance_apres
    ) {
      throw new Error(
        "L'année de naissance de début ne peut pas dépasser l'année de fin",
      );
    }

    if (
      tarif.date_debut_validite
      && tarif.date_fin_validite
      && tarif.date_debut_validite
        > tarif.date_fin_validite
    ) {
      throw new Error(
        'La date de début ne peut pas dépasser la date de fin',
      );
    }
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
