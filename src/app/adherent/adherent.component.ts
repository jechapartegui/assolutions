import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Adresse } from 'src/class/address';
import { adherent, Adherent, AdherentExport } from 'src/class/adherent';
import { Adhesion } from 'src/class/adhesion';
import { ItemContact } from 'src/class/contact';
import { Groupe } from 'src/class/groupe';
import { Saison } from 'src/class/saison';
import { AdherentService } from 'src/services/adherent.service';
import { ErrorService } from 'src/services/error.service';
import { ExcelService } from 'src/services/excel.service';
import { GlobalService } from 'src/services/global.services';
import { GroupeService } from 'src/services/groupe.service';
import { InscriptionSaisonService } from 'src/services/inscription-saison.service';
import { SaisonService } from 'src/services/saison.service';

@Component({
  selector: 'app-adherent',
  templateUrl: './adherent.component.html',
  styleUrls: ['./adherent.component.css']
})
export class AdherentComponent implements OnInit {
  @Input() public context: "LECTURE" | "LISTE" | "ECRITURE" = "LISTE";
  public thisAdherent: Adherent = null;
  public action: string = "";
  public inscrits: number = null;
  public afficher_filtre: boolean = false;
  @Input() public id: number;
  public liste_groupe: Groupe[] = [];
  public titre_groupe = $localize`Groupe de l'adhérent`;
  public liste_saison: Saison[] = [];
  public active_saison: Saison;
  public valid_address: boolean;
  public liste_adherents_VM: Adherent[] = [];
  public sort_nom = "NO";
  public sort_date = "NO";
  public sort_sexe = "NO";
  public filter_date_avant: Date;
  public filter_date_apres: Date;
  public filter_nom: string;
  public filter_sexe: boolean;
  public filter_groupe: number;
  public liste_groupe_filter: Groupe[];

  public valid_mail: boolean = false;
  public valid_tel: boolean = false;


  public libelle_inscription = $localize`Inscrire`;
  public libelle_inscription_avec_paiement = $localize`Saisir inscription et paiement`;
  public libelle_retirer_inscription = $localize`Retirer l'inscription`;
  constructor(public inscription_saison_serv: InscriptionSaisonService, public excelService: ExcelService, public GlobalService: GlobalService, private router: Router, private saisonserv: SaisonService, private ridersService: AdherentService, private grServ: GroupeService, private route: ActivatedRoute) { }

  ngOnInit(): void {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger la page`;
    if (GlobalService.is_logged_in) {

      // Chargez la liste des cours
      this.grServ.GetAll().then((groupes) => {
        this.liste_groupe = groupes;
        this.liste_groupe_filter = groupes;
        this.saisonserv.GetAll().then((sa) => {
          if (sa.length == 0) {
            let o = errorService.CreateError($localize`Récupérer les saisons`, $localize`Il faut au moins une saison pour créer un cours`);
            errorService.emitChange(o);
            if (GlobalService.menu === "ADMIN" || GlobalService.menu == "PROF") {
              this.router.navigate(['/saison']);

            } else {
              this.router.navigate(['/menu']);
              GlobalService.selected_menu = "MENU";
            }
            return;
          }
          this.liste_saison = sa.map(x => new Saison(x));
          this.active_saison = this.liste_saison.filter(x => x.active == true)[0];
          this.route.queryParams.subscribe(params => {
            if ('id' in params) {
              this.id = params['id'];
              this.context = "LECTURE";
            }
            if ('context' in params) {
              this.context = params['context'];

            }
          })
          if (this.context == "LISTE") {
            if (GlobalService.menu === "ADHERENT") {
              this.router.navigate(['/menu']);
              GlobalService.selected_menu = "MENU";
              return;
            }
          }
          if (this.context == "ECRITURE" || this.context == "LECTURE") {
            if (this.id == 0 && this.context == "ECRITURE") {
              let adh = new adherent();
              this.thisAdherent = new Adherent(adh);
            }
            if (this.id > 0) {
              this.ChargerAdherent();

            }

          }
          if (this.context == "LISTE") {
            this.inscrits = this.active_saison.id;
            this.afficher_filtre = false;
            this.UpdateListeAdherents();

          }

          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
        }).catch((err: HttpErrorResponse) => {
          let o = errorService.CreateError($localize`récupérer les saisons`, err.message);
          errorService.emitChange(o);
          this.router.navigate(['/menu']);
          GlobalService.selected_menu = "MENU";
          return;
        })


      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError($localize`Récupérer les groupes`, err.message);
        errorService.emitChange(o);
        this.router.navigate(['/groupe']);
        GlobalService.selected_menu = "GROUPE";
        return;
      });

    } else {
      let o = errorService.CreateError(this.action, $localize`Accès impossible, vous n'êtes pas connecté`);
      errorService.emitChange(o);
      this.router.navigate(['/login']);
    }
  }

  UpdateListeAdherents() {
    const errorService = ErrorService.instance;
    this.action = $localize`Récupérer les adhérents`;
    this.ridersService.GetAdherentAdhesion().then((adh) => {
      this.liste_adherents_VM = adh.map(x => new Adherent(x));
    }).catch((err: HttpErrorResponse) => {
      let o = errorService.CreateError(this.action, err.message);
      errorService.emitChange(o);
      return;
    });

  }
  calculateAge(dateNaissance: string): number {
    const today = new Date();
    const birthDate = new Date(dateNaissance);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  Creer() {
    let adh: adherent = new adherent();
    this.thisAdherent = new Adherent(adh);
    this.context = "ECRITURE";
    this.id = 0;
  }
  Edit(adh: Adherent) {
    this.context = "ECRITURE";
    this.id = adh.ID;
    this.ChargerAdherent();
  }
  Read(adh: Adherent) {
    this.context = "LECTURE";
    this.id = adh.ID;
    this.ChargerAdherent();
  }
  Register(adh: Adherent, saison_id: number, paiement: boolean) {
    const errorService = ErrorService.instance;
    this.action = $localize`Effectuer une inscription`;
    if (paiement) {
      let confirm = window.confirm($localize`Voulez-vous basculer sur l'écran d'inscription avec paiement ?`);
      if (confirm) {
        this.router.navigate(['/inscription']);
      }
    } else {
      let confirm = window.confirm($localize`Voulez-vous faire l'inscription sans enregistrer le paiement ?`);
      if (confirm) {
        this.inscription_saison_serv.Add(saison_id, adh.ID).then((id) => {
          let i = new Adhesion();
          i.id = id;
          i.rider_id = adh.ID;
          i.saison_id = saison_id;
          if (!adh.Adhesions) {
            adh.Adhesions = [];
          }
          adh.Adhesions.push(i);
          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
        }).catch((err: HttpErrorResponse) => {
          let o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
        })
      }
    }

  }
  RemoveRegister(saison_id: number) {
    const errorService = ErrorService.instance;
    this.action = $localize`Supprimer une inscription`;
    let u = this.thisAdherent.Adhesions.find(x => x.saison_id == saison_id);
    if (u) {

      let confirm = window.confirm($localize`Voulez-vous supprimer l'inscription ?`);
      if (confirm) {
        this.inscription_saison_serv.Delete(u.id).then((retour) => {
          if (retour) {
            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
            this.thisAdherent.Adhesions = this.thisAdherent.Adhesions.filter(x => x.saison_id !== saison_id);
          } else {
            let o = errorService.CreateError(this.action, $localize`Erreur inconnue`);
            errorService.emitChange(o);
          }

        }).catch((err: HttpErrorResponse) => {
          let o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
        })
      }
    } else {
      
      let o = errorService.CreateError(this.action, $localize`Erreur inconnue`);
      errorService.emitChange(o);
    }
  }
  isRegistred(adh: Adherent): boolean {
    if (adh.Adhesions.filter(x => x.saison_id == this.active_saison.id).length > 0) {
      return true;
    } else {
      return false;
    }
  }

  getSaison(id: number): string {
    return this.liste_saison.filter(x => x.id == id)[0].nom;
  }

  ChargerAdherent() {
    this.thisAdherent = null;
    const errorService = ErrorService.instance;
    this.action = $localize`Récupérer l'adhérent`;
    if (GlobalService.menu == "ADHERENT") {
      this.ridersService.Get_Adherent_My(this.id).then((adh) => {
        this.thisAdherent = new Adherent(adh);
      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        this.router.navigate(['/menu']);
        GlobalService.selected_menu = "MENU";
        return;
      })
    }
    if (GlobalService.menu == "PROF") {
      this.ridersService.Get_Adherent_Prof(this.id).then((adh) => {
        this.thisAdherent = new Adherent(adh);
      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        this.router.navigate(['/menu']);
        GlobalService.selected_menu = "MENU";
        return;
      })
    }
    if (GlobalService.menu == "ADMIN") {
      this.ridersService.Get_Adherent_Admin(this.id).then((adh) => {
        this.thisAdherent = new Adherent(adh);
      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        this.router.navigate(['/menu']);
        GlobalService.selected_menu = "MENU";
        return;
      })
    }

  }

  Delete(adh: Adherent) {
    const errorService = ErrorService.instance;
    this.action = $localize`Supprimer l'adhérent`;    
    let confirm = window.confirm($localize`Voulez-vous supprimer l'adhérent ?`);
    if (confirm) {
      adh.Adhesions.forEach((adhesion) =>{
        this.inscription_saison_serv.Delete(adhesion.id);
      })
      adh.Groupes.forEach((gr) =>{
        this.grServ.DeleteLien(gr.lien_groupe_id);
      })
      this.ridersService.Delete(adh.ID).then((retour) => {
        if (retour) {
          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
          this.ChargerAdherent();
        } else {
          let o = errorService.CreateError(this.action, $localize`Erreur inconnue`);
          errorService.emitChange(o);
        }

      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      })
    }
  }

  Save() {
    const errorService = ErrorService.instance;
    this.action = $localize`Sauvegarder l'adhérent`;
    if (this.thisAdherent.ID == 0) {
      this.ridersService.Add(this.thisAdherent.datasource).then((id) => {
        this.thisAdherent.ID = id;
        let o = errorService.OKMessage(this.action);
        errorService.emitChange(o);
      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      })
    } else {
      this.ridersService.Update(this.thisAdherent.datasource).then((retour) => {
        if (retour) {
          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);

        } else {
          let o = errorService.CreateError(this.action, $localize`Erreur inconnue`);
          errorService.emitChange(o);
        }
      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      })
    }

  }


  Retour(lieu: "LISTE" | "LECTURE"): void {

    let confirm = window.confirm($localize`Vous perdrez les modifications réalisées non sauvegardées, voulez-vous continuer ?`);
    if (confirm) {
      if (lieu == "LISTE") {
        this.context = "LISTE";
        this.UpdateListeAdherents();
      } else {
        this.context = "LECTURE";
        this.ChargerAdherent();
      }
    }
  }

  Sort(sens: "NO" | "ASC" | "DESC", champ: string) {
    switch (champ) {
      case "nom":
        this.sort_nom = sens;
        this.sort_date = "NO";
        this.sort_sexe = "NO";
        this.liste_adherents_VM.sort((a, b) => {
          const nomA = a.Libelle.toUpperCase(); // Ignore la casse lors du tri
          const nomB = b.Libelle.toUpperCase();
          let comparaison = 0;
          if (nomA > nomB) {
            comparaison = 1;
          } else if (nomA < nomB) {
            comparaison = -1;
          }

          return this.sort_nom === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
        });
        break;
      case "sexe":
        this.sort_sexe = sens;
        this.sort_date = "NO";
        this.sort_nom = "NO";
        this.liste_adherents_VM.sort((a, b) => {
          const lieuA = a.Sexe;
          const lieuB = b.Sexe;


          let comparaison = 0;
          if (lieuA > lieuB) {
            comparaison = 1;
          } else if (lieuA < lieuB) {
            comparaison = -1;
          }

          return this.sort_sexe === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
        });
        break;
      case "date":
        this.sort_sexe = "NO";
        this.sort_date = sens;
        this.sort_nom = "NO";
        this.liste_adherents_VM.sort((a, b) => {
          let dateA = a.DDN;
          let dateB = b.DDN;

          let comparaison = 0;
          if (dateA > dateB) {
            comparaison = 1;
          } else if (dateA < dateB) {
            comparaison = -1;
          }

          return this.sort_date === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
        });
        break;

    }


  }

  ReinitFiltre() {
    this.filter_date_apres = null;
    this.filter_date_avant = null;
    this.filter_sexe = null;
    this.filter_groupe = null;
    this.filter_nom = null;
  }
  ImporterExcel() {

  }
  ExporterExcel() {
    const headers = {
      ID: 'ID',
      Nom: 'Nom',
      Prenom: 'Prénom',
      DDN: 'Date de naissance',
      Sexe: 'Sexe',
      Contacts: 'Contact',
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
      Adhesion: 'Inscrit'

      // Ajoutez d'autres mappages si nécessaire
    };

    this.excelService.exportAsExcelFile(this.liste_adherents_VM.map(x => new AdherentExport(x, this.active_saison.id)), 'liste_adherent', headers);
  }
  onValidMailChange(isValid: boolean) {
    this.valid_mail = isValid;
  }

  onValidTelChange(isValid: boolean) {
    this.valid_tel = isValid;
  }
  onValidContactChange(data: ItemContact[]) {
    this.thisAdherent.datasource.contacts = JSON.stringify(data);
    this.thisAdherent.Contacts = data;

  }
  onValidContactUrgenceChange(data: ItemContact[]) {
    this.thisAdherent.datasource.contacts_prevenir = JSON.stringify(data);
    this.thisAdherent.ContactsUrgence = data;
  }
  onValidAdresseChange(isValid: boolean) {
    this.valid_address = isValid;
  }
  onAdresseChange(data: Adresse) {
    this.thisAdherent.Adresse = data;
    this.thisAdherent.datasource.adresse = JSON.stringify(data);
  }

  isRegistredSaison(saison_id: number) {
    let u = this.thisAdherent.Adhesions.find(x => x.saison_id == saison_id);
    if (u) {
      return true;
    } else {
      return false;
    }
  }
  VoirPaiement() {

  }
}
