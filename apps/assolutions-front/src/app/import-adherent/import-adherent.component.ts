import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { AdherentService } from '../../services/adherent.service';
import { CompteService } from '../../services/compte.service';
import { ErrorService } from '../../services/error.service';
import { ExcelService } from '../../services/excel.service';
import { InscriptionSaisonService } from '../../services/inscription-saison.service';
import { SaisonService } from '../../services/saison.service';
import { Adresse } from '@shared/lib/adresse.interface';
import { Adherent_VM, AdherentExport } from '@shared/lib/member.interface';
import { Saison_VM } from '@shared/lib/saison.interface';
import { AppStore } from '../app.store';

@Component({
  standalone: false,
  selector: 'app-import-adherent',
  templateUrl: './import-adherent.component.html',
  styleUrls: ['./import-adherent.component.css'],
})
export class ImportAdherentComponent implements OnInit {
  constructor(
    public excelService: ExcelService,
    public riders_serv: AdherentService,
    public saisonserv: SaisonService,
    public compte_serv: CompteService,
    public inscr_saison:InscriptionSaisonService,
    public router: Router,
    public store:AppStore
  ) {
    this.objectKeys(this.headers).forEach((key) => {
      this.columnCounts[key] = 1;
      this.mappedValues[key] = new Array(1).fill('').map(() => []);
    });
  }
  context: 'LOAD' | 'VIEW' | 'COMPARE' = 'LOAD';
  list_adh: Adherent_VM[];
  adherents_import: AdherentImport[];
  file: any;
  listeHeader: string[] = [];
  data: any[][] = [];
  mappedValues: any = {};
  transformationValues: any = {}; // Stocke les valeurs sélectionnées pour chaque clé
  columnCounts: any = {}; // Stocke le nombre de colonnes de select pour chaque clé
  ListeCompare: AdherentImport[] = [];
  editAdherentImport: AdherentImport;
  objectKeys = Object.keys;
  action: string;
  liste_saison: Saison_VM[];
  active_saison: Saison_VM;
  headers = {
    ID: 'ID',
    Nom: 'Nom',
    Prenom: 'Prénom',
    DDN: 'Date de naissance',
    Sexe: 'Sexe',
    Voie: 'Voie',
    PostCode: 'Code Postal',
    Ville: 'Ville',
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
    if (this.store.appli() !== 'ADMIN') {
      this.router.navigate(['/menu']);
      this.store.updateSelectedMenu("MENU");
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
          if (this.store.appli() === 'APPLI') {
            this.router.navigate(['/saison']);
          } else {
            this.router.navigate(['/menu']);
      this.store.updateSelectedMenu("MENU");
          }
          return;
        }
        this.liste_saison = sa;
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
      this.store.updateSelectedMenu("MENU");
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
    this.mappedValues[key] = new Array(count).fill('').map(() => []);
  }

  onSelectHeader(key: string, index: number, event: any) {
    if (
      this.mappedValues[key][index][5] &&
      this.mappedValues[key][index][5] !== 'Texte'
    ) {
      const selectedValue = event;
      const columnIndex = this.listeHeader.indexOf(selectedValue);
      this.mappedValues[key][index][0] = columnIndex;
      this.mappedValues[key][index][1] = this.data[1][columnIndex];
      this.mappedValues[key][index][2] = '';
      this.mappedValues[key][index][3] = '';
      this.mappedValues[key][index][4] = this.data[1][columnIndex];
    }
  }

  onTransformationInput(key: string, index: number, event: Event) {
    const transformationCode = this.mappedValues[key][index][3]; // Le code de transformation saisi par l'utilisateur
    const originalValue = this.mappedValues[key][index][1]; // La valeur actuelle de la colonne sélectionnée

    try {
      // Éviter 'return' dans l'eval, et faire une expression à évaluer directement
      const expression = transformationCode.replace(
        /@value/g,
        `'${originalValue}'`
      );

      // Utilisation d'eval pour évaluer cette expression
      const transformedValue = eval(expression);
      this.mappedValues[key][index][4] = transformedValue; // Mettre à jour la valeur transformée
    } catch (error) {
      this.mappedValues[key][index][4] = originalValue; // Affichage d'une erreur si le code est invalide
    }
  }

  logAllValues() {
    const allValues = {};

    this.objectKeys(this.headers).forEach((key) => {
      allValues[key] = this.mappedValues[key]
        ? this.mappedValues[key]
            .map((value, index) => {
              return value === 'text' ? 'Texte Saisis' : value || 'Aucun';
            })
            .join(' | ')
        : '';
    });
  }

  //@value.toLowerCase().replace(/(?:^|\s|-)\w/g, (char) => char.toUpperCase());

  //@value == 'Monsieur' ? true : false ==> pas fonctionné
  //new Date(1900, 0, @value- (@value> 60 ? 2 : 1));

  importer() {
    this.action = $localize`Importer les adhérents`;
    this.list_adh = [];

    // On commence à partir de la ligne 2 (index 1), car la première ligne contient les headers
    for (let i = 1; i < this.data.length; i++) {
      const val = this.data[i];
      let Adh = new AdherentExport();

      this.objectKeys(this.headers).forEach((key) => {
        if (this.mappedValues[key].length > 0) {
          let valeur = '';
          for (let index = 0; index < this.mappedValues[key].length; index++) {
            // Utiliser la colonne directement
            if (!this.mappedValues[key][index][5]) {
              // Champ vide
              continue;
            } else if (this.mappedValues[key][index][5] == 'Texte') {
              valeur += this.mappedValues[key][index][2]; // Texte saisi
            } else {
              const colonne = this.mappedValues[key][index][0];
              const valeur_table = val[colonne];
              if (valeur_table) {
                try {
                  if (
                    this.mappedValues[key][index][3] &&
                    this.mappedValues[key][index][3].length > 0
                  ) {
                    const expression = this.mappedValues[key][index][3].replace(
                      /@value/g,
                      `'${valeur_table}'`
                    );
                    const transformedValue = eval(expression); // Transformation personnalisée
                    valeur += transformedValue;
                  } else {
                    valeur += valeur_table;
                  }
                } catch (error) {
                  valeur += valeur_table; // Si la transformation échoue, prendre la valeur brute
                }
              }
            }
          }

          // Convertir les champs spécifiques en fonction du type
          switch (key) {
            case 'ID':
              if (valeur == '') {
                Adh.ID = 0;
              } else {
                Adh.ID = parseInt(valeur, 10); // Convertir en number
              }
              break;
            case 'Nom':
              Adh.Nom = valeur; // Garder en string
              break;
            case 'Prenom':
              Adh.Prenom = valeur; // Garder en string
              break;
            case 'DDN':
              if (valeur == '') {
                Adh.DDN = null;
              } else {
                Adh.DDN = new Date(valeur).toISOString().slice(0, 10); // Convertir en date et formater en string
              }
              break;
            case 'Sexe':
              Adh.Sexe = valeur === 'true'; // Convertir en booléen (true si homme, false sinon)
              break;
            case 'Voie':
              Adh.Street = valeur;
              break;
            case 'PostCode':
              Adh.PostCode = valeur;
              break;
            case 'Ville':
              Adh.City = valeur;
              break;
            case 'Country':
              Adh.Country = valeur;
              break;
            case 'Surnom':
              Adh.Surnom = valeur;
              break;
            case 'Login':
              Adh.Login = valeur;
              break;
            case 'Mail':
              Adh.Mail = valeur;
              break;
            case 'MailPref':
              Adh.MailPref = valeur === 'true';
              break;
            case 'Phone':
              Adh.Phone = valeur;
              break;
            case 'PhonePref':
              Adh.PhonePref = valeur === 'true';
              break;
            case 'MailUrgence':
              Adh.MailUrgence = valeur;
              break;
            case 'NomMailUrgence':
              Adh.NomMailUrgence = valeur;
              break;
            case 'PhoneUrgence':
              Adh.PhoneUrgence = valeur;
              break;
            case 'NomPhoneUrgence':
              Adh.NomPhoneUrgence = valeur;
              break;
            case 'Inscrit':
              Adh.Inscrit = valeur === 'true';
              break;
            default:
              break;
          }
        }
      });
      let AdherentT = new Adherent_VM();
      AdherentT.id = Adh.ID;
      AdherentT.nom = Adh.Nom;
      AdherentT.prenom = Adh.Prenom;
      AdherentT.date_naissance = new Date(Adh.DDN);
      AdherentT.sexe = Adh.Sexe;
      let adr = new Adresse();
      adr.Street = Adh.Street;
      adr.City = Adh.City;
      adr.Country = Adh.Country;
      adr.PostCode = Adh.PostCode;
      AdherentT.adresse = adr;
      if (this.IsEmail(Adh.Login)) {
        AdherentT.login = Adh.Login;
      }
      AdherentT.login = Adh.Login;
      AdherentT.contact = [];

if (Adh.Mail && this.IsEmail(Adh.Mail)) {
  AdherentT.contact.push({
    Type: 'EMAIL',
    Value: Adh.Mail,
    Notes: '',
    Pref: !!Adh.MailPref
  });
}

if (Adh.Phone && this.IsPhone(Adh.Phone)) {
  AdherentT.contact.push({
    Type: 'PHONE',
    Value: Adh.Phone,
    Notes: '',
    Pref: !!Adh.PhonePref
  });
}

AdherentT.contact_prevenir = [];

if (Adh.MailUrgence && this.IsEmail(Adh.MailUrgence)) {
  AdherentT.contact_prevenir.push({
    Type: 'EMAIL',
    Value: Adh.MailUrgence,
    Notes: Adh.NomMailUrgence || '',
    Pref: !!Adh.MailPref // Attention ici : tu veux probablement tester `MailUrgencePref` ?
  });
}

if (Adh.PhoneUrgence && this.IsPhone(Adh.PhoneUrgence)) {
  AdherentT.contact_prevenir.push({
    Type: 'PHONE',
    Value: Adh.PhoneUrgence,
    Notes: Adh.NomPhoneUrgence || '',
    Pref: !!Adh.PhonePref // Idem ici : à vérifier si c’est `PhoneUrgencePref`
  });
}

   
      AdherentT.inscrit = Adh.Inscrit;

      this.list_adh.push(AdherentT); // Ajouter l'adhérent à la liste
    }
    this.context = 'VIEW';
  }
  IsEmail(text): boolean {
    var re =
      /(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;
    return re.test(text);
  }
  IsPhone(value: string): boolean {
    // Regular expression for international or national phone numbers with optional separators
    var re =
      /^(\+?[0-9]{1,3}[-\s\.]?)?(\(?[0-9]{1,4}\)?[-\s\.]?)?([0-9]{1,4}[-\s\.]?[0-9]{1,9})$/;
    return re.test(value);
  }

  ExporterJSON() {
    const content_json: string = JSON.stringify(this.mappedValues);
    const blob = new Blob([content_json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'transformation.json';
    link.click();
    window.URL.revokeObjectURL(url);
  }

  // Importe les données transformées depuis un fichier JSON
  async ImporterJSON(event: any) {
    const file = event.target.files[0];
    if (file) {
      const text = await file.text();
      this.mappedValues = JSON.parse(text);

      // Parcours chaque clé dans mappedValues pour ajuster les colonnes
      Object.keys(this.mappedValues).forEach((key) => {
        const entries = this.mappedValues[key];
        if (Array.isArray(entries)) {
          // Compte le nombre de colonnes pour chaque entrée
          this.columnCounts[key] = entries.length;

          // // Parcourt les entrées en fonction de la liste de 0 à 5
          // entries.forEach((entry, index) => {
          //   if (Array.isArray(entry)) {
          //     for (let i = 0; i < Math.min(entry.length, 5); i++) {
          //       console.log(
          //         `Clé: ${key}, Index: ${index}, Colonne: ${i}, Valeur:`,
          //         entry[i]
          //       );
          //     }
          //   }
          // });

          // Ajuste la colonne si nécessaire
          this.adjustColumnCount(key);
        }
      });
      this.mappedValues = JSON.parse(text);
    }
  }

  LetsGo() {
    this.action = $localize`Vérifier l'import`;
    const errorService = ErrorService.instance;
    this.riders_serv
      .SimulerImport(this.list_adh)
      .then((retour: AdherentImport[]) => {
        this.ListeCompare = retour;
        this.ListeCompare.forEach((a) => {
          if (a.import) {
            a.Import_A = a.import;
            a.source_A = a.source;
            a.Cible =a.source;
            console.log(a.Import_A);
            console.log(a.source_A);
            if (a.Import_A.id > 0) {
              a.Cible.id = a.Import_A.id;
            }

            if (!a.source_A.nom || a.source_A.nom.length == 0) {
              a.Cible.nom = a.Import_A.nom;
            }
            if (!a.source_A.prenom || a.source_A.prenom.length == 0) {
              a.Cible.prenom = a.Import_A.prenom;
            }
            if (!a.source_A.surnom || a.source_A.surnom.length == 0) {
              a.Cible.surnom = a.Import_A.surnom;
            }
            if (!a.source_A.date_naissance ) {
              a.Cible.date_naissance = a.Import_A.date_naissance;
            }
            if (!a.source_A.contact || a.source_A.contact.length == 0) {
              a.Cible.contact = a.Import_A.contact;
            }
            if (
              !a.source_A.contact_prevenir ||
              a.source_A.contact_prevenir.length == 0
            ) {
              a.Cible.contact_prevenir = a.Import_A.contact_prevenir;
            }
            if (!a.source_A.adresse) {
              a.Cible.adresse = a.Import_A.adresse;
            }
            a.Cible.sexe = a.source_A.sexe;
            if (a.source_A.inscrit || a.Import_A.inscrit) {
              a.Cible.inscrit = true;
            } else {
              a.Cible.inscrit = false;
            }

          } else {
            a.source_A = a.source;
            a.Cible = a.source_A;
          }
        });
        this.context = 'COMPARE';
      })
      .catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });
  }
  LetsGoBase() {
    
  }
}

export class AdherentImport {
  import: Adherent_VM;
  source: Adherent_VM;
  Cible: Adherent_VM;
  public Import_A: Adherent_VM;
  public source_A: Adherent_VM;
  public creer_adherent: boolean;
  public update_adherent: boolean;
  public inscrire_saison: boolean;
  public creer_compte: boolean;
  public rattacher_compte: boolean;
}
