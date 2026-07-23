import { computed, inject, Injectable, signal } from '@angular/core';
import { Professeur } from '@shared/lib/professeur.interface';
import { ProfesseurDataStore } from '../data-store/professeur-data.store';
import { ContratProfDataStore } from '../data-store/contrat-prof-data.store';

interface ProfesseurPageState {
  selectedPersonneId: number | null;
  editing: Professeur | null;
  saving: boolean;
  action: string;
  lastLoadedAt: number | null;
}

@Injectable({ providedIn: 'root' })
export class ProfesseurStore {
  private readonly stateSig = signal<ProfesseurPageState>({
    selectedPersonneId: null,
    editing: null,
    saving: false,
    action: '',
    lastLoadedAt: null,
  });

  private readonly professeurDataStore = inject(ProfesseurDataStore);
  private readonly contratProfDataStore = inject(ContratProfDataStore);

  readonly vm = computed(() => this.stateSig());

  readonly profs = this.professeurDataStore.list;
  readonly personnesById = this.professeurDataStore.personnesById;
  readonly contratsExistByProfId = this.contratProfDataStore.existsByProfId;

  readonly loading = computed(
    () => this.professeurDataStore.loading() || this.contratProfDataStore.loading(),
  );
  readonly saving = computed(() => this.stateSig().saving);
  readonly editing = computed(() => this.stateSig().editing);
  readonly selectedPersonneId = computed(() => this.stateSig().selectedPersonneId);

  private initPromise: Promise<void> | null = null;

  async init(force = false): Promise<void> {
    if (!force && this.stateSig().lastLoadedAt && this.professeurDataStore.fullLoaded()) {
      return;
    }

    if (this.initPromise && !force) return this.initPromise;

    this.initPromise = this.load(force);
    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  async load(force = false): Promise<void> {
    this.patch({ action: 'Chargement des professeurs' });

    try {
      const profs = await this.professeurDataStore.loadAll({ force });
      await this.contratProfDataStore.loadExistsForProfIds(
        profs.map((prof) => prof.id),
        { force },
      );

      this.patch({
        action: '',
        lastLoadedAt: Date.now(),
      });
    } catch {
      this.patch({ action: '' });
      throw new Error('Chargement des professeurs impossible');
    }
  }

  setSelectedPersonneId(personneId: number | null): void {
    this.patch({ selectedPersonneId: personneId ? Number(personneId) : null });
  }

  getLibelle(prof: Professeur | null | undefined): string {
    return this.professeurDataStore.getLibelle(prof);
  }

  canDelete(prof: Professeur): boolean {
    return !this.contratProfDataStore.existsByProfId()[prof.id];
  }

  async addProfesseur(): Promise<void> {
    const personneId = this.stateSig().selectedPersonneId;
    if (!personneId) return;

    this.patch({ saving: true, action: 'Ajout du professeur' });

    try {
      const created = await this.professeurDataStore.create({
        personne_id: personneId,
      } as any);

      await this.contratProfDataStore.exists(created.id, { force: true });

      this.patch({
        selectedPersonneId: null,
        saving: false,
        action: '',
        lastLoadedAt: Date.now(),
      });
    } catch {
      this.patch({ saving: false, action: '' });
      throw new Error('Création du professeur impossible');
    }
  }

  edit(prof: Professeur): void {
    this.patch({ editing: JSON.parse(JSON.stringify(prof)) as Professeur });
  }

  cancel(): void {
    this.patch({ editing: null });
  }

  patchEditing(field: keyof Professeur, value: any): void {
    const editing = this.stateSig().editing;
    if (!editing) return;

    this.patch({
      editing: {
        ...editing,
        [field]: value,
      },
    });
  }

  async save(): Promise<void> {
    const editing = this.stateSig().editing;
    if (!editing) return;

    this.patch({ saving: true, action: 'Sauvegarde du professeur' });

    try {
      await this.professeurDataStore.update(editing.id, {
        taux: (editing as any).hourly_rate,
        statut: (editing as any).status,
        num_tva: (editing as any).num_tva,
        num_siren: (editing as any).num_siren,
        iban: (editing as any).iban,
        info: (editing as any).info,
      } as any);

      this.patch({
        editing: null,
        saving: false,
        action: '',
        lastLoadedAt: Date.now(),
      });
    } catch {
      this.patch({ saving: false, action: '' });
      throw new Error('Sauvegarde du professeur impossible');
    }
  }

  async remove(prof: Professeur): Promise<void> {
    if (!this.canDelete(prof)) {
      throw new Error('Impossible de supprimer ce professeur : il possède au moins un contrat.');
    }

    this.patch({ saving: true, action: 'Suppression du professeur' });

    try {
      await this.professeurDataStore.delete(prof.id);
      this.contratProfDataStore.invalidateExistFor(prof.id);

      this.patch({
        saving: false,
        action: '',
        lastLoadedAt: Date.now(),
      });
    } catch {
      this.patch({ saving: false, action: '' });
      throw new Error('Suppression du professeur impossible');
    }
  }

  private patch(partial: Partial<ProfesseurPageState>): void {
    this.stateSig.update((s) => ({ ...s, ...partial }));
  }
}
