import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { notification } from '../app/custom-notification/custom-notification.component';
import { code_alert } from '../app/global';
@Injectable({
  providedIn: 'root'
})
export class ErrorService {
  static instance: ErrorService;
  private emitChangeSource = new Subject<any>();
  constructor() {
    ErrorService.instance = this;
  }
  changeEmitted$ = this.emitChangeSource.asObservable();

  emitChange(err) {
    this.emitChangeSource.next(err);
  }

  CreateError(action, statusText): notification {
    let o = new notification();
    o.content = this.interpret_error(statusText);
    o.object = action;
    o.color = code_alert.KO;
    return o;
  }
  Create(action, content, _code_alert): notification {
    let o = new notification();
    o.color = code_alert.KO;
    if (_code_alert == "OK") {
      o.color = code_alert.OK;
    }
    if (_code_alert == "Warning") {
      o.color = code_alert.Warning;
    }
    if (_code_alert == "Info") {
      o.color = code_alert.Info;
    }
    o.content = content;
    o.object = action;
    return o;
  }

  OKMessage(action: string): notification {
    let o = new notification();
    o.content = "OK";
    o.object = action;
    o.color = code_alert.OK;
    return o;
  }
  Warning(action: string): notification {
    let o = new notification();
    o.content = $localize`Attention`;
    o.object = action;
    o.color = code_alert.Warning;
    return o;
  }
  UnknownError(action: string): notification {
    let o = new notification();
    o.content = $localize`Erreur inconnue`;
    o.object = action;
    o.color = code_alert.KO;
    return o;
  }

  interpret_code_error(code: number): string {
    switch (code) {
      case 206:
        return "Erreur fonctionnelle : ";
      default:
      case 401:
        return "Non autorisé";
    }
  }
  interpret_error(text: string): string {
    console.log(text);
    switch (text) {
       case "NO_SESSION_FOUND":
        return $localize`Pas de séances trouvées`;
      case "NO_ACCOUNT_FOUND":
      case "ACCOUNT_NOT_FOUND":
      case "Unauthorized ACCOUNT_NOT_FOUND":
        return $localize`Compte non trouvé`;
      case "ACCOUNT_NOT_ACTIVE":
      case "Unauthorized ACCOUNT_NOT_ACTIVE":
        return $localize`Compte non actif`;
      case "DELETE_FAILED":
      case "Unauthorized DELETE_FAILED":
        return $localize`Erreur lors de la suppression`;
      default:
        return "Erreur inconnue : " + text;
      case "NO_USER_FOUND":
        return "Login incorrect";
      case "LOGIN_ALREADY_EXISTS":
      case "Unauthorized LOGIN_ALREADY_EXISTS":
        return "Le login existe déjà merci d'en choisir un autre"
      case "NO_OBJECT_FOUND":
      case "Unauthorized NO_OBJECT_FOUND":
        return "Pas d'objet trouvé";
      case "NO_ID_FOUND":
      case "Unauthorized NO_ID_FOUND":
        return "Pas d'ID trouvé";
      case "Unauthorized NO_COMMAND_FOUND":
        return "Pas de commande trouvée";
      case "Unauthorized NO_NAME_FOUND":
        return "Pas de nom trouvé"
      case "Unauthorized NO_LOGIN_FOUND":
        return "Pas de login trouvé";
      case "INCORRECT_LOGIN":
      case "Unauthorized INCORRECT_LOGIN":
        return "Login incorrect";
      case "INCORRECT_TOKEN":
      case "Unauthorized INCORRECT_TOKEN":
        return "Token incorrect";
      case "INCORRECT_PASSWORD":
      case "Unauthorized INCORRECT_PASSWORD":
        return "Mot de passe incorrect";
      case "Unauthorized NO_VALUE_SET":
        return "Valeur non saisie";
      case "UPDATE_FAILED":
        return $localize`Erreur lors de la mise à jour`;
      case "Unauthorized TOKEN_INVALID":
      case "TOKEN_INVALID":
        return $localize`Jeton invalide`;
      case "Unauthorized INACTIVE_ACCOUNT":
      case "INACTIVE_ACCOUNT":
        return $localize`Compte inactif`;
      case "Unauthorized NO_RIDER_ATTACHED":
      case "NO_RIDER_ATTACHED":
        return $localize`Pas d'adhérent rattaché au compte`;
      case "Unauthorized NO_PROJECT_LINKED":
      case "NO_PROJECT_LINKED":
        return $localize`Aucun projet rattaché au compte`;
      case "Unauthorized NO_TOKEN_ACCOUNT":
      case "NO_TOKEN_ACCOUNT":
        return $localize`Ce compte possède un mot de passe, renvoi de Token impossible.`;
      case "Unauthorized NO_PASSWORD_ACCOUNT":
      case "NO_PASSWORD_ACCOUNT":
        return $localize`Ce compte ne possède pas de mot de passe, connexion avec Token uniquement.`;
    }
  }

}
