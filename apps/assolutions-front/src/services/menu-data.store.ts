import { Injectable } from '@angular/core';

type CacheEntry<T> = { value: T; fetchedAt: number };
const now = () => Date.now();

@Injectable({ providedIn: 'root' })
export class MenuDataStore {
  private profsByProject = new Map<number, CacheEntry<any[]>>();
  private lieuxByProject = new Map<number, CacheEntry<any[]>>();
  private coursBySaison = new Map<number, CacheEntry<any[]>>();
  private groupesBySaison = new Map<number, CacheEntry<any[]>>();
  private ridersByKey = new Map<string, CacheEntry<any[]>>();
  private photoByPersonId = new Map<number, CacheEntry<string | undefined>>();

  // TTLs (à ajuster)
  private TTL_LONG = 24 * 60 * 60 * 1000; // 24h
  private TTL_SHORT = 2 * 60 * 1000;      // 2 min
  private TTL_PHOTO = 24 * 60 * 60 * 1000;

  private isFresh(entry: CacheEntry<any> | undefined, ttl: number) {
    return !!entry && (now() - entry.fetchedAt) < ttl;
  }

  invalidateAll() {
    this.profsByProject.clear();
    this.lieuxByProject.clear();
    this.coursBySaison.clear();
    this.ridersByKey.clear();
    this.photoByPersonId.clear();
    this.groupesBySaison.clear();
  }

  invalidateRiders(projectId: number, saisonId: number) {
    this.ridersByKey.delete(`${projectId}:${saisonId}`);
  }

  invalidateCours(saisonId: number) {
    this.coursBySaison.delete(saisonId);
  }

  invalidateLieux(projectId: number) {
    this.lieuxByProject.delete(projectId);
  }

  invalidateProfs(projectId: number) {
    this.profsByProject.delete(projectId);
  }
  invalidateGroupes(saisonId: number) {
    this.groupesBySaison.delete(saisonId);
  }

  // getters/setters utilitaires
  getProfs(saisonId: number) { return this.profsByProject.get(saisonId); }
  setProfs(saisonId: number, value: any[]) { this.profsByProject.set(saisonId, { value, fetchedAt: now() }); }

  getLieux(projectId: number) { return this.lieuxByProject.get(projectId); }
  setLieux(projectId: number, value: any[]) { this.lieuxByProject.set(projectId, { value, fetchedAt: now() }); }

  getCours(saisonId: number) { return this.coursBySaison.get(saisonId); }
  setCours(saisonId: number, value: any[]) { this.coursBySaison.set(saisonId, { value, fetchedAt: now() }); }

  getRiders(key: string) { return this.ridersByKey.get(key); }
  setRiders(key: string, value: any[]) { this.ridersByKey.set(key, { value, fetchedAt: now() }); }

  getPhoto(personId: number) { return this.photoByPersonId.get(personId); }
  setPhoto(personId: number, value: string | undefined) {
    this.photoByPersonId.set(personId, { value, fetchedAt: now() });
  }

  getGroupes(saisonId: number) { return this.groupesBySaison.get(saisonId); }
  setGroupes(saisonId: number, value: any[]) { this.groupesBySaison.set(saisonId, { value, fetchedAt: now() }); }

  profsFresh(projectId: number) { return this.isFresh(this.getProfs(projectId), this.TTL_LONG); }
  lieuxFresh(projectId: number) { return this.isFresh(this.getLieux(projectId), this.TTL_LONG); }
  coursFresh(saisonId: number) { return this.isFresh(this.getCours(saisonId), this.TTL_LONG); }
  ridersFresh(key: string) { return this.isFresh(this.getRiders(key), this.TTL_SHORT); }
  photoFresh(personId: number) { return this.isFresh(this.getPhoto(personId), this.TTL_PHOTO); }
  groupesFresh(saisonId: number) { return this.isFresh(this.getGroupes(saisonId), this.TTL_LONG); }
}