import { Component, OnInit } from '@angular/core';

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
  date_fin:string;
  etape : "SELECTION_MAIL" | "PARAMETRE" |"AUDIENCE" | "FORMULATION" | "ENVOYE" = "SELECTION_MAIL";
  constructor(){}

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

}
