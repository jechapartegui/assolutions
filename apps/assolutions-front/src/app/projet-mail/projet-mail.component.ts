import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ErrorService } from '../../services/error.service';
import { MailService } from '../../services/mail.service';

// Types connus dans ton app d’envoi (les mêmes + "essai")
export type TemplateType = 'relance' | 'annulation' | 'convocation' | 'bienvenue' | 'serie_seance' | 'essai' | 'libre';

@Component({
  standalone: false,
  selector: 'app-projet-mail',
  templateUrl: './projet-mail.component.html',
  styleUrls: ['./projet-mail.component.css']
})
export class ProjetMailComponent implements OnInit {

  // --- UI Lock (même approche que l’écran envoi-mail) ---
  uiLock = false;
  private runLocked<T>(p: Promise<T>): void {
    this.uiLock = true;
    p.finally(() => (this.uiLock = false));
  }

  // --- Onglets / types ---
  types: TemplateType[] = ['relance', 'annulation', 'convocation', 'bienvenue', 'serie_seance', 'essai', 'libre'];
  typeActif: TemplateType = 'relance';

  // --- Modèle éditable ---
  sujet = '';
  html = '';

  // --- Champs détectés ---
  placeholdersGlobaux: string[] = [];
  placeholdersLoop: string[] = [];

  // --- Valeurs de test pour la prévisualisation ---
  // Globaux: { [NOM_CHAMP]: 'valeur' }
  formGlobaux: Record<string, string> = {};
  // Boucle: tableau d’items { [NOM_CHAMP_LOOP]: 'valeur' }
  formLoopItems: Array<Record<string, string>> = [];

  // --- Sortie prévisualisée ---
  previewHtml = '';

  constructor(private mail: MailService) {}

  ngOnInit(): void {
    this.chargerTemplate(this.typeActif);
  }

  // --- Changement d’onglet ---
  activerType(t: TemplateType) {
    if (this.typeActif === t) return;
    this.typeActif = t;
    this.chargerTemplate(t);
  }

  // --- Charger sujet + html depuis le back (mêmes endpoints que l’envoi) ---
  private chargerTemplate(t: TemplateType) {
    const errorService = ErrorService.instance;
    const action = $localize`Charger le template`;
    this.runLocked(
      this.mail.GetMail(t)
        .then(kvp => {
          this.sujet = kvp?.key ?? '';
          this.html = kvp?.value ?? '';
          this.detecterChamps();
          this.genererPreview();
        })
        .catch((err: HttpErrorResponse) => {
          errorService.emitChange(errorService.CreateError(action, err.message));
          this.sujet = '';
          this.html = '';
          this.placeholdersGlobaux = [];
          this.placeholdersLoop = [];
          this.formGlobaux = {};
          this.formLoopItems = [];
          this.previewHtml = '';
        })
    );
  }

  // --- Détection des {{CHAMP}} globaux et ceux à l’intérieur de [[...]] ---
  // même logique que ta méthode existante dans envoi-mail (adaptée ici) :contentReference[oaicite:1]{index=1}
  private getPlaceholders(text: string): { global: string[]; loop: string[] } {
    if (!text) return { global: [], loop: [] };

    const loopRe = /\[\[([\s\S]*?)\]\]/g;    // capte chaque bloc [[ ... ]]
    const phRe   = /{{\s*([^{}]+?)\s*}}/g;   // capte {{ PLACEHOLDER }}

    const loopSet = new Set<string>();
    const globalSet = new Set<string>();

    // placeholders dans les boucles
    for (const m of text.matchAll(loopRe)) {
      const block = m[1];
      for (const pm of block.matchAll(phRe)) loopSet.add(pm[1].trim());
    }

    // placeholders hors boucles
    const outside = text.replace(loopRe, "");
    for (const pm of outside.matchAll(phRe)) globalSet.add(pm[1].trim());

    return { global: [...globalSet], loop: [...loopSet] };
  }

  detecterChamps() {
    const { global, loop } = this.getPlaceholders(this.html);
    this.placeholdersGlobaux = global;
    this.placeholdersLoop = loop;

    // init formulaires si vides
    for (const k of global) if (!(k in this.formGlobaux)) this.formGlobaux[k] = '';
    if (this.formLoopItems.length === 0 && this.placeholdersLoop.length > 0) {
      this.ajouterLigneLoop(); // crée une 1ère ligne
    }
  }

  // Gestion des lignes de boucle
  ajouterLigneLoop() {
    const row: Record<string, string> = {};
    for (const k of this.placeholdersLoop) row[k] = '';
    this.formLoopItems.push(row);
  }
  supprimerLigneLoop(i: number) {
    this.formLoopItems.splice(i, 1);
  }

  // --- Rendu local (aperçu) ---
  genererPreview() {
    const rendered = this.renderTemplate(this.html, this.formGlobaux, this.formLoopItems);
    const renderedSujet = this.renderTemplate(this.sujet, this.formGlobaux, this.formLoopItems);
    // On insère le sujet rendu au-dessus pour rappel visuel
    this.previewHtml = `<div style="font:14px sans-serif;margin-bottom:8px"><strong>Sujet&nbsp;:</strong> ${this.escapeHtml(renderedSujet)}</div>${rendered}`;
  }

  // Remplacement {{CHAMP}} + rendu des [[...]] sur nb d’items
  private renderTemplate(tpl: string, globals: Record<string, string>, loopItems: Array<Record<string, string>>): string {
    if (!tpl) return '';

    // 1) Rendu boucles
    const loopRe = /\[\[([\s\S]*?)\]\]/g;
    tpl = tpl.replace(loopRe, (_m, block: string) => {
      if (!this.placeholdersLoop.length) return ''; // s'il n'y a pas de placeholders, on supprime le bloc
      if (!loopItems || loopItems.length === 0) return ''; // pas de données => rien
      return loopItems.map(item => this.replacePlaceholders(block, item)).join('');
    });

    // 2) Rendu globaux
    tpl = this.replacePlaceholders(tpl, globals);

    return tpl;
  }

  private replacePlaceholders(s: string, dict: Record<string, string>): string {
    return s.replace(/{{\s*([^{}]+?)\s*}}/g, (_m, key: string) => (dict[key.trim()] ?? ''));
  }

  private escapeHtml(s: string): string {
    return (s ?? '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;');
  }

  // --- Sauvegarde ---
  sauvegarder() {
    const errorService = ErrorService.instance;
    const action = $localize`Sauvegarder le template`;
    this.runLocked(
      this.mail.SauvegarderTemplate(this.html, this.sujet, this.typeActif)
        .then(ok => {
          const o = ok ? errorService.OKMessage(action) : errorService.UnknownError(action);
          errorService.emitChange(o);
        })
        .catch((err: HttpErrorResponse) =>
          errorService.emitChange(errorService.CreateError(action, err.message))
        )
    );
  }
}
