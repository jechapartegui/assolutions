import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Adresse } from 'src/class/address';
import { adherent, Adherent, AdherentExport } from 'src/class/adherent';
import { Adhesion } from 'src/class/adhesion';
import { ItemContact } from 'src/class/contact';
import { Groupe } from 'src/class/groupe';
import { Saison } from 'src/class/saison';
import { AdherentService } from 'src/services/adherent.service';
import { CompteService } from 'src/services/compte.service';
import { ErrorService } from 'src/services/error.service';
import { ExcelService } from 'src/services/excel.service';
import { GlobalService } from 'src/services/global.services';
import { GroupeService } from 'src/services/groupe.service';
import { InscriptionSaisonService } from 'src/services/inscription-saison.service';
import { MailService } from 'src/services/mail.service';
import { SaisonService } from 'src/services/saison.service';

@Component({
  selector: 'app-adherent',
  templateUrl: './adherent.component.html',
  styleUrls: ['./adherent.component.css'],
})
export class AdherentComponent implements OnInit {
  @Input() public context: 'LECTURE' | 'LISTE' | 'ECRITURE' = 'LISTE';
  public thisAdherent: Adherent = null;
  public action: string = '';
  public loading: boolean = false;
  public afficher_filtre: boolean = false;
  @ViewChild('scrollableContent', { static: false })
  scrollableContent!: ElementRef;
  showScrollToTop: boolean = false;
  @Input() public id: number;
  public liste_groupe: Groupe[] = [];
  public titre_groupe = $localize`Groupe de l'adhérent`;
  public liste_saison: Saison[] = [];
  public active_saison: Saison;
  public valid_address: boolean;
  public liste_adherents_VM: Adherent[] = [];
  public compte_to_force: boolean = false;
  public sort_nom = 'NO';
  public sort_date = 'NO';
  public sort_sexe = 'NO';

  public filters: FilterAdherent = new FilterAdherent();

  public selected_filter: string;
  public liste_groupe_filter: Groupe[];
  public valid_mail: boolean = false;
  public valid_tel: boolean = false;

  public login_adherent: string = '';
  public existing_login: boolean;
  public libelle_inscription = $localize`Inscrire`;
  public libelle_inscription_avec_paiement = $localize`Saisir inscription et paiement`;
  public libelle_retirer_inscription = $localize`Retirer l'inscription`;
  public selected_sort: any;
  public selected_sort_sens: any;
  public afficher_tri: boolean = false;

  constructor(
    public mail_serv: MailService,
    public inscription_saison_serv: InscriptionSaisonService,
    public excelService: ExcelService,
    public GlobalService: GlobalService,
    private router: Router,
    private saisonserv: SaisonService,
    private ridersService: AdherentService,
    private grServ: GroupeService,
    private route: ActivatedRoute,
    private compte_serv: CompteService
  ) {}

  ngOnInit(): void {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger la page`;
    this.loading = true;
    if (GlobalService.is_logged_in) {
      // Chargez la liste des cours
      this.saisonserv
        .GetAll()
        .then((sa) => {
          if (sa.length == 0) {
            this.loading = false;
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
          this.route.queryParams.subscribe((params) => {
            if ('id' in params) {
              this.id = params['id'];
              this.context = 'LECTURE';
            }
            if ('context' in params) {
              this.context = params['context'];
            }
          });
          if (this.context == 'LISTE') {
            if (GlobalService.menu === 'ADHERENT') {
              this.loading = false;
              this.router.navigate(['/menu']);
              GlobalService.selected_menu = 'MENU';
              return;
            }
          }
          if (this.context == 'ECRITURE' || this.context == 'LECTURE') {
            if (this.id == 0 && this.context == 'ECRITURE') {
              let adh = new adherent();
              this.thisAdherent = new Adherent(adh);
              this.loading = false;
            }
            if (this.id > 0) {
              this.ChargerAdherent();
            }
          }
          if (this.context == 'LISTE') {
            this.afficher_filtre = false;
            this.UpdateListeAdherents();
          }

          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
        })
        .catch((err: HttpErrorResponse) => {
          this.loading = false;
          let o = errorService.CreateError(
            $localize`récupérer les saisons`,
            err.message
          );
          errorService.emitChange(o);
          this.router.navigate(['/menu']);
          GlobalService.selected_menu = 'MENU';
          return;
        });
    } else {
      this.loading = false;
      let o = errorService.CreateError(
        this.action,
        $localize`Accès impossible, vous n'êtes pas connecté`
      );
      errorService.emitChange(o);
      this.router.navigate(['/login']);
    }
  }
  onGroupesUpdated(updatedGroupes: Groupe[]) {
    this.thisAdherent.Groupes = updatedGroupes;
    // Ici tu peux aussi déclencher d'autres actions, comme la sauvegarde ou la validation
  }

  UpdateListeAdherents() {
    const errorService = ErrorService.instance;
    this.action = $localize`Récupérer les adhérents`;

    this.grServ
      .GetAllEver(this.active_saison.id)
      .then((groupes) => {
        this.liste_groupe = groupes;
        this.liste_groupe_filter = groupes;

        this.ridersService
          .GetAdherentAdhesion(this.active_saison.id)
          .then((adh) => {
            this.liste_adherents_VM = adh.map((x) => new Adherent(x));
            this.loading = false;
          })
          .catch((err: HttpErrorResponse) => {
            this.loading = false;
            let o = errorService.CreateError(this.action, err.message);
            errorService.emitChange(o);
            return;
          });
      })
      .catch((err: HttpErrorResponse) => {
        this.loading = false;
        let o = errorService.CreateError(
          $localize`Récupérer les groupes`,
          err.message
        );
        errorService.emitChange(o);
        this.router.navigate(['/groupe']);
        GlobalService.selected_menu = 'GROUPE';
        return;
      });
  }
  calculateAge(dateNaissance: string): number {
    const today = new Date();
    const birthDate = new Date(dateNaissance);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  }

  getActiveSaison(): string {
    let s = this.liste_saison.find((x) => x == this.active_saison);
    if (s) {
      return s.nom;
    } else {
      return '';
    }
  }

  Create() {
    let adh: adherent = new adherent();
    this.thisAdherent = new Adherent(adh);
    this.context = 'ECRITURE';
    this.id = 0;
  }
  Edit(adh: Adherent) {
    this.context = 'ECRITURE';
    this.id = adh.ID;
    this.ChargerAdherent();
  }
  Read(adh: Adherent) {
    this.context = 'LECTURE';
    this.id = adh.ID;
    this.ChargerAdherent();
  }
  Register(adh: Adherent, saison_id: number, paiement: boolean) {
    const errorService = ErrorService.instance;
    this.action = $localize`Effectuer une inscription`;

    if (paiement) {
      let confirm = window.confirm(
        $localize`Voulez-vous basculer sur l'écran d'inscription avec paiement ?`
      );
      if (confirm) {
        this.router.navigate(['/inscription']);
      }
    } else {
      let confirm = window.confirm(
        $localize`Voulez-vous faire l'inscription sans enregistrer le paiement ?`
      );
      if (confirm) {
        this.inscription_saison_serv
          .Add(saison_id, adh.ID)
          .then((id) => {
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
          })
          .catch((err: HttpErrorResponse) => {
            let o = errorService.CreateError(this.action, err.message);
            errorService.emitChange(o);
          });
      }
    }
  }
  RemoveRegister(saison_id: number) {
    const errorService = ErrorService.instance;
    this.action = $localize`Supprimer une inscription`;
    let u = this.thisAdherent.Adhesions.find((x) => x.saison_id == saison_id);
    if (u) {
      let confirm = window.confirm(
        $localize`Voulez-vous supprimer l'inscription ?`
      );
      if (confirm) {
        this.inscription_saison_serv
          .Delete(u.id)
          .then((retour) => {
            if (retour) {
              let o = errorService.OKMessage(this.action);
              errorService.emitChange(o);
              this.thisAdherent.Adhesions = this.thisAdherent.Adhesions.filter(
                (x) => x.saison_id !== saison_id
              );
            } else {
              let o = errorService.UnknownError(this.action);
              errorService.emitChange(o);
            }
          })
          .catch((err: HttpErrorResponse) => {
            let o = errorService.CreateError(this.action, err.message);
            errorService.emitChange(o);
          });
      }
    } else {
      let o = errorService.UnknownError(this.action);
      errorService.emitChange(o);
    }
  }

  getSaison(id: number): string {
    return this.liste_saison.filter((x) => x.id == id)[0].nom;
  }

  ChargerAdherent() {
    this.thisAdherent = null;
    const errorService = ErrorService.instance;
    this.action = $localize`Récupérer l'adhérent`;
    if (GlobalService.menu == 'ADHERENT') {
      this.ridersService
        .Get_Adherent_My(this.id)
        .then((adh) => {
          this.thisAdherent = new Adherent(adh);
          this.loading = false;
        })
        .catch((err: HttpErrorResponse) => {
          this.loading = false;
          let o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
          this.router.navigate(['/menu']);
          GlobalService.selected_menu = 'MENU';
          return;
        });
    }
    if (GlobalService.menu == 'PROF') {
      this.ridersService
        .Get_Adherent_Prof(this.id)
        .then((adh) => {
          this.thisAdherent = new Adherent(adh);
        })
        .catch((err: HttpErrorResponse) => {
          let o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
          this.router.navigate(['/menu']);
          GlobalService.selected_menu = 'MENU';
          return;
        });
    }
    if (GlobalService.menu == 'ADMIN') {
      this.ridersService
        .Get_Adherent_Admin(this.id)
        .then((adh) => {
          this.thisAdherent = new Adherent(adh);
        })
        .catch((err: HttpErrorResponse) => {
          let o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
          this.router.navigate(['/menu']);
          GlobalService.selected_menu = 'MENU';
          return;
        });
    }
  }

  Delete(adh: Adherent) {
    const errorService = ErrorService.instance;
    this.action = $localize`Supprimer l'adhérent`;
    let confirm = window.confirm($localize`Voulez-vous supprimer l'adhérent ?`);
    if (confirm) {
      if (adh.Adhesions) {
        adh.Adhesions.forEach((adhesion) => {
          this.inscription_saison_serv.Delete(adhesion.id);
        });
      }
      if (adh.Groupes) {
        adh.Groupes.forEach((gr) => {
          this.grServ.DeleteLien(gr.lien_groupe_id);
        });
      }
      this.ridersService
        .Delete(adh.ID)
        .then((retour) => {
          if (retour) {
            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
            this.UpdateListeAdherents();
          } else {
            let o = errorService.UnknownError(this.action);
            errorService.emitChange(o);
          }
        })
        .catch((err: HttpErrorResponse) => {
          let o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
        });
    }
  }

  Save() {
    const errorService = ErrorService.instance;
    this.action = $localize`Sauvegarder l'adhérent`;
    if (this.thisAdherent.ID == 0) {
      this.ridersService
        .Add(this.thisAdherent.datasource)
        .then((id) => {
          this.thisAdherent.ID = id;
          this.id = id;
          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
        })
        .catch((err: HttpErrorResponse) => {
          let o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
        });
    } else {
      this.ridersService
        .Update(this.thisAdherent.datasource)
        .then((retour) => {
          if (retour) {
            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
          } else {
            let o = errorService.UnknownError(this.action);
            errorService.emitChange(o);
          }
        })
        .catch((err: HttpErrorResponse) => {
          let o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
        });
    }
  }

  Retour(lieu: 'LISTE' | 'LECTURE'): void {
    let confirm = window.confirm(
      $localize`Vous perdrez les modifications réalisées non sauvegardées, voulez-vous continuer ?`
    );
    if (confirm) {
      if (lieu == 'LISTE') {
        this.context = 'LISTE';
        this.UpdateListeAdherents();
      } else {
        this.context = 'LECTURE';
        this.ChargerAdherent();
      }
    }
  }

  Sort(sens: 'NO' | 'ASC' | 'DESC', champ: string) {
    switch (champ) {
      case 'nom':
        this.sort_nom = sens;
        this.sort_date = 'NO';
        this.sort_sexe = 'NO';
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
      case 'sexe':
        this.sort_sexe = sens;
        this.sort_date = 'NO';
        this.sort_nom = 'NO';
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
      case 'date':
        this.sort_sexe = 'NO';
        this.sort_date = sens;
        this.sort_nom = 'NO';
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
    this.liste_adherents_VM = [...this.liste_adherents_VM];
  }
  ReinitFiltre() {
    this.filters.filter_date_apres = null;
    this.filters.filter_date_avant = null;
    this.filters.filter_groupe = null;
    this.filters.filter_inscrit = null;
    this.filters.filter_nom = null;
    this.filters.filter_sexe = null;
  }
  GotoImport() {
    this.router.navigate(['/import-adherent']);
  }

  ExportExcel() {
    let headers = {
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
    };
    let list: Adherent[] = this.getFilteredAdherents();
    this.excelService.exportAsExcelFile(
      list.map((x) => new AdherentExport(x)),
      'liste_adherent',
      headers
    );
  }
  getFilteredAdherents(): Adherent[] {
    return this.liste_adherents_VM.filter((adherent) => {
      return (
        (!this.filters.filter_nom ||
          adherent.Libelle.toLowerCase().includes(
            this.filters.filter_nom.toLowerCase()
          )) &&
        (!this.filters.filter_date_avant ||
          new Date(adherent.DDN) <= new Date(this.filters.filter_date_avant)) &&
        (!this.filters.filter_date_apres ||
          new Date(adherent.DDN) >= new Date(this.filters.filter_date_apres)) &&
        (!this.filters.filter_sexe ||
          adherent.Sexe === this.filters.filter_sexe) &&
        (!this.filters.filter_groupe ||
          adherent.Groupes.find((x) =>
            x.nom
              .toLowerCase()
              .includes(this.filters.filter_groupe.toLowerCase())
          )) &&
        (!this.filters.filter_inscrit ||
          adherent.Inscrit === this.filters.filter_inscrit)
      );
    });
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

  StatutMAJ(ad: Adherent) {
    let n = this.liste_adherents_VM.find((x) => x.ID == ad.ID);
    if (n) {
      return true;
    }
    let u = this.liste_adherents_VM.find(
      (x) => x.Nom == ad.Nom && x.Prenom == ad.Prenom && x.DDN == ad.DDN
    );
    if (u) {
      return true;
    } else {
      return false;
    }
  }

  isRegistredSaison(saison_id: number) {
    let u = this.thisAdherent.Adhesions.find((x) => x.saison_id == saison_id);
    if (u) {
      return true;
    } else {
      return false;
    }
  }

  VoirPaiement() {}
  Rattacher(val: string) {
    const errorService = ErrorService.instance;
    this.action = $localize`Rattacher le compte`;
    this.compte_serv
      .AddOrMAJLogin(val, this.thisAdherent.ID)
      .then((id) => {
        this.thisAdherent.CompteID = id;
        let o = errorService.OKMessage(this.action);
        errorService.emitChange(o);
        this.ChargerAdherent();
      })
      .catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });
  }
  DemanderRattachement(val: string) {
    const errorService = ErrorService.instance;
    this.action = $localize`demander le rattachement du compte`;
    this.mail_serv
      .DemandeRattachement(val, this.thisAdherent.ID)
      .then((retour) => {
        if (retour) {
          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
          this.ChargerAdherent();
        } else {
          let o = errorService.UnknownError(this.action);
          errorService.emitChange(o);
        }
      })
      .catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });
  }

  ngAfterViewInit(): void {
    this.waitForScrollableContainer();
  }

  private waitForScrollableContainer(): void {
    setTimeout(() => {
      if (this.scrollableContent) {
        this.scrollableContent.nativeElement.addEventListener(
          'scroll',
          this.onContentScroll.bind(this)
        );
      } else {
        this.waitForScrollableContainer(); // Re-tente de le trouver
      }
    }, 100); // Réessaie toutes les 100 ms
  }

  onContentScroll(): void {
    const scrollTop = this.scrollableContent.nativeElement.scrollTop || 0;
    this.showScrollToTop = scrollTop > 200;
  }

  scrollToTop(): void {
    this.scrollableContent.nativeElement.scrollTo({
      top: 0,
      behavior: 'smooth', // Défilement fluide
    });
  }
}
export class FilterAdherent {
  private _filter_nom: string | null = null;
  get filter_nom(): string | null {
    return this._filter_nom;
  }
  set filter_nom(value: string | null) {
    this._filter_nom = value;
    this.onFilterChange();
  }

  private _filter_date_avant: Date | null = null;
  get filter_date_avant(): Date | null {
    return this._filter_date_avant;
  }
  set filter_date_avant(value: Date | null) {
    this._filter_date_avant = value;
    this.onFilterChange();
  }

  private _filter_date_apres: Date | null = null;
  get filter_date_apres(): Date | null {
    return this._filter_date_apres;
  }
  set filter_date_apres(value: Date | null) {
    this._filter_date_apres = value;
    this.onFilterChange();
  }

  private _filter_sexe: boolean | null = null;
  get filter_sexe(): boolean | null {
    return this._filter_sexe;
  }
  set filter_sexe(value: boolean | null) {
    this._filter_sexe = value;
    this.onFilterChange();
  }

  private _filter_inscrit: boolean | null = true;
  get filter_inscrit(): boolean | null {
    return this._filter_inscrit;
  }
  set filter_inscrit(value: boolean | null) {
    this._filter_inscrit = value;
    this.onFilterChange();
  }

  private _filter_groupe: string | null = null;
  get filter_groupe(): string | null {
    return this._filter_groupe;
  }
  set filter_groupe(value: string | null) {
    this._filter_groupe = value;
    this.onFilterChange();
  }

  private onFilterChange(): void {}
}
