import { Injectable, signal } from '@angular/core';
import { Cours_VM, Groupe, Lieu_VM, ProfLight_VM } from '@shared/index';

export interface ListState<T> {
  Liste: T[];
  lastFetchedAt: number | null;
  remoteFingerprint: string | null;
  hasRemoteNewerData: boolean;
  isLoading: boolean;
  error: string | null;
}

function initListState<T>(): ListState<T> {
  return {
    Liste: [],
    lastFetchedAt: null,
    remoteFingerprint: null,
    hasRemoteNewerData: false,
    isLoading: false,
    error: null,
  };
}

function fingerprintCore(items: Array<{ id: number; updatedAt?: string | Date | null }>): string {
  return items
    .map((x) => `${x.id}:${x.updatedAt ? String(x.updatedAt) : ''}`)
    .sort()
    .join('|');
}

@Injectable({ providedIn: 'root' })
export class RefDataStore {
  readonly lieux = signal<Record<string, ListState<Lieu_VM>>>({});
  readonly cours = signal<Record<string, ListState<Cours_VM>>>({});
  readonly groupes = signal<Record<string, ListState<Groupe>>>({});
  readonly profs = signal<Record<string, ListState<ProfLight_VM>>>({});

  private keyProject(projectId: number): string {
    return `project:${projectId}`;
  }

  private keySaison(saisonId: number): string {
    return `saison:${saisonId}`;
  }
  private keyProjectSaison(projectId: number, saisonId: number): string {
  return `project:${projectId}:saison:${saisonId}`;
}

  private getState<T>(bag: Record<string, ListState<T>>, key: string): ListState<T> {
    return bag[key] ?? initListState<T>();
  }

  private setLoading<T>(
    bagSignal: ReturnType<typeof signal<Record<string, ListState<T>>>>,
    key: string,
    isLoading: boolean,
    error: string | null = null,
  ): void {
    bagSignal.update((bag) => ({
      ...bag,
      [key]: {
        ...(bag[key] ?? initListState<T>()),
        isLoading,
        error,
      },
    }));
  }

  private apply<T extends { id: number; updatedAt?: string | Date | null }>(
    bagSignal: ReturnType<typeof signal<Record<string, ListState<T>>>>,
    key: string,
    items: T[],
  ): void {
    bagSignal.update((bag) => ({
      ...bag,
      [key]: {
        Liste: items,
        lastFetchedAt: Date.now(),
        remoteFingerprint: fingerprintCore(items),
        hasRemoteNewerData: false,
        isLoading: false,
        error: null,
      },
    }));
  }

  private markRemote<T extends { id: number; updatedAt?: string | Date | null }>(
    bagSignal: ReturnType<typeof signal<Record<string, ListState<T>>>>,
    key: string,
    items: T[],
  ): void {
    const remoteFp = fingerprintCore(items);

    bagSignal.update((bag) => {
      const current = bag[key] ?? initListState<T>();
      return {
        ...bag,
        [key]: {
          ...current,
          hasRemoteNewerData:
            !!current.remoteFingerprint && current.remoteFingerprint !== remoteFp,
        },
      };
    });
  }

  getLieuxState(projectId: number): ListState<Lieu_VM> {
    return this.getState(this.lieux(), this.keyProject(projectId));
  }

  getCoursState(saisonId: number): ListState<Cours_VM> {
    return this.getState(this.cours(), this.keySaison(saisonId));
  }

  getGroupesState(projectId: number): ListState<Groupe> {
    return this.getState(this.groupes(), this.keyProject(projectId));
  }

 getProfsState(projectId: number, saisonId: number): ListState<ProfLight_VM> {
  return this.getState(this.profs(), this.keyProjectSaison(projectId, saisonId));
}
  setLieuxLoading(projectId: number, isLoading: boolean, error: string | null = null): void {
    this.setLoading(this.lieux, this.keyProject(projectId), isLoading, error);
  }

  setCoursLoading(saisonId: number, isLoading: boolean, error: string | null = null): void {
    this.setLoading(this.cours, this.keySaison(saisonId), isLoading, error);
  }

  setGroupesLoading(projectId: number, isLoading: boolean, error: string | null = null): void {
    this.setLoading(this.groupes, this.keyProject(projectId), isLoading, error);
  }

setProfsLoading(
  projectId: number,
  saisonId: number,
  isLoading: boolean,
  error: string | null = null
): void {
  this.setLoading(this.profs, this.keyProjectSaison(projectId, saisonId), isLoading, error);
}

  applyLieux(projectId: number, items: Lieu_VM[]): void {
    this.apply(this.lieux, this.keyProject(projectId), items);
  }

  markRemoteLieux(projectId: number, items: Lieu_VM[]): void {
    this.markRemote(this.lieux, this.keyProject(projectId), items);
  }

  applyCours(saisonId: number, items: Cours_VM[]): void {
    this.apply(this.cours, this.keySaison(saisonId), items);
  }

  markRemoteCours(saisonId: number, items: Cours_VM[]): void {
    this.markRemote(this.cours, this.keySaison(saisonId), items);
  }

  applyGroupes(projectId: number, items: Groupe[]): void {
    this.apply(this.groupes, this.keyProject(projectId), items);
  }

  markRemoteGroupes(projectId: number, items: Groupe[]): void {
    this.markRemote(this.groupes, this.keyProject(projectId), items);
  }

 applyProfs(projectId: number, saisonId: number, items: ProfLight_VM[]): void {
  this.apply(this.profs, this.keyProjectSaison(projectId, saisonId), items);
}

markRemoteProfs(projectId: number, saisonId: number, items: ProfLight_VM[]): void {
  this.markRemote(this.profs, this.keyProjectSaison(projectId, saisonId), items);
}
  clearAll(): void {
    this.lieux.set({});
    this.cours.set({});
    this.groupes.set({});
    this.profs.set({});
  }
}