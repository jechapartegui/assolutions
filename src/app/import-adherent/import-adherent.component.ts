import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { adherent, Adherent, AdherentExport } from 'src/class/adherent';
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
    this.objectKeys(this.headers).forEach(key => {
      this.columnCounts[key] = 1;
      this.mappedValues[key] = [];
    });
  }
  file:any;
  listeHeader: string[] = [];
  data: any[][] = [];
  mappedValues: any = {}; 
  transformationValues: any = {};  // Stocke les valeurs sélectionnées pour chaque clé
  columnCounts: any = {};  // Stocke le nombre de colonnes de select pour chaque clé

  objectKeys = Object.keys;
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


  onFileChange(event: any) {
    this.file = event.target.files[0];
    if (this.file) {
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
      reader.readAsBinaryString(this.file);
    }
  }

  adjustColumnCount(key: string) {
    // Ajuste le nombre de colonnes et initialise les valeurs sélectionnées
    const count = this.columnCounts[key];
    this.mappedValues[key] = new Array(count).fill('');
  }



  onSelectHeader(key: string, index: number, event: any) {
    const selectedValue = event;
    console.log(selectedValue);
    if(!selectedValue){
      this.mappedValues[key][index] = [];
      this.mappedValues[key][index][0] = selectedValue;
      this.mappedValues[key][index][1] = "";
      this.mappedValues[key][index][2] = "";
      this.mappedValues[key][index][3] = "";
      this.mappedValues[key][index][4] = "";
    } else if (selectedValue === 'Texte'){
        this.mappedValues[key][index] = [];
        this.mappedValues[key][index][0] = selectedValue;
        this.mappedValues[key][index][1] = "";
        this.mappedValues[key][index][2] = "";
        this.mappedValues[key][index][3] = "";
        this.mappedValues[key][index][4] = "";
    } else {
      const columnIndex = this.listeHeader.indexOf(selectedValue);
      console.log(this.data[1][columnIndex]);
      // Met à jour la valeur sélectionnée pour ce header
      if (!this.mappedValues[key]) {
        this.mappedValues[key] = [];
      }
      this.mappedValues[key][index] = [];
      this.mappedValues[key][index][0] = selectedValue;
      this.mappedValues[key][index][1] = this.data[1][columnIndex];
      this.mappedValues[key][index][2] = "";
      this.mappedValues[key][index][3] = "";
      this.mappedValues[key][index][4] = this.data[1][columnIndex];
    }
    
  }
  
  onTextInput(key: string, index: number, event: Event) {
    const input = event.target as HTMLInputElement; // Assertion de type ici
    const value = input.value; // Récupération de la valeur
    // Logique pour utiliser la valeur
    console.log(`Text input for ${key} at index ${index}: ${value}`);
    this.mappedValues[key][index][2] = value; // Mettez à jour les valeurs mappées
  }
  
  onTransformationInput(key: string, index: number, event: Event) {
    const input = event.target as HTMLInputElement;
    const transformationCode = input.value;  // Le code de transformation saisi par l'utilisateur
    const originalValue = this.mappedValues[key][index][1];  // La valeur actuelle de la colonne sélectionnée
  
    try {
      this.mappedValues[key][index][3] = transformationCode; // Stocke la transformation saisie
  
      // Éviter 'return' dans l'eval, et faire une expression à évaluer directement
      const expression = transformationCode.replace(/@value/g, `'${originalValue}'`);
      
      // Utilisation d'eval pour évaluer cette expression
      const transformedValue = eval(expression); 
      this.mappedValues[key][index][4] = transformedValue; // Mettre à jour la valeur transformée
  
    } catch (error) {
      console.log('Erreur dans le code de transformation:', error);
      this.mappedValues[key][index][4] = originalValue; // Affichage d'une erreur si le code est invalide
    }
  }
  
  
  
  logAllValues() {
    const allValues = {};
    
    this.objectKeys(this.headers).forEach(key => {
      allValues[key] = this.mappedValues[key] ? this.mappedValues[key].map((value, index) => {
        return value === 'text' ? 'Texte Saisis' : value || 'Aucun';
      }).join(' | ') : '';
    });
  
    console.log(allValues);
  }

  importer(){
    const allValues = {};
    const list_adh = [];
    this.data.forEach((val) =>{
      console.log(val);
      let adf = new adherent();
      let Adh = new Adherent(adf);
      this.objectKeys(this.headers).forEach(key => {
        console.log(key);
        console.log(this.mappedValues[key].length);
        if(key == "ID"){
          Adh.ID = this.mappedValues[key][0][1];
        }
          
      });

    })
  }


}
