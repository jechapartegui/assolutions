import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Adherent } from 'src/class/adherent';
import { Adhesion } from 'src/class/adhesion';
import { ItemContact } from 'src/class/contact';
import { Saison } from 'src/class/saison';
import { AdherentService } from 'src/services/adherent.service';
import { ErrorService } from 'src/services/error.service';
import { ExcelService } from 'src/services/excel.service';
import { GlobalService } from 'src/services/global.services';
import { SaisonService } from 'src/services/saison.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-import-adherent',
  templateUrl: './import-adherent.component.html',
  styleUrls: ['./import-adherent.component.css']
})
export class ImportAdherentComponent implements OnInit { 
  constructor(public excelService:ExcelService, public riders_serv:AdherentService, public saisonserv:SaisonService, public router:Router){

  }
  file:any;
  listeHeader: string[] = [];
  data: any[][] = [];
  valeurTest: string | null = null;
  action:string;
  liste_saison:Saison[];
  active_saison:Saison;
  headers = {
    ID: 'ID',
    Nom: 'Nom',
    Prenom: 'Prénom',
    DDN: 'Date de naissance',
    Sexe: 'Sexe',
    Adresse: 'Adresse',
    Country: 'Pays',
    Surnom: 'Surnom',
    Login: 'Login',
    Mail: 'Email',
    MailPref: 'Contact préféré email ?',
    Phone: 'Téléphone',
    PhonePref: 'Contact préféré téléphone ?',
    MailUrgence: 'Mail si urgence',
    NomMailUrgence: 'Contact mail si urgence',
    PhoneUrgence: 'Téléphone si urgence',
    NomPhoneUrgence: 'Contact téléphone si urgence',
    Inscrit: 'Inscrit',
  };

  ngOnInit(): void {
    if (
      GlobalService.menu !== 'ADMIN' 
    ) {
      this.router.navigate(['/menu']);
    } 
    const errorService = ErrorService.instance;
    this.action = $localize`Charger les saisons`;
    this.saisonserv
    .GetAll()
    .then((sa) => {
      if (sa.length == 0) {
        let o = errorService.CreateError(
          $localize`Récupérer les saisons`,
          $localize`Il faut au moins une saison pour créer un cours`
        );
        errorService.emitChange(o);
        if (
          GlobalService.menu === 'ADMIN' ||
          GlobalService.menu == 'PROF'
        ) {
          this.router.navigate(['/saison']);
        } else {
          this.router.navigate(['/menu']);
          GlobalService.selected_menu = 'MENU';
        }
        return;
      }
      this.liste_saison = sa.map((x) => new Saison(x));
      this.active_saison = this.liste_saison.filter(
        (x) => x.active == true
      )[0];
    })
    .catch((err: HttpErrorResponse) => {
      let o = errorService.CreateError(
        $localize`récupérer les saisons`,
        err.message
      );
      errorService.emitChange(o);
      this.router.navigate(['/menu']);
      GlobalService.selected_menu = 'MENU';
      return;
    });
  }

  objectKeys = Object.keys;

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const bstr: string = e.target.result;
        const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });

        // Lecture de la première feuille
        const wsname: string = wb.SheetNames[0];
        const ws: XLSX.WorkSheet = wb.Sheets[wsname];

        // Conversion des données en JSON
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        // Stocke la première ligne comme liste d'en-têtes
        this.listeHeader = data[0] as string[];

        // Stocke toutes les données
        this.data = data as any[][];
      };
      reader.readAsBinaryString(file);
    }
  }
  mappedValues: any = {};

  onSelectHeader(key: string, event: any) {
    const selectedHeader = event.target.value;
    const columnIndex = this.listeHeader.indexOf(selectedHeader);

    // Vérifie si la colonne sélectionnée existe et stocke la valeur de la ligne 2
    if (columnIndex >= 0) {
      this.mappedValues[key] = this.data[1][columnIndex];
    } else {
      this.mappedValues[key] = null;
    }
  }

 
  


}
