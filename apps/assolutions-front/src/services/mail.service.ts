import { Injectable } from '@angular/core';
import { environment } from '../environments/environment.prod';
import { GlobalService } from './global.services';
import { MailData } from '../class/mail';
import { KeyValuePairAny } from '@shared/lib/autres.interface';
import { MailInput } from '@shared/lib/mail-input.interface';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class MailService {

  url = environment.maseance;
  constructor(public global: GlobalService) {
  }
  public Mail(email: MailInput): Promise<any> {
    this.url = environment.maseance + 'api/mail/mail';

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
 this.url = environment.maseance + 'api/mail/mail_essai';
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

  public MailActivation(login:string): Promise<any> {
 this.url = environment.maseance + 'api/mail/mail_activation/' + login;

    return this.global.GET(this.url)
      .then((response: any) => {
        return response;
      })
      .catch((error: HttpErrorResponse) => {
        const message = error?.message || 'Erreur inconnue';
        console.error(message);        // Gestion de l'erreur
        return Promise.reject(message);
      });
  }

  public Envoyer(MailData:MailData):Promise<boolean>{
this.url = environment.maseance + 'api/mail/mail_data';
const body = {
  MailData :MailData
 }

    return this.global.POST(this.url, body)
      .then((response: boolean) => {
        return response;
      })
      .catch((error: HttpErrorResponse) => {
        const message = error?.message || 'Erreur inconnue';
        console.error(message);        // Gestion de l'erreur
        return Promise.reject(message);
      });
  }

public EnvoyerConvocationAnnulation(type:string, destinataire:number[], notes:string, seance_id:number):Promise<boolean>{
  this.url = environment.maseance + 'api/mail/mail_convoc_annulation';
const body = {
  type :type,
  destinataire:destinataire,
  notes:notes,
  seance_id:seance_id
 }

    return this.global.POST(this.url, body)
      .then((response: boolean) => {
        return response;
      })
      .catch((error: HttpErrorResponse) => {
        const message = error?.message || 'Erreur inconnue';
        console.error(message);        // Gestion de l'erreur
        return Promise.reject(message);
      });
  }
  public EnvoyerRelance(template: string, subject:string, destinataire:number[], variables:Record<string,any>, simuler:boolean = false):Promise<KeyValuePairAny[]>{
  this.url = environment.maseance + 'api/mail/mail_relance';
const body = {
  template :template,
  subject:subject,
  destinataire:destinataire,
  variables:variables,
  simuler:simuler
 }

    return this.global.POST(this.url, body)
      .then((response: KeyValuePairAny[]) => {
        return response;
      })
      .catch((error: HttpErrorResponse) => {
        const message = error?.message || 'Erreur inconnue';
        console.error(message);        // Gestion de l'erreur
        return Promise.reject(message);
      });
  }
public GetMail(type:string) : Promise<KeyValuePairAny>{
   this.url = environment.maseance + 'api/mail/get_mail/' + type;

    return this.global.GET(this.url)
      .then((response: KeyValuePairAny) => {
        return response;
      })
      .catch((error: HttpErrorResponse) => {
        const message = error?.message || 'Erreur inconnue';
        console.error(message);        // Gestion de l'erreur
        return Promise.reject(message);
      });
  }
public SauvegarderTemplate(template: string, subject:string, type_mail:string): Promise<boolean> {
   this.url = environment.maseance + 'api/mail/update/';
    //  this.url = this.url + "login.php";
    const body = {
      template: template,
      subject:subject,
      type_mail: type_mail
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
