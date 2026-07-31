import { Injectable, computed, signal } from '@angular/core';
import { AdherentListItem_VM } from '../vm/adherent-page.vm';
import {
  createInitialGroupePageVm,
  GroupePageVm,
} from '../vm/groupe-page.vm';
import { GroupeRepository } from '../repository/groupe.repository';
import { GroupeDataStore } from '../data-store/groupe-data.store';
import { AdherentDataStore } from '../data-store/adherent-data.store';
import { Groupe, LienGroupe_VM } from '@shared/index';
import { AppStore } from '../app/app.store';

@Injectable({ providedIn: 'root' })
export class GroupeStore {
  /**
   * Store écran : sélection, édition, filtres, liste des adhérents affichables.
   * Les groupes eux-mêmes viennent de GroupeDataStore.
   */
  private readonly state = signal<GroupePageVm>(createInitialGroupePageVm());
  readonly vm = computed(() => this.state());

  private initPromise: Promise<void> | null = null;

  constructor(
    private readonly groupeDataStore: GroupeDataStore,
    private readonly adherentDataStore: AdherentDataStore,
    private readonly repository: GroupeRepository,
    private readonly appstore: AppStore,
  ) {}

  async init(saisonId: number): Promise<void> {
    const current = this.state();

    if (
      current.activeSaisonId === saisonId &&
      current.groupes.length > 0 &&
      current.adherents.length > 0 &&
      this.groupeDataStore.isFullLoadedFor(saisonId)
    ) {
      return;
    }

    if (this.initPromise) return this.initPromise;

    this.initPromise = this.reload(saisonId);
    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  async reload(saisonId = this.state().activeSaisonId): Promise<void> {
    if (!saisonId) return;

    this.patch({ loading: true, action: 'Chargement des groupes' });

    try {
      const [groupes, adherents] = await Promise.all([
        this.groupeDataStore.loadBySaison(saisonId),
        this.adherentDataStore.loadBySaison(saisonId),
      ]);

      const selectedStillExists = groupes.some(
        (g) => g.id === this.state().selectedGroupeId,
      );
      const selectedGroupeId = selectedStillExists
        ? this.state().selectedGroupeId
        : groupes[0]?.id ?? null;

      this.state.set({
        ...this.state(),
        groupes,
        adherents,
        activeSaisonId: saisonId,
        selectedGroupeId,
        loading: false,
        action: '',
      });
    } catch {
      this.patch({ loading: false, action: '' });
      throw new Error('Chargement des groupes impossible');
    }
  }

  patch(partial: Partial<GroupePageVm>): void {
    this.state.update((vm) => ({ ...vm, ...partial }));
  }

  selectGroupe(id: number): void {
    this.patch({
      selectedGroupeId: id,
      editGroupe: null,
      adherentToAddId: null,
    });
  }

  startCreate(): void {
    this.patch({
      // En création, aucun groupe existant ne doit paraître sélectionné.
      selectedGroupeId: null,
      adherentToAddId: null,
      editGroupe: {
        id: 0,
        saison_id: this.state().activeSaisonId ?? 0,
        project_id: this.appstore.selectedProjectId(),
        nom: '',
        whatsapp: null,
        visible: false,
        age_min: null,
        age_max: null,
        naissance_avant: null,
        naissance_apres: null,
        limit_nb: null,
      },
    });
  }

  startEdit(groupe: Groupe): void {
    this.patch({
      selectedGroupeId: groupe.id,
      editGroupe: {
        ...groupe,
        whatsapp: groupe.whatsapp ?? null,
        visible: groupe.visible ?? false,
        age_min: groupe.age_min ?? null,
        age_max: groupe.age_max ?? null,
        naissance_avant: groupe.naissance_avant ?? null,
        naissance_apres: groupe.naissance_apres ?? null,
        limit_nb: groupe.limit_nb ?? null,
      },
    });
  }

  cancelEdit(): void {
    const current = this.state();
    const selectedGroupeId =
      current.selectedGroupeId ?? current.groupes[0]?.id ?? null;

    this.patch({
      editGroupe: null,
      selectedGroupeId,
      adherentToAddId: null,
    });
  }

  patchEdit(partial: Partial<Groupe>): void {
    const current = this.state().editGroupe;
    if (!current) return;

    this.patch({ editGroupe: { ...current, ...partial } });
  }

  async saveEdit(): Promise<void> {
    const current = this.state().editGroupe;
    const saisonId = this.state().activeSaisonId ?? 0;
    if (!current || !saisonId) return;

    const nom = (current.nom ?? '').trim();
    if (!nom) throw new Error('Le nom du groupe est obligatoire');

    const duplicate = this.state().groupes.some(
      (g) =>
        g.id !== current.id &&
        g.nom.trim().toLowerCase() === nom.toLowerCase(),
    );
    if (duplicate) throw new Error('Un groupe existe déjà avec ce nom');

    const groupeToSave = this.normalizeGroupe({ ...current, nom });
    this.validateEligibilityCriteria(groupeToSave);

    this.patch({
      loading: true,
      action: current.id ? 'Mise à jour du groupe' : 'Création du groupe',
    });

    try {
      const wasExisting = !!current.id;
      const saved = wasExisting
        ? await this.groupeDataStore.update(groupeToSave, saisonId)
        : await this.groupeDataStore.create(groupeToSave, saisonId);

      if (wasExisting) {
        this.adherentDataStore.updateGroupeNameLocal(saved.id, saved.nom);
      }

      const groupes = wasExisting
        ? this.state().groupes.map((g) => (g.id === saved.id ? saved : g))
        : [...this.state().groupes, saved];

      this.patch({
        groupes: this.sortGroupes(groupes),
        selectedGroupeId: saved.id,
        editGroupe: null,
        loading: false,
        action: '',
      });
    } catch (e) {
      this.patch({ loading: false, action: '' });
      throw e instanceof Error
        ? e
        : new Error('Sauvegarde du groupe impossible');
    }
  }

  async deleteGroupe(groupe: Groupe): Promise<void> {
    this.patch({ loading: true, action: 'Suppression du groupe' });

    try {
      // La suppression écran garde la logique actuelle : suppression des liens visibles puis suppression du groupe.
      await this.repository.deleteGroupe(groupe.id, this.state().adherents);
      this.groupeDataStore.removeLocal(groupe.id);
      this.adherentDataStore.removeGroupeFromAllLocal(groupe.id);

      const groupes = this.state().groupes.filter((g) => g.id !== groupe.id);
      const adherents = this.state().adherents.map((a) =>
        this.withoutGroupe(a, groupe.id),
      );

      this.patch({
        groupes,
        adherents,
        selectedGroupeId: groupes[0]?.id ?? null,
        editGroupe: null,
        loading: false,
        action: '',
      });
    } catch {
      this.patch({ loading: false, action: '' });
      throw new Error('Suppression du groupe impossible');
    }
  }

  async addSelectedAdherentToSelectedGroupe(): Promise<void> {
    const adherentId = this.state().adherentToAddId;
    const groupe = this.selectedGroupe();
    if (!adherentId || !groupe) return;

    const adherent = this.state().adherents.find((a) => a.id === adherentId);
    if (!adherent) return;

    if (this.isAdherentInGroupe(adherent, groupe.id)) {
      throw new Error('Cet adhérent est déjà dans le groupe');
    }

    this.patch({ loading: true, action: 'Ajout de l’adhérent au groupe' });

    try {
      const lienId = await this.repository.addAdherentToGroupe(
        adherent.id,
        groupe.id,
      );

      const adherents = this.state().adherents.map((a) => {
        if (a.id !== adherent.id) return a;
        return {
          ...a,
          groupesActifs: [
            ...(a.groupesActifs ?? []),
            {
              id: groupe.id,
              groupe_id: groupe.id,
              nom: groupe.nom,
              id_lien: lienId ?? 0,
            } as LienGroupe_VM,
          ],
        } as AdherentListItem_VM;
      });

      this.adherentDataStore.addGroupeLocal(adherent.id, groupe);
      this.patch({
        adherents,
        adherentToAddId: null,
        loading: false,
        action: '',
      });
    } catch {
      this.patch({ loading: false, action: '' });
      throw new Error('Ajout de l’adhérent au groupe impossible');
    }
  }

  async removeAdherentFromSelectedGroupe(
    adherent: AdherentListItem_VM,
  ): Promise<void> {
    const groupe = this.selectedGroupe();
    if (!groupe) return;

    this.patch({
      loading: true,
      action: 'Suppression de l’adhérent du groupe',
    });

    try {
      await this.repository.removeAdherentFromGroupe(adherent, groupe.id);

      const adherents = this.state().adherents.map((a) =>
        a.id === adherent.id ? this.withoutGroupe(a, groupe.id) : a,
      );

      this.adherentDataStore.removeGroupeLocal(adherent.id, groupe.id);
      this.patch({ adherents, loading: false, action: '' });
    } catch {
      this.patch({ loading: false, action: '' });
      throw new Error('Suppression de l’adhérent du groupe impossible');
    }
  }

  selectedGroupe(): Groupe | null {
    const id = this.state().selectedGroupeId;
    return this.state().groupes.find((g) => g.id === id) ?? null;
  }

  membersOfSelectedGroupe(): AdherentListItem_VM[] {
    const groupe = this.selectedGroupe();
    if (!groupe) return [];
    return this.state().adherents.filter((a) =>
      this.isAdherentInGroupe(a, groupe.id),
    );
  }

  availableAdherentsForSelectedGroupe(): AdherentListItem_VM[] {
    const groupe = this.selectedGroupe();
    const filter = this.state().filterAdherent.trim().toLowerCase();
    if (!groupe) return [];

    return this.state().adherents
      .filter((a) => !this.isAdherentInGroupe(a, groupe.id))
      .filter((a) => {
        const label = `${a.libelle ?? ''} ${a.prenom ?? ''} ${a.nom ?? ''} ${a.surnom ?? ''}`.toLowerCase();
        return !filter || label.includes(filter);
      })
      .sort((a, b) =>
        (a.libelle ?? '').localeCompare(b.libelle ?? '', 'fr', {
          sensitivity: 'base',
        }),
      );
  }

  isAdherentInGroupe(
    adherent: AdherentListItem_VM,
    groupeId: number,
  ): boolean {
    return (adherent.groupesActifs ?? []).some(
      (g: LienGroupe_VM) => g.id === Number(groupeId),
    );
  }

  countMembers(groupeId: number): number {
    return this.state().adherents.filter((a) =>
      this.isAdherentInGroupe(a, groupeId),
    ).length;
  }

  setFilterAdherent(value: string): void {
    this.patch({ filterAdherent: value ?? '' });
  }

  setAdherentToAddId(value: number | null): void {
    this.patch({ adherentToAddId: value });
  }

  private normalizeGroupe(groupe: Groupe): Groupe {
    return {
      ...groupe,
      nom: (groupe.nom ?? '').trim(),
      whatsapp: (groupe.whatsapp ?? '').trim() || null,
      visible: !!groupe.visible,
      age_min: this.normalizeOptionalInteger(groupe.age_min),
      age_max: this.normalizeOptionalInteger(groupe.age_max),
      naissance_avant: this.normalizeOptionalInteger(groupe.naissance_avant),
      naissance_apres: this.normalizeOptionalInteger(groupe.naissance_apres),
      limit_nb: this.normalizeOptionalInteger(groupe.limit_nb),
    };
  }

  private normalizeOptionalInteger(
    value: number | string | null | undefined,
  ): number | null {
    if (value === null || value === undefined || value === '') return null;

    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : null;
  }

  private validateEligibilityCriteria(groupe: Groupe): void {
    const integerFields: Array<{
      label: string;
      value: number | null | undefined;
    }> = [
      { label: 'L’âge minimum', value: groupe.age_min },
      { label: 'L’âge maximum', value: groupe.age_max },
      { label: 'L’année minimale', value: groupe.naissance_avant },
      { label: 'L’année maximale', value: groupe.naissance_apres },
      { label: 'La limite de places', value: groupe.limit_nb },
    ];

    for (const field of integerFields) {
      if (field.value != null && !Number.isInteger(field.value)) {
        throw new Error(`${field.label} doit être un nombre entier`);
      }
    }

    if (groupe.age_min != null && groupe.age_min < 0) {
      throw new Error('L’âge minimum ne peut pas être négatif');
    }

    if (groupe.age_max != null && groupe.age_max < 0) {
      throw new Error('L’âge maximum ne peut pas être négatif');
    }

    if (
      groupe.age_min != null &&
      groupe.age_max != null &&
      groupe.age_min > groupe.age_max
    ) {
      throw new Error("L’âge minimum ne peut pas dépasser l’âge maximum");
    }

    if (groupe.naissance_avant != null && groupe.naissance_avant < 0) {
      throw new Error("L’année minimale ne peut pas être négative");
    }

    if (groupe.naissance_apres != null && groupe.naissance_apres < 0) {
      throw new Error("L’année maximale ne peut pas être négative");
    }

    if (
      groupe.naissance_avant != null &&
      groupe.naissance_apres != null &&
      groupe.naissance_avant > groupe.naissance_apres
    ) {
      throw new Error(
        "L’année minimale ne peut pas dépasser l’année maximale",
      );
    }

    if (groupe.limit_nb != null && groupe.limit_nb < 1) {
      throw new Error('La limite de places doit être supérieure à zéro');
    }
  }

  private withoutGroupe(
    adherent: AdherentListItem_VM,
    groupeId: number,
  ): AdherentListItem_VM {
    return {
      ...adherent,
      groupesActifs: (adherent.groupesActifs ?? []).filter(
        (g: LienGroupe_VM) => g.id !== Number(groupeId),
      ),
    } as AdherentListItem_VM;
  }

  private sortGroupes(groupes: Groupe[]): Groupe[] {
    return [...(groupes ?? [])].sort((a, b) =>
      (a.nom ?? '').localeCompare(b.nom ?? '', 'fr', {
        sensitivity: 'base',
      }),
    );
  }
}
