import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Adherent } from 'src/class/adherent';
import { Groupe, Lien_Groupe } from 'src/class/groupe';
import { AdherentService } from 'src/services/adherent.service';
import { ErrorService } from 'src/services/error.service';
import { GlobalService } from 'src/services/global.services';
import { GroupeService } from 'src/services/groupe.service';

@Component({
  selector: 'app-groupe',
  templateUrl: './groupe.component.html',
  styleUrls: ['./groupe.component.css']
})
export class GroupeComponent implements OnInit {
  afficher_menu_admin: boolean = false;
  afficher_creer_groupe: boolean = false;
  filter_libelle: string = "";
  nom_groupe: string = "";
  liste_adherent: Adherent[];
  adherent_to: Adherent;
  groupe_to: Groupe = null;
  groupe_to_delete: Groupe = null;
  liste_groupe: Groupe[];
  action: string = "";
  saison_id: number = null;

  constructor(private groupeserv: GroupeService, private adhserv: AdherentService, private router: Router) { }

  ngOnInit(): void {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger les groupe`;
    if (GlobalService.is_logged_in) {

      if (GlobalService.menu === "ADHERENT") {
        this.router.navigate(['/menu']);
        return;
      }
      // Chargez la liste des cours

      this.groupeserv.GetAll().then((result) => {
        this.liste_groupe = result;
        this.adhserv.GetAllThisSeason().then((riders) => {
          this.liste_adherent = riders.map(x => new Adherent(x));
        }).catch((error) => {
          let n = errorService.CreateError("Chargement", error);
          errorService.emitChange(n);
        });
      }).catch((error) => {
        let n = errorService.CreateError("Chargement", error);
        errorService.emitChange(n);
      });
    } else {
      let o = errorService.CreateError(this.action, $localize`Accès impossible, vous n'êtes pas connecté`);
      errorService.emitChange(o);
      this.router.navigate(['/login']);
    }

  }
  AddToGroupe() {
    let errorService = ErrorService.instance;
    this.action = $localize`Ajout d'une personne au groupe`;
    try {
      let Ad = this.liste_adherent.find(x => x.ID == this.adherent_to.ID);
      if (Ad.datasource.groupes.find(x => x.id == this.groupe_to.id)) {
        let o = errorService.Create(this.action, $localize`Cet adhérent est déjà présent dans le groupe`, "Warning");
        errorService.emitChange(o);
      } else {
        this.action = $localize`Ajout de `;
        this.action += Ad.Libelle;
        this.action += $localize` au groupe `;
        this.action += this.groupe_to.nom;
        Ad.Groupes.push(this.groupe_to);
        let LG = new Lien_Groupe();
        LG.objet_id = Ad.ID;
        LG.objet_type = 'rider';
        LG.groupes = [];
        LG.groupes = Ad.Groupes.map(x => x.id);
        console.log(Ad.Groupes);
        console.log(LG.groupes);
        LG.groupes.push(this.groupe_to.id);
        let errorService = ErrorService.instance;
        this.groupeserv.UpdateLienGroupe(LG).then((retour) => {
          if (retour) {
            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
            Ad.Groupes.push(this.groupe_to);
          } else {
            let o = errorService.CreateError(this.action, $localize`Erreur inconnue`);
            errorService.emitChange(o);
          }
        }).catch((error) => {
          let n = errorService.CreateError(this.action, error);
          errorService.emitChange(n);
        });
      }


    } catch (error) {
      let o = errorService.CreateError(this.action, $localize`Erreur inconnue`);
      errorService.emitChange(o);
    }
  }

  AjouterGroupe() {
    let errorService = ErrorService.instance;
    this.action = $localize`Ajouter un groupe`;
    if (this.liste_groupe.find(x => x.nom.toLowerCase() == this.nom_groupe.toLowerCase())) {
      let o = errorService.CreateError(this.action, $localize`Un groupe existe déjà sous ce nom`);
      errorService.emitChange(o);
    } else {
      let g: Groupe = new Groupe();
      g.nom = this.nom_groupe;
      if (this.saison_id == null) {
        g.saison_id = 0;
      } else {
        g.saison_id = this.saison_id;
      }
      this.groupeserv.Add(g).then((id) => {
        g.id = id;
        this.liste_groupe.push(g);
      }).catch((error) => {
        let n = errorService.CreateError(this.action, error);
        errorService.emitChange(n);
      });
    }
  }
  SupprimerGroupe() {
    let errorService = ErrorService.instance;
    this.action = $localize`Supprimer un groupe`;
    if (this.countAdherents(this.groupe_to_delete.id) > 0) {
      let confirm = window.confirm($localize`Vous supprimez un groupe composé d'adhérents, voulez-vous continuer ?`);
      if (confirm) {
        let list = this.liste_adherent.filter(rider => this.isGroupe(this.groupe_to_delete.id, rider));
        list.forEach((rider) => {
          rider.Groupes = rider.Groupes.filter(e => e.id !== this.groupe_to_delete.id);
          let LG = new Lien_Groupe();
          LG.objet_id = rider.ID;
          LG.objet_type = 'rider';
          LG.groupes = [];
          LG.groupes = rider.Groupes.map(x => x.id);
          this.groupeserv.UpdateLienGroupe(LG).then((retour) => {
            if (!retour) {
              let o = errorService.CreateError(this.action, $localize`Echec de la suppression du lien groupe pour l'adhérent ` + rider.Libelle + $localize` Annulation de l'opération`);
              errorService.emitChange(o);
              return;
            }
          }).catch((error) => {
            let o = errorService.CreateError(this.action, error + $localize` : Echec de la suppression du lien groupe pour l'adhérent ` + rider.Libelle + $localize` Annulation de l'opération`);
            errorService.emitChange(o);
            return;
          });
        })
        this.groupeserv.Delete(this.groupe_to_delete.id).then((retour) => {
          if (retour) {
            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
            
          } else {
            let o = errorService.CreateError(this.action, $localize`Erreur inconnue`);
            errorService.emitChange(o);
          }
        }).catch((error) => {
          let o = errorService.CreateError(this.action, error);
          errorService.emitChange(o);
        })
      }
    } else {
      this.groupeserv.Delete(this.groupe_to_delete.id).then((retour) => {
        if (retour) {
          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
          this.liste_groupe = this.liste_groupe.filter(e => e.id !== this.groupe_to_delete.id);
        } else {
          let o = errorService.CreateError(this.action, $localize`Erreur inconnue`);
          errorService.emitChange(o);
        }
      }).catch((error) => {
        let o = errorService.CreateError(this.action, error);
        errorService.emitChange(o);
        this.liste_groupe = this.liste_groupe.filter(e => e.id !== this.groupe_to_delete.id);
      })
    }
  }
  public isGroupe(id_groupe: number, rider: Adherent): boolean {
    let u = rider.Groupes.filter(x => x.id == id_groupe);
    if (u) {
      if (u.length > 0) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }

  }
  countAdherents(groupeId: number): number {
    if (this.liste_adherent) {
      return this.liste_adherent.filter(rider => this.isGroupe(groupeId, rider)).length;
    } else {
      return 0;
    }
  }

  AddOrRemove(groupe: Groupe, rider: Adherent, add: boolean) {
    let texte = "Ajout dans le groupe " + groupe.nom + " de " + rider.Libelle;
    if (add) {
      rider.Groupes.push(groupe);
    } else {
      rider.Groupes = rider.Groupes.filter(e => e.id !== groupe.id);
      texte = "Suppression du groupe " + groupe.nom + " de " + rider.Libelle;
    }
    let LG = new Lien_Groupe();
    LG.objet_id = rider.ID;
    LG.objet_type = 'rider';
    LG.groupes = [];
    LG.groupes = rider.Groupes.map(x => x.id);
    let errorService = ErrorService.instance;
    this.groupeserv.UpdateLienGroupe(LG).then((retour) => {
      if (retour) {
        let o = errorService.OKMessage(texte);
        errorService.emitChange(o);

      } else {
        let o = errorService.CreateError(texte, $localize`Erreur inconnue`);
        errorService.emitChange(o);
        if (add) {
          rider.Groupes = rider.Groupes.filter(e => e.id !== groupe.id);
        } else {
          rider.Groupes.push(groupe);
        }
      }
    }).catch((error) => {
      let n = errorService.CreateError(texte, error);
      errorService.emitChange(n);
      if (add) {
        rider.Groupes = rider.Groupes.filter(e => e.id !== groupe.id);
      } else {
        rider.Groupes.push(groupe);
      }
    });
  }



}