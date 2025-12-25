import { Injectable, signal, computed } from '@angular/core';
import { Adherent_VM, Cours_VM, Seance_VM } from '@shared/index';
import { Compte_VM, ProjetView } from '@shared/lib/compte.interface';
import { Lieu_VM } from '@shared/lib/lieu.interface';
import { Projet_VM } from '@shared/lib/projet.interface';
import { Saison_VM } from '@shared/lib/saison.interface';

@Injectable({ providedIn: 'root' })
export class AppStore {
  // State
  readonly isLoggedIn = signal(false);
  readonly projet = signal<ProjetView | null>(null);
  readonly compte = signal<Compte_VM | null>(null);
  readonly projetVM = signal<Projet_VM | null>(null);
  readonly listprojet = signal<ProjetView[] | null>(null);
  readonly appli = signal<"APPLI" | "ADMIN">("APPLI");
  readonly selectedMenu = signal<MenuType>('MENU');
  readonly saison_active = signal<Saison_VM>(null); 
  // Derivés
  readonly hasProjet = computed(() => !!this.projet());
  readonly isProf = computed(() => !!this.projet()?.prof);

  //Lieu
  readonly Lieu = signal<ListState<Lieu_VM>>(initListState<Lieu_VM>());
  // Optionnel : pour exposer directement la liste (sinon tu feras store.Lieu().Liste)
  readonly LieuListe = computed(() => this.Lieu().Liste);
  readonly LieuHasRemoteNewerData = computed(() => this.Lieu().hasRemoteNewerData);

  //Adherent
  readonly Adherent = signal<ListState<Lieu_VM>>(initListState<Adherent_VM>());
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

  //zone lieu 
  // 1) set loading
setLieuLoading(isLoading: boolean) {
  this.Lieu.update(s => ({ ...s, isLoading, error: null }));
}
setAdhrentLoading(isLoading: boolean) {
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

  // Actions
  login(compte: Compte_VM) { this.isLoggedIn.set(true); this.compte.set(compte); }
  logout() {
    this.isLoggedIn.set(false);
    this.projet.set(null);
    this.compte.set(null);
  }
  login_projet(prok: Projet_VM)   { 
    this.isLoggedIn.set(true); 
    this.updateSaisonActive(prok.saison_active);
    this.projetVM.set(prok);
 const pv:ProjetView ={
      id : prok.id,
      nom : prok.nom,
      adherent : true,
      prof : true,
      essai : true
    }
    this.updateProjet(pv);
   }
  logout_projet() {
    this.isLoggedIn.set(false);
    this.projet.set(null);
    this.compte.set(null);
  }

  updateProjet(p: ProjetView | null) { this.projet.set(p); }
  updateListeProjet(p: ProjetView[] | null) { this.listprojet.set(p); }

  updateappli(p : "APPLI" | "ADMIN"){
    this.appli.set(p);
  }

  // Action pour mettre à jour le menu
  updateSelectedMenu(menu: MenuType) {
    this.selectedMenu.set(menu);
  }
  updateSaisonActive(p:Saison_VM){
    this.saison_active.set(p);
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
  | 'MENU' | 'COMPTE' | 'PROF' | 'STOCK' | 'SUIVIMAIL' | 'PROJETINFO'
  | 'PROJETMAIL' | 'COMPTA' | 'CB' | 'FACTURE' | 'ENVOIMAIL'
  | 'ADMINISTRATEUR' | 'TDB' | 'TRANSACTION' | 'LISTE_VALEUR';