import { Injectable } from '@angular/core';

export type MailRenderContext = {
  global?: Record<string, any>;
  user?: Record<string, any>;
  loop?: Record<string, any>[];
};

@Injectable({ providedIn: 'root' })
export class MailRendererService {
  render(template: string, context: MailRenderContext): string {
    if (!template) return '';

    let html = template;

    html = html.replace(/\[\[([\s\S]*?)\]\]/g, (_, block: string) => {
      const rows = context.loop ?? [];
      return rows.map(row => this.replaceVars(block, { ...context.global, ...context.user, ...row })).join('');
    });

    return this.replaceVars(html, { ...context.global, ...context.user });
  }

  private replaceVars(text: string, vars: Record<string, any>): string {
    return text.replace(/{{\s*([^{}]+?)\s*}}/g, (_, key: string) => {
      const value = this.resolve(vars, key.trim());
      return value == null ? '' : String(value);
    });
  }

  private resolve(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
  }
}