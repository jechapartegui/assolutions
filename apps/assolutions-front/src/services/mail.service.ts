import { Injectable } from '@angular/core';
import { environment } from '../environments/environment.prod';
import { GlobalService } from './global.services';
import { MailData } from '../class/mail';
import { KeyValuePairAny } from '@shared/src/lib/autres.interface';
import { Adherent_VM, Seance_VM } from '@shared/src';

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
public EnvoiMailEssai(essai:Adherent_VM, seance:Seance_VM, mail:string, id:number, project_id:number): Promise<boolean> {
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
public Envoyer(mail:MailData):Promise<boolean>{
  this.url = environment.maseance + 'maseance/mail_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"send",
    mail:mail
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

public GetTemplate(type_mail:string):Promise<string>{
  this.url = environment.maseance + 'maseance/mail_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"get_template",
    type_mail:type_mail
  };

  return this.global.POST(this.url, body)
    .then((response: string) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public GetSubjecct(type_mail:string):Promise<string>{
  this.url = environment.maseance + 'maseance/mail_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"get_subject",
    type_mail:type_mail
  };

  return this.global.POST(this.url, body)
    .then((response: string) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public ChargerTemplateUser(type_mail:string,template:string, subject:string, liste_users:number[], params:KeyValuePairAny[]):Promise<MailData[]>{
  this.url = environment.maseance + 'maseance/mail_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"charger_template_users",
    type_mail:type_mail,
    template:template,
    liste_users:liste_users,
    params:params,
    subject:subject
  };

  return this.global.POST(this.url, body)
    .then((response: MailData[]) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
}
