import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Adherent, adherent } from 'src/class/adherent';
import { Groupe, Groupe_Lie, Lien_Groupe } from 'src/class/groupe';
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
  afficher_menu_admin:boolean = true;
  filter_libelle:string="";
  liste_adherent:adherent[];
  adherent_to:adherent;
  groupe_to:Groupe=null;
  liste_groupe:Groupe[];
  action:string="";

  constructor(private groupeserv:GroupeService, private adhserv:AdherentService, private router:Router){}

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
          this.liste_adherent = riders;
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
  AddToGroupe() {}

  public isGroupe(id_groupe: number, rider: adherent): boolean {
    let u = rider.groupes.filter(x => x.id == id_groupe);
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

  AddOrRemove(groupe: Groupe, rider: adherent, add: boolean) {
    let texte = "Ajout dans le groupe " + groupe.nom + " de " + rider.prenom + " " + rider.nom;
    if (add) {
      rider.groupes.push(groupe);
    } else {
      rider.groupes = rider.groupes.filter(e => e.id !== groupe.id);
      texte = "Suppression du groupe " + groupe.nom + " de " + rider.prenom + " " + rider.nom;
    }
    let LG = new Lien_Groupe();
    LG.objet_id = rider.id;
    LG.objet_type = 'rider';
    LG.groupes = [];
    LG.groupes = rider.groupes.map(x => x.id);
    let errorService = ErrorService.instance;
    this.groupeserv.UpdateLienGroupe(LG).then((retour) => {
      if (retour) {
        let o = errorService.OKMessage(texte);
        errorService.emitChange(o);

      } else {
        let o = errorService.CreateError(texte, $localize`Erreur inconnue`);
        errorService.emitChange(o);
        if (add) {
          rider.groupes = rider.groupes.filter(e => e.id !== groupe.id);
        } else {
          rider.groupes.push(groupe);
        }
      }
    }).catch((error) => {
      let n = errorService.CreateError(texte, error);
      errorService.emitChange(n);
      if (add) {
        rider.groupes = rider.groupes.filter(e => e.id !== groupe.id);
      } else {
        rider.groupes.push(groupe);
      }
    });
  }



}