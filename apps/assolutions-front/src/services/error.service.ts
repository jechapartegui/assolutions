import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { notification } from '../app/custom-notification/custom-notification.component';
import { code_alert } from '../app/global';
import { ApiError } from './api-client.service';

@Injectable({ providedIn: 'root' })
export class ErrorService {
  static instance: ErrorService;
  private readonly emitChangeSource = new Subject<notification>();
  changeEmitted$ = this.emitChangeSource.asObservable();

  constructor() {
    ErrorService.instance = this;
  }

  emitChange(error: notification): void {
    this.emitChangeSource.next(error);
  }

  CreateError(action: string, error: unknown): notification {
    return this.Create(action, this.getMessage(error), 'KO');
  }

  Create(action: string, content: string, alert: string): notification {
    const item = new notification();
    item.color =
      alert === 'OK'
        ? code_alert.OK
        : alert === 'Warning'
          ? code_alert.Warning
          : alert === 'Info'
            ? code_alert.Info
            : code_alert.KO;
    item.content = content;
    item.object = action;
    return item;
  }

  OKMessage(action: string, content = 'OK'): notification {
    return this.Create(action, content, 'OK');
  }

  Warning(action: string, content = $localize`Attention`): notification {
    return this.Create(action, content, 'Warning');
  }

  UnknownError(action: string): notification {
    return this.CreateError(action, 'UNKNOWN_ERROR');
  }

  getMessage(error: unknown): string {
    if (error instanceof ApiError) {
      return this.interpret_error(error.code, error.message);
    }

    if (error instanceof Error) {
      return this.interpret_error(error.message, error.message);
    }

    if (typeof error === 'string') {
      return this.interpret_error(error, error);
    }

    return $localize`Une erreur inconnue est survenue.`;
  }

  interpret_error(codeOrText: string, fallback?: string): string {
    const code = String(codeOrText ?? '').replace(/^Unauthorized\s+/i, '').trim();
    const messages: Record<string, string> = {
      TIMEOUT_ERROR: $localize`Le serveur met trop de temps à répondre. Réessayez dans quelques instants.`,
      NETWORK_ERROR: $localize`Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.`,
      SERVER_ERROR: $localize`Le serveur a rencontré une erreur. Réessayez dans quelques instants.`,
      ACCOUNT_ALREADY_EXISTS: $localize`Un compte existe déjà avec cette adresse. Connectez-vous ou demandez un nouveau lien d’activation.`,
      LOGIN_ALREADY_EXISTS: $localize`Un compte existe déjà avec cette adresse.`,
      ACCOUNT_NOT_FOUND: $localize`Compte non trouvé.`,
      NO_ACCOUNT_FOUND: $localize`Compte non trouvé.`,
      ACCOUNT_NOT_ACTIVE: $localize`Ce compte n’est pas encore actif.`,
      INACTIVE_ACCOUNT: $localize`Ce compte n’est pas encore actif.`,
      INCORRECT_PASSWORD: $localize`Mot de passe incorrect.`,
      INCORRECT_LOGIN: $localize`Identifiant incorrect.`,
      INCORRECT_TOKEN: $localize`Le lien utilisé est incorrect ou expiré.`,
      TOKEN_INVALID: $localize`Le lien utilisé est incorrect ou expiré.`,
      NO_PROJECT_LINKED: $localize`Aucun projet n’est rattaché à ce compte.`,
      NO_RIDER_ATTACHED: $localize`Aucun adhérent n’est rattaché à ce compte.`,
      DELETE_FAILED: $localize`Erreur lors de la suppression.`,
      UPDATE_FAILED: $localize`Erreur lors de la mise à jour.`,
      NO_SESSION_FOUND: $localize`Aucune séance trouvée.`,
      UNAUTHORIZED: $localize`Vous devez vous reconnecter.`,
      FORBIDDEN: $localize`Vous n’êtes pas autorisé à effectuer cette action.`,
      NOT_FOUND: $localize`La ressource demandée est introuvable.`,
      CONFLICT: $localize`Cette opération entre en conflit avec une donnée existante.`,
      UNKNOWN_ERROR: $localize`Une erreur inconnue est survenue.`,
    };

    return messages[code] ?? fallback ?? code ?? messages['UNKNOWN_ERROR'];
  }
}
