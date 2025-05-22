import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Adherent } from '../../class/adherent';
import { Groupe } from '../../class/groupe';
import { AdherentService } from '../../services/adherent.service';
import { ErrorService } from '../../services/error.service';
import { GlobalService } from '../../services/global.services';
import { GroupeService } from '../../services/groupe.service';
import { KeyValuePair } from '@shared/compte/src';

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
  groupe_to: KeyValuePair = null;
  groupe_to_delete: KeyValuePair = null;
  liste_groupe: Groupe[];
  action: string = "";
  saison_id: number = null;

  constructor(private groupeserv: GroupeService, private adhserv: AdherentService, private router: Router) { }

  ngOnInit(): void {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger les groupes`;
    if (GlobalService.is_logged_in) {

      if (GlobalService.menu === "APPLI") {
        this.router.navigate(['/menu']);
        return;
      }
      // Chargez la liste des cours

      this.groupeserv.GetAll(GlobalService.saison_active).then((result) => {
        this.liste_groupe = result.map(x => {
  const g = new Groupe();
  g.id = Number(x.key);
  g.nom = x.value;
  g.display = false;
  return g;
});
        this.adhserv.GetAdherentAdhesion(GlobalService.saison_active).then((riders) => {
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
      if (Ad.Groupes.find(x => x.key == this.groupe_to.key)) {
        let o = errorService.Create(this.action, $localize`Cet adhérent est déjà présent dans le groupe`, "Warning");
        errorService.emitChange(o);
      } else {
        this.action = $localize`Ajout de `;
        this.action += Ad.Libelle;
        this.action += $localize` au groupe `;
        this.action += this.groupe_to.value;
       
        let errorService = ErrorService.instance;
        this.groupeserv.AddLien(Ad.ID, 'rider', Number(this.groupe_to.key)).then((id) => {
          if (id) {
            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
            Ad.Groupes.push({key: Number(this.groupe_to.key), value: this.groupe_to.value});
          } else {
            let o = errorService.UnknownError(this.action);
            errorService.emitChange(o);
          }
        }).catch((error) => {
          let n = errorService.CreateError(this.action, error);
          errorService.emitChange(n);
        });
      }


    } catch (error) {
      let o = errorService.UnknownError(this.action);
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
      let g: KeyValuePair = {
        key: 0,
        value: this.nom_groupe
      }
     
      this.groupeserv.Add(    g   
      ).then((id) => {
        g.key = id;
        const newGroupe = new Groupe();
        newGroupe.id = id;
        newGroupe.nom = this.nom_groupe;
        newGroupe.display = false;
        this.liste_groupe.push(newGroupe);
        let o = errorService.OKMessage(this.action);
      errorService.emitChange(o);
      }).catch((error) => {
        let n = errorService.CreateError(this.action, error);
        errorService.emitChange(n);
      });
    }
  }
  SupprimerGroupe() {
    let errorService = ErrorService.instance;
    this.action = $localize`Supprimer un groupe`;
    if (this.countAdherents(Number(this.groupe_to_delete.key)) > 0) {
      let confirm = window.confirm($localize`Vous supprimez un groupe composé d'adhérents, voulez-vous continuer ?`);
      if (confirm) {
        let list = this.liste_adherent.filter(rider => this.isGroupe(Number(this.groupe_to_delete.key), rider));
        list.forEach((rider) => {
          let groupe = rider.Groupes.find(x => x.key == this.groupe_to_delete.key);
          if(groupe){
            this.groupeserv.DeleteLien(rider.ID, "rider", Number(this.groupe_to_delete.key)).then((retour) => {
              if(retour){
                rider.Groupes = rider.Groupes.filter(e => e.key !== groupe.key);
              }
              else {
                let o = errorService.CreateError(this.action, $localize`Echec de la suppression du lien groupe pour l'adhérent ` + rider.Libelle + $localize` Annulation de l'opération`);
                errorService.emitChange(o);
                return;  
              }
            }).catch((error) => {
              let o = errorService.CreateError(this.action, error + $localize` : Echec de la suppression du lien groupe pour l'adhérent ` + rider.Libelle + $localize` Annulation de l'opération`);
              errorService.emitChange(o);
              return;
            })
          }

        })
        this.groupeserv.Delete(Number(this.groupe_to_delete.key)).then((retour) => {
          if (retour) {
            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
            this.liste_groupe = this.liste_groupe.filter(e => e.id !== Number(this.groupe_to_delete.key));
            
          } else {
            let o = errorService.UnknownError(this.action);
            errorService.emitChange(o);
          }
        }).catch((error) => {
          let o = errorService.CreateError(this.action, error);
          errorService.emitChange(o);
        })
      }
    } else {
      this.groupeserv.Delete(Number(this.groupe_to_delete.key)).then((retour) => {
        if (retour) {
          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
          this.liste_groupe = this.liste_groupe.filter(e => e.id !== Number(this.groupe_to_delete.key));
        } else {
          let o = errorService.UnknownError(this.action);
          errorService.emitChange(o);
        }
      }).catch((error) => {
        let o = errorService.CreateError(this.action, error);
        errorService.emitChange(o);
      })
    }
  }
  public isGroupe(id_groupe: number, rider: Adherent): boolean {
    let u = rider.Groupes.filter(x => x.key == id_groupe);
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

  DeleteLien(groupe : Groupe, rider:Adherent) {
    let errorService = ErrorService.instance;
    this.action = $localize`Suppression du groupe ` + groupe.nom +  $localize` de ` + rider.Libelle;
    this.groupeserv.DeleteLien(rider.ID, "rider", groupe.id).then((retour) => {
      if(retour){
        rider.Groupes = rider.Groupes.filter(e => e.key !== groupe.id);
        let o = errorService.OKMessage(this.action);
        errorService.emitChange(o);
      }
      else {
        let o = errorService.UnknownError(this.action);
        errorService.emitChange(o);      
      }
    }).catch((error) => {
      let o = errorService.CreateError(this.action, error);
      errorService.emitChange(o);
    })
  }



}