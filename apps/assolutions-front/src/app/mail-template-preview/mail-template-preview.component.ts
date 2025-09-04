import { Component, Input, OnChanges, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

type KV = { key: string; value: any };

@Component({
    standalone:false,
  selector: 'mail-template-preview',
  templateUrl: './mail-template-preview.component.html',
  styleUrls: ['./mail-template-preview.component.css']
})
export class MailTemplatePreviewComponent implements OnChanges {
  // a) objet libre
  @Input() variables: Record<string, any> = {};
  // b) liste: [key,value] ou {key,value}
  @Input() varsList: Array<[string, any] | KV> | null = null;
  // c) notes dédié -> injecté dans {{NOTES}}
  private _notes: any = '';
  @Input() set notes(v: any) {
    this._notes = v;
    this.render(); // 🔁 re-render immédiat quand notes change
  }
  get notes() { return this._notes; }

  @Input() loopItems: Record<string, any>[] | null = null; // pour [[ ... ]]

  @Input() html: string = '';
  safeHtml: SafeHtml = '';

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(): void {
    this.render();
  }

  private render(): void {
    let result = this.html ?? '';

    // 1) Déplier les blocs [[ ... ]] si loopItems est fourni
    const loopRegex = /\[\[([\s\S]*?)\]\]/g;
    result = result.replace(loopRegex, (_m, inner: string) => {
      if (!this.loopItems || this.loopItems.length === 0) return '';
      return this.loopItems.map(item => this.replaceVariables(inner, item)).join('');
    });

    // 2) Construire la map finale des variables (Record + varsList)
    const vars = this.buildVars();

    // 3) Injecter NOTES (prioritaire)
    if (this._notes !== undefined) vars['NOTES'] = this._notes;

    // 4) Remplacements
    result = this.replaceVariables(result, vars);

    // 5) Sanitize + trust
    const sanitized = this.sanitizer.sanitize(SecurityContext.HTML, result) ?? '';
    this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(sanitized);
  }

  private buildVars(): Record<string, any> {
    const out: Record<string, any> = { ...(this.variables || {}) };

    if (Array.isArray(this.varsList)) {
      for (const item of this.varsList) {
        if (Array.isArray(item) && item.length >= 2) {
          const [k, v] = item;
          if (k != null) out[String(k)] = v;
        } else if (item && typeof item === 'object' && 'key' in item) {
          const kv = item as KV;
          if (kv.key != null) out[String(kv.key)] = kv.value;
        }
      }
    }
    return out;
  }

  private replaceVariables(source: string, vars: Record<string, any>): string {
    return source.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_m, key: string) => {
      const upperKey = key.toUpperCase();
      const foundKey = Object.keys(vars).find(k => k.toUpperCase() === upperKey);
      const val = foundKey ? vars[foundKey] : '';
      return (val === null || val === undefined) ? '' : String(val);
    });
  }
}
