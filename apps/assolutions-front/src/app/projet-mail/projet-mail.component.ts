import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ErrorService } from '../../services/error.service';
import { MailProjectApiService } from '../../services/mail-project-api.service';
import { MailProjectTemplateType } from '@shared/lib/mail-project.interface';
import { AppStore } from '../app.store';

export type TemplateType = MailProjectTemplateType;

@Component({
  standalone: false,
  selector: 'app-projet-mail',
  templateUrl: './projet-mail.component.html',
  styleUrls: ['./projet-mail.component.css'],
})
export class ProjetMailComponent implements OnInit {
  uiLock = false;

  types: TemplateType[] = [
    'relance',
    'annulation',
    'convocation',
    'bienvenue',
    'serie_seance',
    'essai',
    'vide',
  ];
  typeActif: TemplateType = 'relance';

  sujet = '';
  html = '';

  placeholdersGlobaux: string[] = [];
  placeholdersLoop: string[] = [];
  formGlobaux: Record<string, string> = {};
  formLoopItems: Array<Record<string, string>> = [];

  previewSubject = '';
  previewHtml = '';

  testEmail = '';
  testInfo = '';
  testError = '';

  constructor(
    private readonly mail: MailProjectApiService,
    private readonly appStore: AppStore,
  ) {}

  ngOnInit(): void {
    this.testEmail = String(this.appStore.compte()?.login ?? '').trim();
    this.chargerTemplate(this.typeActif);
  }

  get fieldsCount(): number {
    return this.placeholdersGlobaux.length + this.placeholdersLoop.length;
  }

  get testEmailValid(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.testEmail.trim());
  }

  get canSendTest(): boolean {
    return this.testEmailValid && !!this.html.trim();
  }

  typeLabel(type: TemplateType): string {
    const labels: Record<TemplateType, string> = {
      relance: 'Relance',
      annulation: 'Annulation',
      convocation: 'Convocation',
      bienvenue: 'Bienvenue',
      serie_seance: 'Série de séances',
      essai: 'Essai',
      vide: 'Mail libre',
    };
    return labels[type];
  }

  activerType(type: TemplateType): void {
    if (this.typeActif === type) return;
    this.typeActif = type;
    this.chargerTemplate(type);
  }

  detecterChamps(): void {
    const { global, loop } = this.getPlaceholders(`${this.sujet}\n${this.html}`);
    this.placeholdersGlobaux = global;
    this.placeholdersLoop = loop;

    const previousGlobals = this.formGlobaux;
    this.formGlobaux = Object.fromEntries(
      global.map((key) => [key, previousGlobals[key] ?? '']),
    );

    this.formLoopItems = this.formLoopItems.map((row) =>
      Object.fromEntries(loop.map((key) => [key, row[key] ?? ''])),
    );

    if (loop.length > 0 && this.formLoopItems.length === 0) {
      this.ajouterLigneLoop(false);
    }
    if (loop.length === 0) {
      this.formLoopItems = [];
    }

    this.genererPreview();
  }

  remplirExemples(): void {
    for (const key of this.placeholdersGlobaux) {
      this.formGlobaux[key] = this.exampleValue(key, 0);
    }

    if (this.placeholdersLoop.length > 0 && this.formLoopItems.length === 0) {
      this.ajouterLigneLoop(false);
    }

    this.formLoopItems.forEach((row, index) => {
      for (const key of this.placeholdersLoop) {
        row[key] = this.exampleValue(key, index);
      }
    });

    this.genererPreview();
  }

  ajouterLigneLoop(refresh = true): void {
    const row: Record<string, string> = {};
    for (const key of this.placeholdersLoop) row[key] = '';
    this.formLoopItems = [...this.formLoopItems, row];
    if (refresh) this.genererPreview();
  }

  supprimerLigneLoop(index: number): void {
    this.formLoopItems = this.formLoopItems.filter((_, i) => i !== index);
    this.genererPreview();
  }

  genererPreview(): void {
    this.previewSubject = this.renderTemplate(
      this.sujet,
      this.formGlobaux,
      this.formLoopItems,
    );
    this.previewHtml = this.renderTemplate(
      this.html,
      this.formGlobaux,
      this.formLoopItems,
    );
    this.testInfo = '';
    this.testError = '';
  }

  sauvegarder(): void {
    const errorService = ErrorService.instance;
    const action = $localize`Sauvegarder le template`;

    this.runLocked(
      this.mail
        .updateTemplate(this.typeActif, {
          sujet: this.sujet,
          mail: this.html,
        })
        .then((result) => {
          const message = result
            ? errorService.OKMessage(action)
            : errorService.UnknownError(action);
          errorService.emitChange(message);
        })
        .catch((err: HttpErrorResponse) =>
          errorService.emitChange(errorService.CreateError(action, err.message)),
        ),
    );
  }

  envoyerMailTest(): void {
    this.testInfo = '';
    this.testError = '';

    if (!this.testEmailValid) {
      this.testError = 'Saisis une adresse email de test valide.';
      return;
    }
    if (!this.html.trim()) {
      this.testError = 'Le template ne contient aucun HTML à envoyer.';
      return;
    }

    const renderedSubject = this.renderTemplate(
      this.sujet,
      this.formGlobaux,
      this.formLoopItems,
    );
    const renderedHtml = this.renderTemplate(
      this.html,
      this.formGlobaux,
      this.formLoopItems,
    );
    const subject = `[TEST TEMPLATE] ${renderedSubject || this.typeLabel(this.typeActif)}`.slice(
      0,
      200,
    );

    this.runLocked(
      this.mail
        .sendTest({
          email: this.testEmail.trim(),
          subject,
          html: renderedHtml,
          type: this.typeActif,
        })
        .then(() => {
          this.testInfo = `Mail de test envoyé à ${this.testEmail.trim()}.`;
        })
        .catch((error: HttpErrorResponse) => {
          this.testError =
            error?.error?.message || error?.message || 'Envoi du mail de test impossible.';
        }),
    );
  }

  private chargerTemplate(type: TemplateType): void {
    const errorService = ErrorService.instance;
    const action = $localize`Charger le template`;

    this.formGlobaux = {};
    this.formLoopItems = [];
    this.testInfo = '';
    this.testError = '';

    this.runLocked(
      this.mail
        .getTemplate(type)
        .then((template) => {
          this.sujet = template?.sujet ?? '';
          this.html = template?.mail ?? '';
          this.detecterChamps();
        })
        .catch((err: HttpErrorResponse) => {
          errorService.emitChange(errorService.CreateError(action, err.message));
          this.sujet = '';
          this.html = '';
          this.placeholdersGlobaux = [];
          this.placeholdersLoop = [];
          this.formGlobaux = {};
          this.formLoopItems = [];
          this.previewSubject = '';
          this.previewHtml = '';
        }),
    );
  }

  private runLocked<T>(promise: Promise<T>): void {
    this.uiLock = true;
    promise.finally(() => (this.uiLock = false));
  }

  private getPlaceholders(text: string): { global: string[]; loop: string[] } {
    if (!text) return { global: [], loop: [] };

    const loopRe = /\[\[([\s\S]*?)\]\]/g;
    const placeholderRe = /{{\s*([^{}]+?)\s*}}/g;
    const loopSet = new Set<string>();
    const globalSet = new Set<string>();

    for (const match of text.matchAll(loopRe)) {
      const block = match[1];
      for (const placeholder of block.matchAll(placeholderRe)) {
        loopSet.add(placeholder[1].trim());
      }
    }

    const outsideLoops = text.replace(loopRe, '');
    for (const placeholder of outsideLoops.matchAll(placeholderRe)) {
      globalSet.add(placeholder[1].trim());
    }

    return {
      global: [...globalSet].sort(),
      loop: [...loopSet].sort(),
    };
  }

  private renderTemplate(
    template: string,
    globals: Record<string, string>,
    loopItems: Array<Record<string, string>>,
  ): string {
    if (!template) return '';

    let rendered = template.replace(/\[\[([\s\S]*?)\]\]/g, (_match, block: string) => {
      if (!loopItems.length) return '';
      return loopItems
        .map((item) => this.replacePlaceholders(block, item))
        .join('');
    });

    rendered = this.replacePlaceholders(rendered, globals);
    return rendered;
  }

  private replacePlaceholders(source: string, values: Record<string, string>): string {
    return source.replace(
      /{{\s*([^{}]+?)\s*}}/g,
      (_match, key: string) => values[key.trim()] ?? '',
    );
  }

  private exampleValue(key: string, index: number): string {
    const normalized = key
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
    const n = index + 1;

    if (normalized.includes('PRENOM')) return index ? `Prénom ${n}` : 'Camille';
    if (normalized.includes('NOM_CLUB') || normalized === 'CLUB') return 'Mon Club';
    if (normalized.includes('NOM')) return index ? `Nom ${n}` : 'Martin';
    if (normalized.includes('EMAIL') || normalized.includes('MAIL')) return 'camille@example.org';
    if (normalized.includes('DATE')) return index ? `1${n}/09/2026` : '15/09/2026';
    if (normalized.includes('HEURE')) return '18:30';
    if (normalized.includes('LIEU')) return 'Gymnase municipal';
    if (normalized.includes('COURS') || normalized.includes('SEANCE')) return `Cours test ${n}`;
    if (normalized.includes('GROUPE')) return `Groupe ${n}`;
    if (normalized.includes('MONTANT') || normalized.includes('PRIX')) return '160 €';
    if (normalized.includes('LIEN') || normalized.includes('URL')) return 'https://assolutions.club';
    if (normalized.includes('SAISON')) return '2026-2027';
    return index ? `Valeur ${n}` : 'Valeur de test';
  }
}
