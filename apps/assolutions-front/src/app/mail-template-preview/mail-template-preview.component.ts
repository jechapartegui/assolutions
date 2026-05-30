import { Component, Input } from '@angular/core';

@Component({
  standalone: false,
  selector: 'mail-template-preview',
  templateUrl: './mail-template-preview.component.html',
  styleUrls: ['./mail-template-preview.component.css'],
})
export class MailTemplatePreviewComponent {
  @Input() html = '';
  @Input() variables: Record<string, any> | null = null;
  @Input() notes = '';

  get renderedHtml(): string {
    let result = this.html ?? '';

    const vars = {
      ...(this.variables ?? {}),
      NOTES: this.notes ?? '',
      NOTE: this.notes ?? '',
    };

    return result.replace(/{{\s*([^{}]+?)\s*}}/g, (_match, key: string) => {
      const value = vars[key.trim()];
      return value == null ? '' : String(value);
    });
  }
}