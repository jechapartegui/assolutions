import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { compte, projet_compte } from 'src/class/compte';
import { CompteService } from 'src/services/compte.service';
import { ErrorService } from 'src/services/error.service';
import { GlobalService } from 'src/services/global.services';

@Component({
  selector: 'app-compte',
  templateUrl: './compte.component.html',
  styleUrls: ['./compte.component.css']
})
export class CompteComponent implements OnInit {

  baseUrl:string;

  sort_login: string;
  filter_login: string;
  sort_actif: string;
  filter_actif: number;
  filter_droit: number;
  thisCompte: compte;

  ListeCompte: compte[];
  action: string;
  context: "LISTE" | "ECRITURE" = "LISTE";
  afficher_filtre: any;

    // Récupère l'URL actuelle sans les chemins et paramètres supplémentaires
  constructor(private location: Location, private cpteserv: CompteService, private router: Router) {
    
    this.baseUrl = `${window.location.protocol}//${window.location.hostname}`;
   }
  ngOnInit(): void {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger les comptes`;

    if (GlobalService.is_logged_in) {

      if ((GlobalService.menu === "ADHERENT") || (GlobalService.menu === "PROF")) {
        this.router.navigate(['/menu']);
        return;
      }

      this.cpteserv.GetAll().then((cpt) => {
        this.ListeCompte = cpt;
      }).catch((error: HttpErrorResponse) => {
        let n = errorService.CreateError("Chargement", error);
        errorService.emitChange(n);
      });
    } else {

      this.router.navigate(['/login']);
      return;
    }
  }

  IsAdminProf(pro_cp: projet_compte[], droit): boolean {
    if (pro_cp.find(x => x.droit == droit)) {
      return true;
    } else {
      return false;
    }
  }

  getToken(pro_cp: compte, droit: number) {
    if (pro_cp.projet_compte.find(x => x.droit == droit)) {
      let token = pro_cp.projet_compte.find(x => x.droit == droit).connexion_token;
      let url = this.baseUrl + "/login?username=" + pro_cp.login + "&token_connexion=" + token + "&droit=" + droit.toString();
      navigator.clipboard.writeText(url).then(() => {
        alert($localize`Texte copié dans le presse-papier !`);
      }).catch(err => {
        alert($localize`Échec de la copie du texte : ` + err);
      });
    }
    return;

  }



  Sort(arg0: string, arg1: string) {
    throw new Error('Method not implemented.');
  }
  Creer() {
    throw new Error('Method not implemented.');
  }
  ExporterExcel() {
    throw new Error('Method not implemented.');
  }
  ReinitFiltre() {
    throw new Error('Method not implemented.');
  }
  IsEmail(text): boolean {
    var re = /(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;
    return re.test(text);
  }
  Admin(_t115: any) {
    throw new Error('Method not implemented.');
  }
  Delete(_t115: any) {
    throw new Error('Method not implemented.');
  }
  Save() {
    throw new Error('Method not implemented.');
  }
  Retour(arg0: string) {
    throw new Error('Method not implemented.');
  }
}
