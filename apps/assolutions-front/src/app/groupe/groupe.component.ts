import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ErrorService } from '../../services/error.service';
import { AppStore } from '../app.store';
import { GroupeStore } from '../../store/groupe.store';
import { AdherentListItem_VM } from '../../vm/adherent-page.vm';
import { Groupe } from '@shared/index';

@Component({
  standalone: false,
  selector: 'app-groupe',
  templateUrl: './groupe.component.html',
  styleUrls: ['./groupe.component.css'],
})
export class GroupeComponent implements OnInit {
  /**
   * Petit bouton rouge nucléaire de debug :
   * dans la console navigateur, lancer : window.groupeStore.debugCurrentState()
   */
  constructor(
    public readonly groupeStore: GroupeStore,
    private readonly router: Router,
    public readonly store: AppStore,
  ) {}

  get vm() {
    return this.groupeStore.vm();
  }

  async ngOnInit(): Promise<void> {
    const errorService = ErrorService.instance;

    if (!this.store.isLoggedIn) {
      const error = errorService.CreateError($localize`Charger les groupes`, $localize`Accès impossible, vous n'êtes pas connecté`);
      errorService.emitChange(error);
      this.router.navigate(['/login']);
      return;
    }

    try {
      await this.groupeStore.init(this.store.saison_active_id());
    } catch (e) {
      errorService.emitChange(errorService.CreateError($localize`Chargement des groupes`, e));
    }
  }

  selectedGroupe(): Groupe | null {
    return this.groupeStore.selectedGroupe();
  }

  membersOfSelectedGroupe(): AdherentListItem_VM[] {
    return this.groupeStore.membersOfSelectedGroupe();
  }

  availableAdherentsForSelectedGroupe(): AdherentListItem_VM[] {
    return this.groupeStore.availableAdherentsForSelectedGroupe();
  }

  countMembers(groupeId: number): number {
    return this.groupeStore.countMembers(groupeId);
  }

  getInitiales(adherent: AdherentListItem_VM): string {
    const prenom = (adherent.prenom ?? '').trim();
    const nom = (adherent.nom ?? '').trim();
    const surnom = (adherent.surnom ?? '').trim();
    return `${prenom.charAt(0) || surnom.charAt(0) || ''}${nom.charAt(0) || ''}`.trim() || '?';
  }

  async saveGroupe(): Promise<void> {
    const errorService = ErrorService.instance;
    try {
      await this.groupeStore.saveEdit();
      errorService.emitChange(errorService.OKMessage($localize`Sauvegarde du groupe`));
    } catch (e) {
      errorService.emitChange(errorService.CreateError($localize`Sauvegarde du groupe`, e));
    }
  }

  async deleteGroupe(groupe: Groupe): Promise<void> {
    const count = this.countMembers(groupe.id);
    const confirmDelete = window.confirm(
      count > 0
        ? $localize`Ce groupe contient ${count} adhérent(s). Supprimer le groupe et ses liens ?`
        : $localize`Supprimer ce groupe ?`,
    );
    if (!confirmDelete) return;

    const errorService = ErrorService.instance;
    try {
      await this.groupeStore.deleteGroupe(groupe);
      errorService.emitChange(errorService.OKMessage($localize`Suppression du groupe`));
    } catch (e) {
      errorService.emitChange(errorService.CreateError($localize`Suppression du groupe`, e));
    }
  }

  async addAdherent(): Promise<void> {
    const errorService = ErrorService.instance;
    try {
      await this.groupeStore.addSelectedAdherentToSelectedGroupe();
      errorService.emitChange(errorService.OKMessage($localize`Ajout de l’adhérent au groupe`));
    } catch (e) {
      errorService.emitChange(errorService.CreateError($localize`Ajout de l’adhérent au groupe`, e));
    }
  }

  async removeAdherent(adherent: AdherentListItem_VM): Promise<void> {
    const groupe = this.selectedGroupe();
    if (!groupe) return;

    const confirmDelete = window.confirm($localize`Retirer ${adherent.libelle} du groupe ${groupe.nom} ?`);
    if (!confirmDelete) return;

    const errorService = ErrorService.instance;
    try {
      await this.groupeStore.removeAdherentFromSelectedGroupe(adherent);
      errorService.emitChange(errorService.OKMessage($localize`Suppression de l’adhérent du groupe`));
    } catch (e) {
      errorService.emitChange(errorService.CreateError($localize`Suppression de l’adhérent du groupe`, e));
    }
  }
}
