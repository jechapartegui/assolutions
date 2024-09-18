import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment.prod';
import { GlobalService } from './global.services';
import { adherent } from 'src/class/adherent';
import { seance } from 'src/class/seance';

@Injectable({
  providedIn: 'root'
})
export class MailService {
  url = environment.maseance;
  constructor(public global: GlobalService) {
 }
 public Test(): Promise<boolean> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
  this.url = environment.maseance + 'maseance/mail_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"test"
  };

  return this.global.POST(this.url, body)
    .then((response: boolean) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public EnvoiMailEssai(essai:adherent, seance:seance, mail:string, id:number, project_id:number): Promise<boolean> {
  this.url = environment.maseance + 'maseance/mail_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"mail_essai",
    essai:essai,
    seance:seance,
    mail:mail,
    id:id,
    project_id:project_id
  };

  return this.global.POST(this.url, body)
    .then((response: boolean) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public DemandeRattachement(login:string, rider_id:number): Promise<boolean> {
  this.url = environment.maseance + 'maseance/mail_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"demander_rattachement",
    login:login,
    rider_id:rider_id
  };

  return this.global.POST(this.url, body)
    .then((response: boolean) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
}
