import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Adherent } from 'src/class/adherent';
import { Groupe } from 'src/class/groupe';
import { KeyValuePairAny } from 'src/class/keyvaluepair';
import { MailData } from 'src/class/mail';
import { seance } from 'src/class/seance';
import { AdherentService } from 'src/services/adherent.service';
import { ErrorService } from 'src/services/error.service';
import { GroupeService } from 'src/services/groupe.service';
import { MailService } from 'src/services/mail.service';
import { ProjetService } from 'src/services/projet.service';
import { SeancesService } from 'src/services/seance.service';

@Component({
  selector: 'app-envoi-mail',
  templateUrl: './envoi-mail.component.html',
  styleUrls: ['./envoi-mail.component.css']
})
export class EnvoiMailComponent implements OnInit {
  typemail: "SEANCE_DISPO";
  ouvert_type_mail: boolean = true;
  ouvert_param: boolean = false;
  ouvert_audience: boolean = false;
  ouvert_brouillon: boolean = false;
  ouvert_mail: boolean = false;
  date_debut: string;
  date_fin: string;
  params: KeyValuePairAny[];
  action: string;
  liste_groupe: Groupe[];
  groupe_selectionne: Groupe;
  liste_adherent: Adherent[];
  ListeUserSelectionne: Adherent[] = [];
  adherent_selectionne: Adherent;
  seance_periode: seance[];
  seance_selectionnee: seance;
  liste_mail: MailData[];
  selected_mail: MailData;
  mail_selectionne: MailData;
  mail_a_generer: MailData;
  subject_mail_a_generer: string;
  type_audience: "TOUS" | "GROUPE" | "SEANCE" | "ADHERENT" = "TOUS";
  etape: "SELECTION_MAIL" | "PARAMETRE" | "AUDIENCE" | "BROUILLON" | "ENVOI" = "SELECTION_MAIL";
  constructor(public adh_serv: AdherentService, public gr_serv: GroupeService, public seance_serv: SeancesService, public mail_serv: MailService, public proj_serv: ProjetService) { }

  ngOnInit(): void {

  }
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  }
  MailSeanceDispo() {

    // Date dans un mois
    const auj = new Date();

    // Date dans un mois
    const nextMonth = new Date(auj);
    this.date_debut = this.formatDate(auj);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    this.date_fin = this.formatDate(nextMonth);
    this.typemail = "SEANCE_DISPO";
    this.etape = "PARAMETRE";
    this.ouvert_type_mail = false;
    this.ouvert_param = true;
  }

  ValiderPlage() {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger l'audience`;
    this.adh_serv.GetAllActiveSaison().then((list) => {
      this.liste_adherent = list.map(w => new Adherent(w));
      this.gr_serv.GetAll().then((lg) => {
        this.liste_groupe = lg;
        this.seance_serv.GetSeances().then((seances) => {
          this.seance_periode = seances;
          this.etape = "AUDIENCE";
          this.ouvert_param = false;
          this.ouvert_audience = true;
        }).catch((err: HttpErrorResponse) => {
          let o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
        })
      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      })
    }).catch((err: HttpErrorResponse) => {
      let o = errorService.CreateError(this.action, err.message);
      errorService.emitChange(o);
    })
  }


  AddUsers() {
    this.ListeUserSelectionne = [];
    this.liste_adherent.forEach((e) => {
      let te = this.ListeUserSelectionne.find(x => x.ID == e.ID);
      if (!te) {
        this.ListeUserSelectionne.push(e);
      }
    })
  }

  AddGroupe() {

  }
  RemoveUsers() {
    this.ListeUserSelectionne = [];
  }
  ValiderDestinataire() {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger le template du mail`;
    this.etape = "BROUILLON";
    this.ouvert_brouillon = true;
    this.ouvert_audience = false;
    this.mail_serv.GetTemplate(this.typemail).then((content) => {
      this.mail_a_generer = new MailData();
      this.mail_a_generer.content = content;
      this.params = [];
      if (this.typemail == "SEANCE_DISPO") {
        this.params.push(new KeyValuePairAny("date_debut", this.date_debut));
        this.params.push(new KeyValuePairAny("date_fin", this.date_fin));
      }
      this.mail_serv.GetSubjecct(this.typemail).then((suj) => {
        this.mail_a_generer.subject = suj;
        this.action = $localize`Charger le contenu du mail`;
        this.mail_serv.ChargerTemplateUser(this.typemail, this.mail_a_generer.content, this.mail_a_generer.subject, this.ListeUserSelectionne.map(x => x.ID), this.params).then((liste_mail) => {
          this.liste_mail = liste_mail;
          this.selected_mail = this.liste_mail[0];
        }).catch((err: HttpErrorResponse) => {
          let o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
        })
      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      })
    }).catch((err: HttpErrorResponse) => {
      let o = errorService.CreateError(this.action, err.message);
      errorService.emitChange(o);
    })
  }

  RemoveUser(user: Adherent) {
    this.ListeUserSelectionne = this.ListeUserSelectionne.filter(x => x.ID !== user.ID);
  }
  GenererVue() {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger le contenu du mail`;
    this.mail_serv.ChargerTemplateUser(this.typemail, this.mail_a_generer.content, this.mail_a_generer.subject, this.ListeUserSelectionne.map(x => x.ID), this.params).then((liste_mail) => {
      this.liste_mail = liste_mail;
      this.selected_mail = this.liste_mail[0];
    }).catch((err: HttpErrorResponse) => {
      let o = errorService.CreateError(this.action, err.message);
      errorService.emitChange(o);
    })
  }

  SauvegarderTemplate() {
    const errorService = ErrorService.instance;
    this.action = $localize`Sauvegarder le template`;
    this.proj_serv.SauvegarderTemplate(this.mail_a_generer.content, this.mail_a_generer.subject, this.typemail).then((ok) => {
      if (ok) {
        let o = errorService.OKMessage(this.action);
        errorService.emitChange(o);
      } else {
        let o = errorService.UnknownError(this.action);
        errorService.emitChange(o);
      }
    }).catch((err: HttpErrorResponse) => {
      let o = errorService.CreateError(this.action, err.message);
      errorService.emitChange(o);
    })
  }

  vue(thisvue: "SELECTION_MAIL" | "PARAMETRE" | "AUDIENCE" | "BROUILLON" | "ENVOI"): boolean {
    switch (this.etape) {
      case "SELECTION_MAIL":
        if (thisvue == "SELECTION_MAIL") {
          return true;
        } else {
          return false;
        }
      case "PARAMETRE":
        if (thisvue == "SELECTION_MAIL" || thisvue == "PARAMETRE") {
          return true;
        } else {
          return false;
        }
      case "AUDIENCE":
        if (thisvue == "SELECTION_MAIL" || thisvue == "PARAMETRE" || thisvue == "AUDIENCE") {
          return true;
        } else {
          return false;
        }
      case "BROUILLON":
        if (thisvue == "ENVOI") {
          return false;
        } else {
          return true;
        }
      case "ENVOI":
        return true;

    }

  }

  AddSeanceTous() { }


  AddSeancePresent() {

  }
  AddSeanceConvoque() {

  }

  Addherent() {
    console.log(this.adherent_selectionne);
    if (!this.ListeUserSelectionne.find(x => x.ID == this.adherent_selectionne.ID)) {
      this.ListeUserSelectionne.push(this.adherent_selectionne);
    }
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
  ValiderFormatEmail() {

  }
  EnvoyerTousLesMails() {

  }
  EnvoiMail() {
    const errorService = ErrorService.instance;
    this.action = $localize`Envoyer l'email`;
    this.mail_serv.Envoyer(this.selected_mail).then((ok) => {
      if (ok) {
        let o = errorService.OKMessage(this.action);
        errorService.emitChange(o);
      } else {
        let o = errorService.UnknownError(this.action);
        errorService.emitChange(o);
      }
    }).catch((err: HttpErrorResponse) => {
      let o = errorService.CreateError(this.action, err.message);
      errorService.emitChange(o);
    })
  }

}
