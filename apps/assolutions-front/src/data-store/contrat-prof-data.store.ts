import { computed, Injectable, signal } from '@angular/core';
import {
  ContratProf,
  CreateContratProfDto,
  UpdateContratProfDto,
} from '@shared/lib/contrat-prof.interface';
import { PersonneLight_VM, ProfLight_VM } from '@shared/lib/personne.interface';
import { ContratProfApiService } from '../services/contrat-prof-api.service';
import { PersonneApiService } from '../services/personne-api.service';

interface ContratProfDataState {
  /** Saison actuellement représentée dans le store. */
  activeSaisonId: number | null;
  fullLoaded: boolean;
  loading: boolean;
  error: string | null;
  lastLoadedAt: number | null;
}

@Injectable({ providedIn: 'root' })
export class ContratProfDataStore {
  private readonly entitiesSig = signal<Record<number, ContratProf>>({});
  private readonly personnesByIdSig = signal<Record<number, PersonneLight_VM>>({});
  private readonly existsByProfIdSig = signal<Record<number, boolean>>({});

  private readonly stateSig = signal<ContratProfDataState>({
    activeSaisonId: null,
    fullLoaded: false,
    loading: false,
    error: null,
    lastLoadedAt: null,
  });

  readonly entities = this.entitiesSig.asReadonly();
  readonly personnesById = this.personnesByIdSig.asReadonly();
  readonly existsByProfId = this.existsByProfIdSig.asReadonly();
  readonly state = this.stateSig.asReadonly();

  readonly activeSaisonId = computed(() => this.stateSig().activeSaisonId);
  readonly loading = computed(() => this.stateSig().loading);
  readonly error = computed(() => this.stateSig().error);
  readonly fullLoaded = computed(() => this.stateSig().fullLoaded);
  readonly lastLoadedAt = computed(() => this.stateSig().lastLoadedAt);

  readonly list = computed(() =>
    Object.values(this.entitiesSig()).sort((a, b) => {
      const da = String((a as any).date_debut ?? (a as any).debut ?? '');
      const db = String((b as any).date_debut ?? (b as any).debut ?? '');
      return da.localeCompare(db);
    }),
  );

  /**
   * Liste prête pour les écrans qui sélectionnent un professeur par contrat.
   * C'est l'équivalent cible de l'ancien RefDataRepository.getProfs(projectId, saisonId).
   */
  readonly profLights = computed(() => this.list().map((contrat) => this.toProfLight(contrat)));

  private loadPromise: Promise<ContratProf[]> | null = null;
  private loadPromiseSaisonId: number | null = null;

  constructor(
    private readonly contratProfApi: ContratProfApiService,
    private readonly personneApi: PersonneApiService,
  ) {}

  byId(id: number): ContratProf | null {
    return this.entitiesSig()[Number(id)] ?? null;
  }

  has(id: number): boolean {
    return !!this.byId(id);
  }

  isFullLoadedFor(saisonId: number): boolean {
    const state = this.stateSig();
    return state.activeSaisonId === Number(saisonId) && state.fullLoaded;
  }

  async loadBySaison(saisonId: number, options: { force?: boolean } = {}): Promise<ContratProf[]> {
    const normalizedSaisonId = Number(saisonId);
    if (!normalizedSaisonId) return [];

    if (!options.force && this.isFullLoadedFor(normalizedSaisonId)) {
      return this.list();
    }

    if (
      this.loadPromise &&
      !options.force &&
      this.loadPromiseSaisonId === normalizedSaisonId
    ) {
      return this.loadPromise;
    }

    this.loadPromiseSaisonId = normalizedSaisonId;
    this.loadPromise = this.doLoadBySaison(normalizedSaisonId);

    try {
      return await this.loadPromise;
    } finally {
      this.loadPromise = null;
      this.loadPromiseSaisonId = null;
    }
  }

  async refresh(saisonId = this.stateSig().activeSaisonId ?? 0): Promise<ContratProf[]> {
    return this.loadBySaison(saisonId, { force: true });
  }

  async loadProfLightsBySaison(saisonId: number, options: { force?: boolean } = {}): Promise<ProfLight_VM[]> {
    await this.loadBySaison(saisonId, options);
    return this.profLights();
  }

  async getOrLoad(id: number, options: { force?: boolean } = {}): Promise<ContratProf> {
    const normalizedId = Number(id);
    const cached = this.byId(normalizedId);
    if (cached && !options.force) return cached;

    this.setLoading(true);
    try {
      const contrat = await this.contratProfApi.get(normalizedId);
      this.upsertOne(contrat, this.saisonIdOf(contrat));
      await this.loadPersonnesForContrats([contrat]);
      return contrat;
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  async create(dto: CreateContratProfDto): Promise<ContratProf> {
    this.setLoading(true);
    try {
      const created = await this.contratProfApi.create(dto);
      this.upsertOne(created, this.saisonIdOf(created));
      await this.loadPersonnesForContrats([created]);
      this.invalidateExistFor(this.professeurIdOf(created));
      return created;
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  async update(id: number, dto: UpdateContratProfDto): Promise<ContratProf> {
    this.setLoading(true);
    try {
      const updated = await this.contratProfApi.update(Number(id), dto);
      this.upsertOne(updated, this.saisonIdOf(updated));
      await this.loadPersonnesForContrats([updated]);
      this.invalidateExistFor(this.professeurIdOf(updated));
      return updated;
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  async delete(id: number): Promise<void> {
    const normalizedId = Number(id);
    const existing = this.byId(normalizedId);

    this.setLoading(true);
    try {
      await this.contratProfApi.remove(normalizedId);
      this.removeLocal(normalizedId);
      this.invalidateExistFor(this.professeurIdOf(existing));
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  async exists(profId: number, options: { force?: boolean } = {}): Promise<boolean> {
    const normalizedProfId = Number(profId);
    if (!normalizedProfId) return false;

    const cached = this.existsByProfIdSig()[normalizedProfId];
    if (cached !== undefined && !options.force) return cached;

    const exists = await this.contratProfApi.exist(normalizedProfId);
    this.existsByProfIdSig.update((current) => ({
      ...current,
      [normalizedProfId]: exists,
    }));
    return exists;
  }

  async loadExistsForProfIds(profIds: number[], options: { force?: boolean } = {}): Promise<Record<number, boolean>> {
    const ids = [
      ...new Set(
        (profIds ?? [])
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    ];

    if (!ids.length) return this.existsByProfIdSig();

    await Promise.all(ids.map((id) => this.exists(id, options)));
    return this.existsByProfIdSig();
  }

  upsertOne(contrat: ContratProf, saisonId = this.stateSig().activeSaisonId): void {
    const contratId = this.contratIdOf(contrat);
    if (!contratId) return;

    const normalizedSaisonId = saisonId ? Number(saisonId) : null;

    if (normalizedSaisonId && this.stateSig().activeSaisonId !== normalizedSaisonId) {
      this.entitiesSig.set({});
      this.stateSig.update((s) => ({
        ...s,
        activeSaisonId: normalizedSaisonId,
        fullLoaded: false,
      }));
    }

    this.entitiesSig.update((entities) => ({
      ...entities,
      [contratId]: contrat,
    }));

    this.stateSig.update((s) => ({
      ...s,
      error: null,
      lastLoadedAt: Date.now(),
    }));
  }

  removeLocal(id: number): void {
    const { [Number(id)]: _, ...rest } = this.entitiesSig();
    this.entitiesSig.set(rest);
    this.stateSig.update((s) => ({ ...s, error: null, lastLoadedAt: Date.now() }));
  }

  clear(): void {
    this.entitiesSig.set({});
    this.personnesByIdSig.set({});
    this.existsByProfIdSig.set({});
    this.stateSig.set({
      activeSaisonId: null,
      fullLoaded: false,
      loading: false,
      error: null,
      lastLoadedAt: null,
    });
    this.loadPromise = null;
    this.loadPromiseSaisonId = null;
  }

  invalidateFull(): void {
    this.stateSig.update((s) => ({ ...s, fullLoaded: false }));
  }

  invalidateExistFor(profId: number | null | undefined): void {
    const normalizedProfId = Number(profId);
    if (!normalizedProfId) return;

    const { [normalizedProfId]: _, ...rest } = this.existsByProfIdSig();
    this.existsByProfIdSig.set(rest);
  }

  private async doLoadBySaison(saisonId: number): Promise<ContratProf[]> {
    this.setLoading(true);
    this.stateSig.update((s) => ({ ...s, activeSaisonId: saisonId }));

    try {
      const contrats = await this.contratProfApi.list(saisonId);
      this.replaceAll(contrats, saisonId);
      await this.loadPersonnesForContrats(contrats);
      return this.list();
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  private replaceAll(contrats: ContratProf[], saisonId: number): void {
    const next: Record<number, ContratProf> = {};

    for (const contrat of contrats ?? []) {
      const id = this.contratIdOf(contrat);
      if (!id) continue;
      next[id] = contrat;
    }

    this.entitiesSig.set(next);
    this.stateSig.update((s) => ({
      ...s,
      activeSaisonId: saisonId,
      fullLoaded: true,
      error: null,
      lastLoadedAt: Date.now(),
    }));
  }

  private async loadPersonnesForContrats(contrats: ContratProf[]): Promise<void> {
    const embeddedPersonnes = (contrats ?? [])
      .map((contrat) => this.embeddedPersonneOf(contrat))
      .filter((p): p is PersonneLight_VM => !!p?.id);

    if (embeddedPersonnes.length) {
      this.personnesByIdSig.update((current) => ({
        ...current,
        ...Object.fromEntries(embeddedPersonnes.map((p) => [p.id, p])),
      }));
    }

    const ids = [
      ...new Set(
        (contrats ?? [])
          .map((contrat) => this.personneIdOfContrat(contrat))
          .filter((id): id is number => !!id),
      ),
    ].filter((id) => !this.personnesByIdSig()[id]);

    if (!ids.length) return;

    const personnes = await this.personneApi.list_personnelight(ids, false);
    this.personnesByIdSig.update((current) => ({
      ...current,
      ...Object.fromEntries(personnes.map((p: PersonneLight_VM) => [p.id, p])),
    }));
  }

  private toProfLight(contrat: ContratProf): ProfLight_VM {
    const raw = contrat as any;
    const contratId = this.contratIdOf(contrat);
    const personneId = this.personneIdOfContrat(contrat);
    const personne =
      (personneId ? this.personnesByIdSig()[personneId] : null) ??
      this.embeddedPersonneOf(contrat) ??
      null;

    return {
      ...(personne ?? {}),
      id: personne?.id ?? personneId ?? this.professeurIdOf(contrat) ?? contratId,
      nom: personne?.nom ?? raw.nom ?? raw.professeur_nom ?? '',
      prenom: personne?.prenom ?? raw.prenom ?? raw.professeur_prenom ?? '',
      surnom: personne?.surnom ?? raw.surnom ?? '',
      contrat_id: contratId,
    } as ProfLight_VM;
  }

  private contratIdOf(contrat: ContratProf | null | undefined): number {
    const raw = contrat as any;
    const value = raw?.contrat_id ?? raw?.contratId ?? raw?.id;
    const normalized = Number(value);
    return Number.isFinite(normalized) && normalized > 0 ? normalized : 0;
  }

  private saisonIdOf(contrat: ContratProf | null | undefined): number | null {
    const raw = contrat as any;
    const value = raw?.saison_id ?? raw?.saisonId ?? raw?.saison?.id;
    const normalized = Number(value);
    return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
  }

  private professeurIdOf(contrat: ContratProf | null | undefined): number | null {
    const raw = contrat as any;
    const value =
      raw?.professeur_id ??
      raw?.professeurId ??
      raw?.professeur?.id ??
      raw?.prof_id ??
      raw?.profId;
    const normalized = Number(value);
    return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
  }

  private personneIdOfContrat(contrat: ContratProf | null | undefined): number | null {
    const raw = contrat as any;
    const value =
      raw?.personne_id ??
      raw?.personneId ??
      raw?.personne?.id ??
      raw?.professeur?.personne_id ??
      raw?.professeur?.personneId ??
      raw?.professeur?.personne?.id ??
      this.professeurIdOf(contrat);
    const normalized = Number(value);
    return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
  }

  private embeddedPersonneOf(contrat: ContratProf | null | undefined): PersonneLight_VM | null {
    const raw = contrat as any;
    const personne = raw?.personne ?? raw?.professeur?.personne ?? raw?.professeur;
    return personne?.id ? (personne as PersonneLight_VM) : null;
  }

  private setLoading(loading: boolean): void {
    this.stateSig.update((s) => ({ ...s, loading }));
  }

  private setError(e: unknown): void {
    const message = e instanceof Error ? e.message : 'Erreur lors du chargement des contrats professeurs';
    this.stateSig.update((s) => ({ ...s, error: message }));
  }
}
