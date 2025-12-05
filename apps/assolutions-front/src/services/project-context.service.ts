import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AppStore } from '../app/app.store';
import { ProjetView } from '@shared/index';
import { ProjetService } from './projet.service';

@Injectable({ providedIn: 'root' })
export class ProjectContextService {
  constructor(
    private store: AppStore,
    private projServ: ProjetService,
  ) {}

  /**
   * Connecte l'app à un projet :
   * - met le projet dans le store
   * - le mémorise dans localStorage
   * - charge la saison active
   * - met la saison active dans le store
   */
  async connectToProject(projet: ProjetView): Promise<boolean> {
    if (!projet) {
        console.log("ici");
      throw new Error($localize`Pas de projet sélectionné`);
    }

    // 1. Mémoriser le projet
    this.store.updateProjet(projet);
    localStorage.setItem('selected_projet', projet.id.toString());

    // 2. Charger la saison active
    const saisonActive = await this.projServ.GetActiveSaison();

    if (!saisonActive) {
      throw new Error($localize`Pas de saison active détectée sur le projet`);
    }

    this.store.updateSaisonActive(saisonActive);

    return true;
  }

  /**
   * Essaie de reconnecter le projet à partir de :
   * - selected_projet en localStorage
   * - la liste des projets en store
   */
  async restoreProjectFromLocalStorage(): Promise<boolean> {
    const selectedId = localStorage.getItem('selected_projet');
    if (!selectedId) {
      return false;
    }

    const projets = this.store.listprojet();
    if (!projets || projets.length === 0) {
        console.log("ici");
      return false;
    }

    const prj = projets.find(p => p.id.toString() === selectedId);
    if (!prj) {
        console.log("ici");
      return false;
    }

    await this.connectToProject(prj);
    return true;
  }
}
