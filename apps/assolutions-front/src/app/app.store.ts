import { Injectable, signal, computed } from '@angular/core';
import { Adherent_VM, Cours_VM, Seance_VM } from '@shared/index';
import { AppMode, Compte_VM, ProjetView, Session } from '@shared/lib/compte.interface';
import { Lieu_VM } from '@shared/lib/lieu.interface';




@Injectable({ providedIn: 'root' })
export class AppStore {
  // State
// app.store.ts
readonly session = signal<Session | null>(null);
readonly selectedMenu =signal<MenuType>("MENU");
readonly public_saison_active_id = signal<number | null>(null);
readonly public_projet_id = signal<number | null>(null);

// ✅ computed
readonly isLoggedIn = computed(() => !!this.session());
readonly mode = computed(() => this.session()?.mode ?? "APPLI");

readonly compte = computed(() => this.session()?.compte ?? null);
readonly projects = computed(() => this.session()?.projects ?? []);
readonly selectedProject = computed(() => {
  const s = this.session();
  if (!s?.selectedProjectId) return null;
  return s.projects.find(p => p.id === s.selectedProjectId) ?? null;
});

readonly selectedProjectId = computed(() => {
  const s = this.session();
  if (!s?.selectedProjectId) return this.public_projet_id(); 
  return s?.selectedProjectId;
});

readonly saison_active_id = computed(() => {
  const s = this.session();
  if (!s?.selectedProjectId) return this.public_saison_active_id();
  return s.projects.find(p => p.id === s.selectedProjectId).saison_active.id ?? this.public_saison_active_id();
});

readonly saison_active = computed(() => {
  const s = this.session();
  if (!s?.selectedProjectId) return null;
  return s.projects.find(p => p.id === s.selectedProjectId).saison_active ?? null;
});
readonly rights = computed(() => this.selectedProject() ? {
  adherent: !!this.selectedProject()?.rights.adherent,
  prof: !!this.selectedProject()?.rights.prof,
  essai: !!this.selectedProject()?.rights.essai,
} : null);

readonly isAdmin = computed(() => this.mode() === "ADMIN");
readonly isProf = computed(() => !!this.rights()?.prof);
readonly canEssai = computed(() => !!this.rights()?.essai);
readonly hasProjet = computed(() => !!this.session()?.projects && this.session()!.projects.length > 0);


  //Lieu
  readonly Lieu = signal<ListState<Lieu_VM>>(initListState<Lieu_VM>());
  // Optionnel : pour exposer directement la liste (sinon tu feras store.Lieu().Liste)
  readonly LieuListe = computed(() => this.Lieu().Liste);
  readonly LieuHasRemoteNewerData = computed(() => this.Lieu().hasRemoteNewerData);

  //Adherent
  readonly Adherent = signal<ListState<Adherent_VM>>(initListState<Adherent_VM>());
  // Optionnel : pour exposer directement la liste (sinon tu feras store.Lieu().Liste)
  readonly AdherentListe = computed(() => this.Adherent().Liste);
  readonly AdherentHasRemoteNewerData = computed(() => this.Adherent().hasRemoteNewerData);
  
  //Seance
  readonly Seance = signal<ListState<Seance_VM>>(initListState<Seance_VM>());
  // Optionnel : pour exposer directement la liste (sinon tu feras store.Lieu().Liste)
  readonly SeanceListe = computed(() => this.Seance().Liste);
  readonly SeanceHasRemoteNewerData = computed(() => this.Seance().hasRemoteNewerData);
  
  //Cours
  readonly Cours = signal<ListState<Cours_VM>>(initListState<Cours_VM>());
  // Optionnel : pour exposer directement la liste (sinon tu feras store.Lieu().Liste)
  readonly CoursListe = computed(() => this.Cours().Liste);
  readonly CoursHasRemoteNewerData = computed(() => this.Cours().hasRemoteNewerData);

  updateSelectedMenu(menu: MenuType) {
    this.selectedMenu.set(menu);
  }
  //zone lieu 
  // 1) set loading
setLieuLoading(isLoading: boolean) {
  this.Lieu.update(s => ({ ...s, isLoading, error: null }));
}
setAdherentLoading(isLoading: boolean) {
  this.Adherent.update(s => ({ ...s, isLoading, error: null }));
}
setSeanceLoading(isLoading: boolean) {
  this.Seance.update(s => ({ ...s, isLoading, error: null }));
}
setCoursLoading(isLoading: boolean) {
  this.Cours.update(s => ({ ...s, isLoading, error: null }));
}

// 2) refresh silencieux : compare seulement, ne touche pas Liste
markRemoteLieu(remote: Lieu_VM[]) {
  const fp = fingerprintCore(remote ?? []);
  this.Lieu.update(s => {
    if (s.remoteFingerprint === fp) {
      return {
        ...s,
        lastFetchedAt: Date.now(),
        hasRemoteNewerData: false,
        isLoading: false,
      };
    }
    return {
      ...s,
      remoteFingerprint: fp,
      hasRemoteNewerData: true,
      lastFetchedAt: Date.now(),
      isLoading: false,
    };
  });
}

markRemoteAdherent(remote: Adherent_VM[]) {
  const fp = fingerprintCore(remote ?? []);
  this.Adherent.update(s => {
    if (s.remoteFingerprint === fp) {
      return {
        ...s,
        lastFetchedAt: Date.now(),
        hasRemoteNewerData: false,
        isLoading: false,
      };
    }
    return {
      ...s,
      remoteFingerprint: fp,
      hasRemoteNewerData: true,
      lastFetchedAt: Date.now(),
      isLoading: false,
    };
  });
}
markRemoteSeance(remote: Seance_VM[]) {
  const fp = fingerprintCore(remote ?? []);
  this.Seance.update(s => {
    if (s.remoteFingerprint === fp) {
      return {
        ...s,
        lastFetchedAt: Date.now(),
        hasRemoteNewerData: false,
        isLoading: false,
      };
    }
    return {
      ...s,
      remoteFingerprint: fp,
      hasRemoteNewerData: true,
      lastFetchedAt: Date.now(),
      isLoading: false,
    };
  });
}
markRemoteCours(remote: Cours_VM[]) {
  const fp = fingerprintCore(remote ?? []);
  this.Cours.update(s => {
    if (s.remoteFingerprint === fp) {
      return {
        ...s,
        lastFetchedAt: Date.now(),
        hasRemoteNewerData: false,
        isLoading: false,
      };
    }
    return {
      ...s,
      remoteFingerprint: fp,
      hasRemoteNewerData: true,
      lastFetchedAt: Date.now(),
      isLoading: false,
    };
  });
}
// 3) appliquer réellement la nouvelle liste
applyLieu(remote: Lieu_VM[]) {
  const fp = fingerprintCore(remote ?? []);
  this.Lieu.update(s => ({
    ...s,
    Liste: remote ?? [],
    remoteFingerprint: fp,
    hasRemoteNewerData: false,
    lastFetchedAt: Date.now(),
    isLoading: false,
    error: null,
  }));
}
applyAdherent(remote: Adherent_VM[]) {
  const fp = fingerprintCore(remote ?? []);
  this.Adherent.update(s => ({
    ...s,
    Liste: remote ?? [],
    remoteFingerprint: fp,
    hasRemoteNewerData: false,
    lastFetchedAt: Date.now(),
    isLoading: false,
    error: null,
  }));
}

applySeance(remote: Seance_VM[]) {
  const fp = fingerprintCore(remote ?? []);
  this.Seance.update(s => ({
    ...s,
    Liste: remote ?? [],
    remoteFingerprint: fp,
    hasRemoteNewerData: false,
    lastFetchedAt: Date.now(),
    isLoading: false,
    error: null,
  }));
}
applyCours(remote: Cours_VM[]) {
  const fp = fingerprintCore(remote ?? []);
  this.Cours.update(s => ({
    ...s,
    Liste: remote ?? [],
    remoteFingerprint: fp,
    hasRemoteNewerData: false,
    lastFetchedAt: Date.now(),
    isLoading: false,
    error: null,
  }));
}

// 4) update local (optimistic) — optionnel, mais pratique
upsertLieuLocal(item: Lieu_VM) {
  this.Lieu.update(s => {
    const Liste = [...s.Liste];
    const idx = Liste.findIndex(x => x.id === item.id);
    if (idx >= 0) Liste[idx] = item;
    else Liste.unshift(item);
    return { ...s, Liste };
  });
}
upsertAdherentLocal(item: Adherent_VM) {
  this.Adherent.update(s => {
    const Liste = [...s.Liste];
    const idx = Liste.findIndex(x => x.id === item.id);
    if (idx >= 0) Liste[idx] = item;
    else Liste.unshift(item);
    return { ...s, Liste };
  });
}
upsertSeanceLocal(item: Seance_VM) {
  this.Seance.update(s => {
    const Liste = [...s.Liste];
    const idx = Liste.findIndex(x => x.id === item.id);
    if (idx >= 0) Liste[idx] = item;
    else Liste.unshift(item);
    return { ...s, Liste };
  });
}
upsertCoursLocal(item: Cours_VM) {
  this.Cours.update(s => {
    const Liste = [...s.Liste];
    const idx = Liste.findIndex(x => x.id === item.id);
    if (idx >= 0) Liste[idx] = item;
    else Liste.unshift(item);
    return { ...s, Liste };
  });
}

removeLieuLocal(id: number) {
  this.Lieu.update(s => ({ ...s, Liste: s.Liste.filter(x => x.id !== id) }));
}
removeAdherentLocal(id: number) {
  this.Adherent.update(s => ({ ...s, Liste: s.Liste.filter(x => x.id !== id) }));
} 
removeSeanceLocal(id: number) {
  this.Seance.update(s => ({ ...s, Liste: s.Liste.filter(x => x.id !== id) }));
}
removeCoursLocal(id: number) {
  this.Cours.update(s => ({ ...s, Liste: s.Liste.filter(x => x.id !== id) }));
} 

setSession(s: Session) {
  this.session.set(s);
  localStorage.setItem("auth_token", s.token);
  localStorage.setItem("auth_mode", s.mode);
  localStorage.setItem("selected_projet", String(s.selectedProjectId ?? ""));
  console.log(this.selectedProjectId());
  console.log(this.session());
}

clearSession() {
  this.session.set(null);
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_mode");
  localStorage.removeItem("selected_projet");
}

setProjects(projects: ProjetView[]) {
  const s = this.session();
  if (!s) return;
  this.session.set({ ...s, projects });
}

selectProject(projectId: number) {
  const s = this.session();
  if (!s) return;
  this.session.set({ ...s, selectedProjectId: projectId });
  localStorage.setItem("selected_projet", String(projectId));
}
updateSaisonActive(saisonId: number) {
  const s = this.session();
  if (!s || s.selectedProjectId == null) return;

  const projects: ProjetView[] = s.projects.map(p => {
    if (p.id !== s.selectedProjectId) return p;

    // si saison_active existe -> on met à jour l'id
    if (p.saison_active) {
      return { ...p, saison_active: { ...p.saison_active, id: saisonId } };
    }

    // si elle est null -> on ne peut pas créer un Saison_VM complet => on laisse null
    return p;
  });

  this.session.set({ ...s, projects });
}


}

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
function fingerprintCore(items: { id: number; updatedAt?: string }[]) {
  return items
    .map(x => `${x.id}:${x.updatedAt ?? ''}`)
    .sort()
    .join('|');
}


export type MenuType =
  | 'ADHERENT' | 'COURS' | 'SEANCE' | 'GROUPE' | 'SAISON' | 'LIEU'
  | 'MENU' | 'MENU-ADMIN' |'COMPTE' | 'PROF' | 'STOCK' | 'SUIVIMAIL' | 'PROJETINFO'
  | 'PROJETMAIL' | 'COMPTA' | 'CB' | 'FACTURE' | 'ENVOIMAIL'
  | 'ADMINISTRATEUR' | 'TDB' | 'TRANSACTION' | 'LISTE_VALEUR';