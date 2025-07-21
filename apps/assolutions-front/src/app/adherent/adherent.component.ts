import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Adhesion,
  Type_Adhesion,
  paiement_adhesion,
} from '../../class/adhesion';
import { fluxfinancier } from '../../class/fluxfinancier';
import { operation } from '../../class/operation';
import { AdherentService } from '../../services/adherent.service';
import { ErrorService } from '../../services/error.service';
import { ExcelService } from '../../services/excel.service';
import { GlobalService } from '../../services/global.services';
import { GroupeService } from '../../services/groupe.service';
import { InscriptionSaisonService } from '../../services/inscription-saison.service';
import { MailService } from '../../services/mail.service';
import { SaisonService } from '../../services/saison.service';
import { AdherentExport, Adherent_VM } from '@shared/src/lib/member.interface';
import { KeyValuePair } from '@shared/src/lib/autres.interface';
import { Saison_VM } from '@shared/src/lib/saison.interface';
import { LienGroupe_VM } from '@shared/src';
import { Adresse } from '@shared/src/lib/adresse.interface';
import { InscriptionSaison_VM } from '@shared/src/lib/inscription_saison.interface';

@Component({
  selector: 'app-adherent',
  templateUrl: './adherent.component.html',
  styleUrls: ['./adherent.component.css'],
})
export class AdherentComponent implements OnInit {
  // === Inputs / ViewChild ===
  @Input() public context: 'LECTURE' | 'LISTE' | 'ECRITURE' = 'LISTE';
  @Input() public id: number;
  @ViewChild('scrollableContent', { static: false }) scrollableContent!: ElementRef;

  // === États généraux ===
  public loading = false;
  public action = '';
  public showScrollToTop = false;
  public dropdownActive = false;

  // === Données de l’adhérent ===
  public thisAdherent: Adherent_VM = null;
  public photoAdherent: string | null = null;
  public histo_adherent: string;
  public liste_adherents_VM: Adherent_VM[] = [];

  // === Groupes et saisons ===
  public liste_groupe: KeyValuePair[] = [];
  public liste_groupe_filter: KeyValuePair[];
  public titre_groupe = $localize`Groupe de l'adhérent`;
  public liste_saison: Saison_VM[] = [];
  public active_saison: Saison_VM;

  // === Filtres / tris ===
  public filters: FilterAdherent = new FilterAdherent();
  public selected_filter: string;
  public sort_nom = 'NO';
  public sort_date = 'NO';
  public sort_sexe = 'NO';
  public selected_sort: any;
  public selected_sort_sens: any;
  public afficher_tri = false;
  public afficher_filtre = false;

  // === Texte et traduction ===
  public titre_contact = $localize`Contacts de l'adhérent`;
  public titre_contact_prevenir = $localize`Contacts à prévenir de l'adhérent`;
  public libelle_inscription = $localize`Inscrire`;
  public libelle_inscription_avec_paiement = $localize`Saisir inscription et paiement`;
  public libelle_retirer_inscription = $localize`Retirer l'inscription`;

  // === Verification ===
  public adherentValide: boolean = false;
  public AdresseValide: boolean;
  public ContactValide: boolean;
  public ContactUrgenceValide: boolean;

  // === Inscription / adhésion ===
  public afficher_inscription = false;
  public adherent_inscription: Adherent_VM;
  public saison_inscription: Saison_VM;
  public paiement_adhesion: boolean;
  public type_inscription: boolean;

  // === Données liées au compte ===
  public login_adherent: string = '';
  public existing_login: boolean;
  public compte_to_force: boolean = false;

  // === État de l’édition UI ===
  public edit_info_adresse = false;
  public edit_info_perso = false;

  // === Constructeur ===
  constructor(
    public mail_serv: MailService,
    public inscription_saison_serv: InscriptionSaisonService,
    public excelService: ExcelService,
    public GlobalService: GlobalService,
    private router: Router,
    private saisonserv: SaisonService,
    private ridersService: AdherentService,
    private grServ: GroupeService,
    private route: ActivatedRoute
  ) {}
  ngOnInit(): void {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger la page`;
    this.loading = true;
    if (GlobalService.is_logged_in) {
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
            if (GlobalService.menu === 'ADMIN') {
              this.router.navigate(['/saison']);
            } else {
              this.router.navigate(['/menu']);
              GlobalService.selected_menu = 'MENU';
            }
            return;
          }
          this.liste_saison = sa;
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
            if (
              GlobalService.menu === 'APPLI' &&
              GlobalService.prof === false
            ) {
              this.loading = false;
              this.router.navigate(['/menu']);
              GlobalService.selected_menu = 'MENU';
              return;
            }
          }
          if (this.context == 'ECRITURE' || this.context == 'LECTURE') {
            if (this.id == 0 && this.context == 'ECRITURE') {
              this.thisAdherent = new Adherent_VM();
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
  onGroupesUpdated(updatedGroupes: LienGroupe_VM[]) {
    this.thisAdherent.inscriptionsSaison[0].groupes = updatedGroupes;
  }

  UpdateListeAdherents() {
    const errorService = ErrorService.instance;
    this.action = $localize`Récupérer les adhérents`;

    this.grServ
      .GetAll()
      .then((groupes) => {
        this.liste_groupe = groupes;
        this.liste_groupe_filter = groupes;

        this.ridersService
          .GetAdherentAdhesion(this.active_saison.id)
          .then((adh) => {
            this.liste_adherents_VM = adh;
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
  calculateAge(dateNaissance: Date): number {
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

  EditerBloc(bloc: string) {
    switch (bloc) {
      case 'info_adresse':
        this.edit_info_adresse = !this.edit_info_adresse;
        break;
      case 'info_perso':
        this.edit_info_perso = !this.edit_info_perso;
        break;
    }
  }

  getActiveSaison(): string {
    let s = this.liste_saison.find((x) => x == this.active_saison);
    if (s) {
      return s.nom;
    } else {
      return '';
    }
  }


valid_adherent(isValid: boolean): void {
  this.adherentValide = isValid;
}
valid_adresse(isValid: boolean): void {
  this.AdresseValide = isValid;
}
valid_contact(isValid: boolean): void {
  this.ContactValide = isValid;
}
valid_contact_urgence(isValid: boolean): void {
  this.ContactUrgenceValide = isValid;
}


  Create() {
    this.thisAdherent = new Adherent_VM();
    this.context = 'ECRITURE';
    this.id = 0;
  }
  Edit(adh: Adherent_VM) {
    this.context = 'ECRITURE';
    this.id = adh.id;
    this.ChargerAdherent();
  }
  Read(adh: Adherent_VM) {
    this.context = 'LECTURE';
    this.id = adh.id;
    this.ChargerAdherent();
  }
  Register(adh: Adherent_VM, saison_id: number, paiement: boolean) {
    this.afficher_inscription = true;
    this.adherent_inscription = adh;
    this.saison_inscription = this.liste_saison.find((x) => x.id == saison_id);
    if (paiement) {
      this.type_inscription = true;
    } else {
      this.type_inscription = false;
    }
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
          .Add(saison_id, adh.id)
          .then((id) => {
            let i = new InscriptionSaison_VM();
            i.id = id;
            i.rider_id = adh.id;
            i.saison_id = saison_id;
            if (!adh.inscriptionsSaison) {
              adh.inscriptionsSaison = [];
            }
            adh.inscriptionsSaison.push(i);
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
  CreerPaiement(
    adh: Adhesion,
    type_a: Type_Adhesion,
    libelle_nom: string,
    libelle_saison: string
  ) {
    let dd: string;
    let st: number = 0;
    if (type_a.paiements.length == 1) {
      if (type_a.date_paiement_fixe) {
        dd = type_a.paiements[0].date_prevue;
      } else {
        dd = new Date().toISOString().slice(0, 10);
        st = 1;
      }
      let ff: fluxfinancier = new fluxfinancier();
      ff.date = dd;
      ff.montant = type_a.paiements[0].montant;
      ff.classe_comptable = type_a.classe_comptable_id;
      ff.recette = true;
      ff.statut = st;
      ff.libelle =
        $localize`Adhésion ` +
        type_a.libelle +
        $localize` pour la saison ` +
        libelle_saison +
        $localize` de ` +
        libelle_nom;
      let o: operation = new operation();
      o.solde = type_a.paiements[0].montant;
      o.date_operation = dd;
      o.mode = type_a.mode_paiement;
      o.compte_bancaire_id = type_a.compte_id;
      o.paiement_execute = st;
      ff.operations.push(o);
      let paiement: paiement_adhesion = {
        numero: 1,
        date_prevue: dd,
        montant: type_a.paiements[0].montant,
      };
      adh.paiements.push(paiement);
    } else {
      let ff: fluxfinancier = new fluxfinancier();
      ff.date = dd;
      ff.montant = type_a.paiements[0].montant;
      ff.classe_comptable = type_a.classe_comptable_id;
      ff.recette = true;
      ff.statut = 0;
      ff.libelle =
        $localize`Adhésion ` +
        type_a.libelle +
        $localize` pour la saison ` +
        libelle_saison +
        $localize` de ` +
        libelle_nom;
      for (let i = 0; i < type_a.paiements.length; i++) {
        let o: operation = new operation();
        o.solde = type_a.paiements[i].montant;
        o.date_operation = type_a.paiements[i].date_prevue;
        o.mode = type_a.mode_paiement;
        o.compte_bancaire_id = type_a.compte_id;
        o.paiement_execute = 0;
        ff.operations.push(o);
        let paiement: paiement_adhesion = {
          numero: i + 1,
          date_prevue: type_a.paiements[i].date_prevue,
          montant: type_a.paiements[i].montant,
        };
        adh.paiements.push(paiement);
      }
    }
  }

  RemoveRegister(saison_id: number) {
    const errorService = ErrorService.instance;
    this.action = $localize`Supprimer une inscription`;
    let u = this.thisAdherent.inscriptionsSaison.find((x) => x.saison_id == saison_id);
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
              this.thisAdherent.inscriptionsSaison = this.thisAdherent.inscriptionsSaison.filter(
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
  createBlobUrl(base64Data: string): string {
  const byteString = atob(base64Data.split(',')[1]);
  const mimeString = base64Data.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([ab], { type: mimeString });
  return URL.createObjectURL(blob);
}

  async ChargerAdherent() {
    this.thisAdherent = null;
    const errorService = ErrorService.instance;
    this.action = $localize`Récupérer l'adhérent`;
    try {
      const adh = await this.ridersService.Get(this.id);
      if (!adh) {
        this.loading = false;

        let o = errorService.CreateError(
          this.action,
          $localize`Aucun adhérent trouvé`
        );
        errorService.emitChange(o);
        this.router.navigate(['/menu']);
        GlobalService.selected_menu = 'MENU';
        return;
      } else {
        this.thisAdherent = adh;
        this.ridersService.GetPhoto(this.id).then((PhotBase64) =>{


          console.log('Photo récupérée avec succès', PhotBase64);
           this.photoAdherent =this.createBlobUrl(PhotBase64); // pour Angular
        })
      }
    } catch (err: any) {
      this.loading = false;
      let o = errorService.CreateError(
        this.action,
        err.message || $localize`Erreur inconnue`
      );
      errorService.emitChange(o);
      this.router.navigate(['/menu']);
      GlobalService.selected_menu = 'MENU';
    }

    if (
      GlobalService.menu == 'APPLI' &&
      GlobalService.prof == false
    ) {
      return;
    } else if (
      GlobalService.menu == 'APPLI' &&
      GlobalService.prof == true
    ) {
      return;
    } else if (GlobalService.menu == 'ADMIN') {
      return;
    }
  }

  Delete(adh: Adherent_VM) {
    const errorService = ErrorService.instance;
    this.action = $localize`Supprimer l'adhérent`;
    let confirm = window.confirm($localize`Voulez-vous supprimer l'adhérent ?`);
    if (confirm) {
      if (adh.inscriptionsSaison) {
        adh.inscriptionsSaison.forEach((adhesion) => {
          this.inscription_saison_serv.Delete(adhesion.id);
        });
      }
      if (adh.inscriptionsSaison[0]) {
        adh.inscriptionsSaison[0].groupes.forEach((gr) => {
          this.grServ.DeleteLien(adh.id, "rider",Number(gr.id));
        });
      }
      this.ridersService
        .Delete(adh.id)
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
  SaveAdresse(thisAdresse :Adresse){
    this.thisAdherent.adresse = thisAdresse;
    this.PreSave();
  }

onPhotoSelectedFromChild(base64Photo: string): void {
  this.photoAdherent = base64Photo; // utile si tu veux que ça déclenche un Save() aussi
    this.ridersService.UpdatePhoto(this.thisAdherent.id, base64Photo).then((test) =>{
      console.log('Photo mise à jour avec succès', test);
    }).catch((error) => {
      console.error('Erreur lors de la mise à jour de la photo', error);

    }); // ✅ Appel de ta méthode avec un objet
}

PreSave() {
  if(this.adherentValide && this.AdresseValide && this.ContactValide && this.ContactUrgenceValide) {
    this.Save();
  }
}

  Save() {
    const errorService = ErrorService.instance;
    this.action = $localize`Sauvegarder l'adhérent`;
    if (this.thisAdherent.id == 0) {
      this.ridersService
        .Add(this.thisAdherent)
        .then((id) => {
          this.thisAdherent.id = id;
          this.id = id;
          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
          this.histo_adherent = JSON.stringify(this.thisAdherent);
        })
        .catch((err: HttpErrorResponse) => {
          let o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
        });
    } else {
      this.ridersService
        .Update(this.thisAdherent)
        .then((retour) => {
          if (retour) {
            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
            this.histo_adherent = JSON.stringify(this.thisAdherent);
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
    const ret_adh = JSON.stringify(this.thisAdherent);
    if (this.histo_adherent != ret_adh) {
      let confirm = window.confirm(
        $localize`Vous perdrez les modifications réalisées non sauvegardées, voulez-vous continuer ?`
      );
      if (!confirm) {
        return;
      }
    }
    if (lieu == 'LISTE') {
      this.context = 'LISTE';
      this.UpdateListeAdherents();
    } else {
      this.context = 'LECTURE';
      this.ChargerAdherent();
    }
  }

  Sort(sens: 'NO' | 'ASC' | 'DESC', champ: string) {
    switch (champ) {
      case 'nom':
        this.sort_nom = sens;
        this.sort_date = 'NO';
        this.sort_sexe = 'NO';
        this.liste_adherents_VM.sort((a, b) => {
          const nomA = a.libelle.toUpperCase();
          const nomB = b.libelle.toUpperCase();
          let comparaison = 0;
          if (nomA > nomB) {
            comparaison = 1;
          } else if (nomA < nomB) {
            comparaison = -1;
          }

          return this.sort_nom === 'ASC' ? comparaison : -comparaison;
        });
        break;
      case 'sexe':
        this.sort_sexe = sens;
        this.sort_date = 'NO';
        this.sort_nom = 'NO';
        this.liste_adherents_VM.sort((a, b) => {
          const lieuA = a.sexe;
          const lieuB = b.sexe;

          let comparaison = 0;
          if (lieuA > lieuB) {
            comparaison = 1;
          } else if (lieuA < lieuB) {
            comparaison = -1;
          }

          return this.sort_sexe === 'ASC' ? comparaison : -comparaison;
        });
        break;
      case 'date':
        this.sort_sexe = 'NO';
        this.sort_date = sens;
        this.sort_nom = 'NO';
        this.liste_adherents_VM.sort((a, b) => {
          let dateA = a.date_naissance;
          let dateB = b.date_naissance;

          let comparaison = 0;
          if (dateA > dateB) {
            comparaison = 1;
          } else if (dateA < dateB) {
            comparaison = -1;
          }

          return this.sort_date === 'ASC' ? comparaison : -comparaison;
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
    let list: Adherent_VM[] = this.getFilteredAdherents();
    this.excelService.exportAsExcelFile(
      list.map((x) => new AdherentExport(x)),
      'liste_adherent',
      headers
    );
  }
  getFilteredAdherents(): Adherent_VM[] {
    return this.liste_adherents_VM.filter((adherent) => {
      return (
        (!this.filters.filter_nom ||
          adherent.libelle.toLowerCase().includes(
            this.filters.filter_nom.toLowerCase()
          )) &&
        (!this.filters.filter_date_avant ||
          new Date(adherent.date_naissance) <= new Date(this.filters.filter_date_avant)) &&
        (!this.filters.filter_date_apres ||
          new Date(adherent.date_naissance) >= new Date(this.filters.filter_date_apres)) &&
        (!this.filters.filter_sexe ||
          adherent.sexe === this.filters.filter_sexe) &&
        (!this.filters.filter_groupe ||
          adherent.inscriptionsSaison[0].groupes.find((x) =>
            x.nom
              .toLowerCase()
              .includes(this.filters.filter_groupe.toLowerCase())
          )) &&
        (!this.filters.filter_inscrit ||
          adherent.inscrit === this.filters.filter_inscrit)
      );
    });
  }


  StatutMAJ(ad: Adherent_VM) {
    let n = this.liste_adherents_VM.find((x) => x.id == ad.id);
    if (n) {
      return true;
    }
    let u = this.liste_adherents_VM.find(
      (x) => x.nom == ad.nom && x.prenom == ad.prenom && x.date_naissance == ad.date_naissance
    );
    if (u) {
      return true;
    } else {
      return false;
    }
  }

  isRegistredSaison(saison_id: number) {
    let u = this.thisAdherent.inscriptionsSaison.find((x) => x.saison_id == saison_id);
    if (u) {
      return true;
    } else {
      return false;
    }
  }

  Rattacher(val: string) {

  }
  DemanderRattachement(val: string) {
    const errorService = ErrorService.instance;
    this.action = $localize`demander le rattachement du compte`;
    this.mail_serv
      .DemandeRattachement(val, this.thisAdherent.id)
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
        this.waitForScrollableContainer();
      }
    }, 100);
  }

  onContentScroll(): void {
    const scrollTop = this.scrollableContent.nativeElement.scrollTop || 0;
    this.showScrollToTop = scrollTop > 200;
  }

  scrollToTop(): void {
    this.scrollableContent.nativeElement.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  toggleDropdown() {
    this.dropdownActive = !this.dropdownActive;
  }

  handleAction(action: string) {
    console.log(`Action exécutée : ${action}`);
    this.dropdownActive = false;
  }

  Fermer(avecreload: boolean = false) {
    console.log(avecreload);
    this.afficher_inscription = false;
    if (avecreload) {
      this.loading = true;
      this.UpdateListeAdherents();
    }
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
