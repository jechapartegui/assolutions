import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Adresse } from '../../class/address';
import { Adherent, adherent } from '../../class/adherent';
import { ItemContact } from '../../class/contact';
import { KeyValuePair } from '../../class/keyvaluepair';
import { professeur } from '../../class/professeur';
import { Seance } from '../../class/seance';
import { AdherentService } from '../../services/adherent.service';
import { ErrorService } from '../../services/error.service';
import { InscriptionSeanceService } from '../../services/inscription-seance.service';
import { LieuService } from '../../services/lieu.service';
import { MailService } from '../../services/mail.service';
import { ProfesseurService } from '../../services/professeur.service';
import { SeancesService } from '../../services/seance.service';

@Component({
  selector: 'app-seances-essais',
  templateUrl: './seances-essais.component.html',
  styleUrls: ['./seances-essais.component.css']
})
export class SeancesEssaisComponent implements OnInit {
  public date_debut: string;
  public DateDeb: Date;
  public DateFin: Date;
  public thisEssai: Adherent = null;
  public ListeSeance: Seance[] = []
  public days: string[] = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  public listeprof: professeur[];
  public listelieu: KeyValuePair[];
  public project_id: number;
  public thisSeance: Seance = null;
  public valid_mail: boolean = false;
  public valid_tel: boolean = false;
  public valid_address: boolean = false;
  public essai: boolean = false;
  public action: string = "";
  public seanceText: string = "";
  constructor(public insc_sean_serv:InscriptionSeanceService, public mail_serv:MailService, public route: ActivatedRoute, public sean_serv: SeancesService, public rider_serv: AdherentService, public prof_serv: ProfesseurService, public lieuserv: LieuService) {

  }
  ngOnInit(): void {
    const errorService = ErrorService.instance;
    this.route.queryParams.subscribe(params => {
      if ('annulation' in params) {
        let cancel = params['annulation'];
        this.action = $localize`Annuler son essai`;
        this.insc_sean_serv.Delete(cancel).then((retour) =>{
          if (retour) {
            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);

          } else {
            let o = errorService.UnknownError(this.action);
            errorService.emitChange(o);

          }
        }).catch((err) => {
          let o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
        });
        return;
      } 
      if ('id' in params) {
        this.project_id = params['id'];
      } else {
        return;
      } 
      if ('date_debut' in params) {
        this.date_debut = params['date_debut'];
      } else {
        this.date_debut = new Date(new Date().setDate(new Date().getDate())).toISOString().split('T')[0];
      }
      this.calculateWeekDates(this.date_debut);
      this.generateSeanceText();
    }
    );
    this.GetPlageDate();
  }
  public GetPlageDate() {
    this.sean_serv.GetPlageDate(this.date_debut, this.project_id).then((seances) => {
      this.ListeSeance = seances.map(x => new Seance(x));
      this.ListeSeance.sort((a, b) => {
        const nomA = a.heure_debut // Ignore la casse lors du tri
        const nomB = b.heure_debut;
        let comparaison = 0;
        if (nomA > nomB) {
          comparaison = 1;
        } else if (nomA < nomB) {
          comparaison = -1;
        }

        return comparaison; // Inverse pour le tri descendant
      });
    });
  }
  private calculateWeekDates(dateString: string): void {
    const inputDate = new Date(dateString);

    // Trouver le lundi de la semaine
    const dayOfWeek = inputDate.getDay(); // 0 (Dimanche) à 6 (Samedi)
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek; // Ajuste si le jour est Dimanche (0)
    this.DateDeb = new Date(inputDate);
    this.DateDeb.setDate(inputDate.getDate() + diffToMonday);

    // Trouver le dimanche de la semaine
    this.DateFin = new Date(this.DateDeb);
    this.DateFin.setDate(this.DateDeb.getDate() + 6);
  }

  private generateSeanceText(): void {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const dateDebStr = this.DateDeb.toLocaleDateString('fr-FR', options);
    const dateFinStr = this.DateFin.toLocaleDateString('fr-FR', options);
    this.seanceText = `Liste des séances du ${dateDebStr} au ${dateFinStr}`;
  }
  getSeancesForDay(dayIndex: number): any[] {
    return this.ListeSeance.filter(seance => {
      const date = new Date(seance.date_seance); // Convertir en objet Date
      let jsDayIndex = date.getDay(); // Obtenir le jour de la semaine (0 à 6)
      
      // Ajuster pour que 1 = lundi, 7 = dimanche
      jsDayIndex = jsDayIndex === 0 ? 7 : jsDayIndex; // Si dimanche (0), passer à 7

      return jsDayIndex === dayIndex;
    });
  }
  ChangeSemaine(boo: boolean) {
    const currentDate = new Date(this.date_debut);

    // Ajuster la date_debut de 7 jours en avant ou en arrière
    if (boo) {
      currentDate.setDate(currentDate.getDate() + 7); // Avancer de 7 jours
    } else {
      currentDate.setDate(currentDate.getDate() - 7); // Reculer de 7 jours
    }

    // Mettre à jour la date_debut avec la nouvelle date
    this.date_debut = currentDate.toISOString().split('T')[0];

    // Recalculer les dates de début et de fin de semaine
    this.calculateWeekDates(this.date_debut);

    this.GetPlageDate();
    // Mettre à jour le texte affiché
    this.generateSeanceText();
  }
  Essayer(seance: Seance) {
    let libelle: string = $localize`Avant de saisir votre essai, êtes-vous sûr de bien être éligible à la séance ? `;
    if (seance.EstAgeMinimum) {
      libelle += "\n" + $localize`Age minimum : ` + seance.AgeMinimum + " " + $localize`ans`;
    }
    if (seance.EstAgeMaximum) {
      libelle += "\n" + $localize`Age maximum : ` + seance.AgeMaximum + " " + $localize`ans`;
    }
    if (window.confirm(libelle)) {
      this.thisSeance = seance;
      let ad = new adherent();
      this.thisEssai = new Adherent(ad);
      this.essai = true;
    }
  }

  onValidMailChange(isValid: boolean) {
    this.valid_mail = isValid;
  }

  onValidTelChange(isValid: boolean) {
    this.valid_tel = isValid;
  }
  onValidContactChange(data: ItemContact[]) {
    this.thisEssai.datasource.contacts = JSON.stringify(data);
    this.thisEssai.Contacts = data;

  }
  onValidContactUrgenceChange(data: ItemContact[]) {
    this.thisEssai.datasource.contacts_prevenir = JSON.stringify(data);
    this.thisEssai.ContactsUrgence = data;
  }
  onValidAdresseChange(isValid: boolean) {
    this.valid_address = isValid;
  }
  onAdresseChange(data: Adresse) {
    this.thisEssai.Adresse = data;
    this.thisEssai.datasource.adresse = JSON.stringify(data);
  }
  Retour() {
    let libelle = $localize`Les informations saisies seront perdues, voulez-vous continuer? `;
    if (window.confirm(libelle)) {
      this.thisSeance = null;
      this.thisEssai = null;
      this.essai = false;
    }
  }
  Confirmer() {
    const errorService = ErrorService.instance;
    this.action = $localize`Essayer une séance`;
    this.rider_serv.Essayer(this.thisEssai.datasource, this.thisSeance.ID, this.project_id).then((ID) => {
      if (ID > 0) {
        let mail = this.thisEssai.Contacts.filter(x => x.Type=="EMAIL")[0].Value;
        this.mail_serv.EnvoiMailEssai(this.thisEssai.datasource, this.thisSeance.datasource, mail,ID, this.project_id).then((retour) => {
          if (retour) {
            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);

          } else {
            let o = errorService.UnknownError(this.action);
            errorService.emitChange(o);

          }
        }).catch((err) => {
          this.action = $localize`Essayer une séance OK mais envoi mail confirmation KO`;
          let o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
        });
        this.thisSeance = null;
        this.thisEssai = null;
        this.essai = false;
      } else {
        let o = errorService.CreateError(this.action, $localize`Aucune séance créée`);
        errorService.emitChange(o);
      }
    }).catch((err) => {
      let o = errorService.CreateError(this.action, err.message);
      errorService.emitChange(o);
    });
  }
}
