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

@Component({
  selector: 'app-import-adherent',
  templateUrl: './import-adherent.component.html',
  styleUrls: ['./import-adherent.component.css']
})
export class ImportAdherentComponent implements OnInit { 
  headers = {
    ID: 'ID',
    Nom: 'Nom',
    Prenom: 'Prénom',
    DDN: 'Date de naissance',
    Sexe: 'Sexe',
    Street: 'Numéro et voie',
    PostCode: 'Code postal',
    City: 'Ville',
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
    DDNExcel: 'Date de naissance format Excel',
    NumVoie: 'Numéro dans la voie',
    TypeVoie: 'Type de voie',
    LibelleVoie: 'Libellé de la voie',
    ComplementAdresse: 'Complément adresse',
  };
  file: File | null = null;
  liste_adherents_export:Adherent[];
  action:string = "";
  liste_saison:Saison[];
  active_saison:Saison;
  constructor(public excelService:ExcelService, public riders_serv:AdherentService, public saisonserv:SaisonService, public router:Router){

  }

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

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.file = input.files[0];
      this.ImporterExcel();
    }
  }

  ImporterExcel() {
    this.excelService
      .importFromExcelFile(this.file, this.headers)
      .subscribe((data) => {
        this.liste_adherents_export = this.mapToAdherentExport(data);
        this.riders_serv.SimulerImport(this.liste_adherents_export).then((liste) =>{
          
        })
      });
  }

  private mapToAdherentExport(data: any[]): Adherent[] {
    return data.map((item) => {
      let liste_insc: Adhesion[] = [];
      if (item.Inscrit) {
        let insc: Adhesion = new Adhesion();
        insc.saison_id = this.active_saison.id;
        liste_insc.push(insc);
      }
      let list_item_contact: ItemContact[] = [];
      if (item.Mail && item.Mail.length > 0) {
        list_item_contact.push({
          Type: 'EMAIL',
          Value: item.Mail,
          Pref: item.MailPref,
          Notes: '',
        });
      }
      if (item.Phone && item.Phone.length > 0) {
        list_item_contact.push({
          Type: 'PHONE',
          Value: item.Phone,
          Pref: item.PhonePref,
          Notes: '',
        });
      }
      let list_item_contact_urg: ItemContact[] = [];
      if (item.MailUrgence && item.MailUrgence.length > 0) {
        list_item_contact_urg.push({
          Type: 'EMAIL',
          Value: item.MailUrgence,
          Notes: item.NomMailUrgence,
          Pref: false,
        });
      }
      if (item.PhoneUrgence && item.PhoneUrgence.length > 0) {
        list_item_contact_urg.push({
          Type: 'PHONE',
          Value: item.PhoneUrgence,
          Notes: item.NomPhoneUrgence,
          Pref: false,
        });
      }
      const adherent = new Adherent(
        {
          id: item.ID,
          nom: item.Nom,
          prenom: item.Prenom,
          date_naissance: item.DDN,
          sexe: item.Sexe,
          adresse: JSON.stringify({
            Street: item.Street,
            PostCode: item.PostCode,
            City: item.City,
            Country: item.Country,
          }),
          contacts: JSON.stringify(list_item_contact),
          surnom: item.Surnom,
          date_creation: new Date(),
          photo: '',
          nationalite: '',
          seances: [],
          groupes: [],
          mot_de_passe: '',
          compte: 0,
          login: item.Login,
          inscriptions: [],
          inscrit: liste_insc.length > 0 ? true : false,
          seances_prof: [],
          adhesions: liste_insc,
          contacts_prevenir: JSON.stringify(list_item_contact_urg),
          // Ajoute d'autres champs si nécessaire
        }
        //item.Inscrit  // On peut passer un ID de saison ici si nécessaire
      );
      return adherent;
    });
  }
}
