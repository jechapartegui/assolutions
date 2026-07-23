import { computed, Injectable, signal } from '@angular/core';
import {
  CreateProfesseurDto,
  Professeur,
  UpdateProfesseurDto,
} from '@shared/lib/professeur.interface';
import { PersonneLight_VM } from '@shared/lib/personne.interface';
import { ProfesseurApiService } from '../services/professeur-api.service';
import { PersonneApiService } from '../services/personne-api.service';

interface ProfesseurDataState {
  /** true quand la liste complète des professeurs du projet a été chargée. */
  fullLoaded: boolean;
  loading: boolean;
  error: string | null;
  lastLoadedAt: number | null;
}

@Injectable({ providedIn: 'root' })
export class ProfesseurDataStore {
  private readonly entitiesSig = signal<Record<number, Professeur>>({});
  private readonly personnesByIdSig = signal<Record<number, PersonneLight_VM>>({});

  private readonly stateSig = signal<ProfesseurDataState>({
    fullLoaded: false,
    loading: false,
    error: null,
    lastLoadedAt: null,
  });

  readonly entities = this.entitiesSig.asReadonly();
  readonly personnesById = this.personnesByIdSig.asReadonly();
  readonly state = this.stateSig.asReadonly();

  readonly loading = computed(() => this.stateSig().loading);
  readonly error = computed(() => this.stateSig().error);
  readonly fullLoaded = computed(() => this.stateSig().fullLoaded);
  readonly lastLoadedAt = computed(() => this.stateSig().lastLoadedAt);

  readonly list = computed(() =>
    Object.values(this.entitiesSig()).sort((a, b) =>
      this.getLibelle(a).localeCompare(this.getLibelle(b), 'fr', { sensitivity: 'base' }),
    ),
  );

  private loadPromise: Promise<Professeur[]> | null = null;

  constructor(
    private readonly professeurApi: ProfesseurApiService,
    private readonly personneApi: PersonneApiService,
  ) {}

  byId(id: number): Professeur | null {
    return this.entitiesSig()[Number(id)] ?? null;
  }

  has(id: number): boolean {
    return !!this.byId(id);
  }

  personneById(id: number): PersonneLight_VM | null {
    return this.personnesByIdSig()[Number(id)] ?? null;
  }

  personneIdOf(prof: Professeur | null | undefined): number | null {
    const raw = prof as any;
    const value =
      raw?.personne_id ??
      raw?.personneId ??
      raw?.personne?.id ??
      raw?.personne?.personne_id ??
      raw?.id;

    const normalized = Number(value);
    return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
  }

  getLibelle(prof: Professeur | null | undefined): string {
    if (!prof) return '';

    const personneId = this.personneIdOf(prof);
    const raw = prof as any;
    const personne = personneId ? this.personnesByIdSig()[personneId] : null;

    const label = [
      personne?.prenom ?? raw?.prenom,
      personne?.nom ?? raw?.nom,
      personne?.surnom ?? raw?.surnom,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    return label || `Professeur #${prof.id}`;
  }

  /**
   * Chargement complet des professeurs.
   * Professeur n'est pas lié à une saison : les contrats profs le sont, pas la fiche professeur.
   */
  async loadAll(options: { force?: boolean } = {}): Promise<Professeur[]> {
    if (!options.force && this.stateSig().fullLoaded) {
      return this.list();
    }

    if (this.loadPromise && !options.force) {
      return this.loadPromise;
    }

    this.loadPromise = this.doLoadAll();

    try {
      return await this.loadPromise;
    } finally {
      this.loadPromise = null;
    }
  }

  async refresh(): Promise<Professeur[]> {
    return this.loadAll({ force: true });
  }

  async getOrLoad(id: number, options: { force?: boolean } = {}): Promise<Professeur> {
    const normalizedId = Number(id);
    const cached = this.byId(normalizedId);
    if (cached && !options.force) return cached;

    this.setLoading(true);
    try {
      const prof = await this.professeurApi.get(normalizedId);
      this.upsertOne(prof);
      await this.loadPersonnesForProfs([prof]);
      return prof;
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  async create(dto: CreateProfesseurDto): Promise<Professeur> {
    this.setLoading(true);
    try {
      const created = await this.professeurApi.create(dto);
      this.upsertOne(created);
      await this.loadPersonnesForProfs([created]);
      return created;
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  async update(id: number, dto: UpdateProfesseurDto): Promise<Professeur> {
    this.setLoading(true);
    try {
      const updated = await this.professeurApi.update(Number(id), dto);
      this.upsertOne(updated);
      await this.loadPersonnesForProfs([updated]);
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
    this.setLoading(true);
    try {
      await this.professeurApi.remove(normalizedId);
      this.removeLocal(normalizedId);
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  upsertOne(prof: Professeur): void {
    if (!prof?.id) return;

    this.entitiesSig.update((entities) => ({
      ...entities,
      [Number(prof.id)]: prof,
    }));

    this.stateSig.update((s) => ({
      ...s,
      error: null,
      lastLoadedAt: Date.now(),
    }));
  }

  upsertMany(profs: Professeur[]): void {
    const next = { ...this.entitiesSig() };

    for (const prof of profs ?? []) {
      if (!prof?.id) continue;
      next[Number(prof.id)] = prof;
    }

    this.entitiesSig.set(next);
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
    this.stateSig.set({
      fullLoaded: false,
      loading: false,
      error: null,
      lastLoadedAt: null,
    });
    this.loadPromise = null;
  }

  /** Marque la liste complète comme périmée sans vider les données visibles. */
  invalidateFull(): void {
    this.stateSig.update((s) => ({ ...s, fullLoaded: false }));
  }

  private async doLoadAll(): Promise<Professeur[]> {
    this.setLoading(true);
    try {
      const profs = await this.professeurApi.list();
      this.replaceAll(profs);
      await this.loadPersonnesForProfs(profs);
      return this.list();
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  private replaceAll(profs: Professeur[]): void {
    const next: Record<number, Professeur> = {};

    for (const prof of profs ?? []) {
      if (!prof?.id) continue;
      next[Number(prof.id)] = prof;
    }

    this.entitiesSig.set(next);
    this.stateSig.update((s) => ({
      ...s,
      fullLoaded: true,
      error: null,
      lastLoadedAt: Date.now(),
    }));
  }

  private async loadPersonnesForProfs(profs: Professeur[]): Promise<void> {
    const ids = [
      ...new Set(
        (profs ?? [])
          .map((prof) => this.personneIdOf(prof))
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

  private setLoading(loading: boolean): void {
    this.stateSig.update((s) => ({ ...s, loading }));
  }

  private setError(e: unknown): void {
    const message = e instanceof Error ? e.message : 'Erreur lors du chargement des professeurs';
    this.stateSig.update((s) => ({ ...s, error: message }));
  }
}
