import { Injectable, signal, computed } from '@angular/core';
import { Compte_VM, ProjetView } from '@shared/lib/compte.interface';
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
  readonly menu = signal<"APPLI" | "ADMIN">("APPLI");
  readonly selectedMenu = signal<MenuType>('MENU');
  readonly saison_active = signal<Saison_VM>(null); 
  // Derivés
  readonly hasProjet = computed(() => !!this.projet());
  readonly isProf = computed(() => !!this.projet()?.prof);

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
export type MenuType =
  | 'ADHERENT' | 'COURS' | 'SEANCE' | 'GROUPE' | 'SAISON' | 'LIEU'
  | 'MENU' | 'COMPTE' | 'PROF' | 'STOCK' | 'SUIVIMAIL' | 'PROJETINFO'
  | 'PROJETMAIL' | 'COMPTA' | 'CB' | 'FACTURE' | 'ENVOIMAIL'
  | 'ADMINISTRATEUR' | 'TDB' | 'TRANSACTION' | 'LISTE_VALEUR';