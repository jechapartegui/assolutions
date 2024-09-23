import { Component, OnInit } from '@angular/core';
import { Adherent } from 'src/class/adherent';
import { Groupe } from 'src/class/groupe';
import { MailData } from 'src/class/mail';
import { seance } from 'src/class/seance';
import { AdherentService } from 'src/services/adherent.service';
import { GroupeService } from 'src/services/groupe.service';
import { SeancesService } from 'src/services/seance.service';

@Component({
  selector: 'app-envoi-mail',
  templateUrl: './envoi-mail.component.html',
  styleUrls: ['./envoi-mail.component.css']
})
export class EnvoiMailComponent implements OnInit {
  typemail : "SEANCE_DISPO";
  ouvert_type_mail :boolean = true;
  ouvert_param :boolean = false;
  ouvert_audience :boolean = false;
  ouvert_brouillon :boolean = false;
  ouvert_mail :boolean = false;
  date_fin:string;
  liste_groupe:Groupe[];
  groupe_selectionne:Groupe;
  liste_adherent:Adherent[];
  ListeUserSelectionne:Adherent[];
  adherent_selectionne:Adherent;
  seance_periode:seance[];
  seance_selectionnee:seance;
  liste_mail:MailData[];
  mail_selectionne:MailData;
  mail_a_generer:string;
  mail_genere:string;

  type_audience:"TOUS" | "GROUPE" | "SEANCE" | "ADHERENT" = "TOUS";
  etape : "SELECTION_MAIL" | "PARAMETRE" |"AUDIENCE" | "BROUILLON" | "ENVOI" = "SELECTION_MAIL";
  constructor(public adh_serv:AdherentService, public gr_serv:GroupeService, public seance_serv:SeancesService){}

  ngOnInit(): void {
      
  }
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  }
  MailSeanceDispo(){

    // Date dans un mois
    const auj = new Date();

    // Date dans un mois
    const nextMonth = new Date(auj);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    this.date_fin = this.formatDate(nextMonth);
    this.typemail = "SEANCE_DISPO";
    this.etape = "PARAMETRE";
    this.ouvert_type_mail = false;
    this.ouvert_param = true;
  }

  ValiderPlage(){
    this.etape = "AUDIENCE";
    this.ouvert_param = false;
    this.ouvert_audience = true;
  }


  AddUsers(){

  }

  AddGroupe(){

  }
  RemoveUsers(){

  }
  ValiderDestinataire(){}

  RemoveUser(user:Adherent){

  }
  GenererVue(){}

  vue(thisvue :"SELECTION_MAIL" | "PARAMETRE" |"AUDIENCE" | "BROUILLON" | "ENVOI"): boolean{
    return true;
  }

  AddSeanceTous(){}

  EnvoyerTousMail(){

  }

  AddSeancePresent(){

  }
  AddSeanceConvoque(){

  }

  Addherent(){

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
  ValiderFormatEmail(){

  }
  EnvoyerToutMail(){

  }
  EnvoiMail(){
    
  }

}
