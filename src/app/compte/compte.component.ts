import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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

  constructor(private cpteserv: CompteService, private router: Router) { }
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

  getToken(pro_cp: projet_compte[], droit) {
    const errorService = ErrorService.instance;
    if (pro_cp.find(x => x.droit == droit)) {
      this.cpteserv.getToken(pro_cp.find(x => x.droit == droit)).then((token) => {
        navigator.clipboard.writeText(token).then(() => {
          alert($localize`Texte copié dans le presse-papier !`);
        }).catch(err => {
          alert($localize`Échec de la copie du texte : ` + err);
        });
      }).catch((err: HttpErrorResponse) => {
          let o = errorService.CreateError($localize`Récupérer le Token`, err.message);
          errorService.emitChange(o);
          return;
      });
    }
    return $localize`Pas de token pour ce compte`;

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
