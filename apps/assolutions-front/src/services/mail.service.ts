import { Injectable } from '@angular/core';
import { environment } from '../environments/environment.prod';
import { GlobalService } from './global.services';
import { MailData } from '../class/mail';
import { KeyValuePairAny } from '@shared/src/lib/autres.interface';
import { MailInput } from '@shared/src/lib/mail-input.interface';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class MailService {

  url = environment.maseance;
  constructor(public global: GlobalService) {
  }
  public Mail(email: MailInput): Promise<any> {
    this.url = 'api/mail/mail';

    return this.global.POST(this.url, email)
      .then((response: any) => {
        return response;
      })
      .catch((error: HttpErrorResponse) => {
        console.error('Erreur brute', error);
        const message = error?.message || 'Erreur inconnue';
        console.error(message);        // Gestion de l'erreur
        return Promise.reject(message);
      });
  }
public EnvoiMailEssai(personId:number, sessionId:number): Promise<any> {
 this.url = 'api/mail/mail_essai';
const body = {
  personId :personId,
  sessionId:sessionId
 }

    return this.global.POST(this.url, body)
      .then((response: any) => {
        return response;
      })
      .catch((error: HttpErrorResponse) => {
        const message = error?.message || 'Erreur inconnue';
        console.error(message);        // Gestion de l'erreur
        return Promise.reject(message);
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
