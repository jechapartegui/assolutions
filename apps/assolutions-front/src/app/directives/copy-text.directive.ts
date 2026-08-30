import { Directive, ElementRef, HostListener, Input, Renderer2 } from '@angular/core';
import { AppStore } from '../app.store';
import { RefDataStore } from '../../store/ref-data.store';

@Directive({
  selector: '[appCopyText], [appCopyLieuAddress]',
  standalone: false,
})
export class CopyTextDirective {
  @Input() appCopyText: string | null | undefined = null;
  @Input() appCopyLieuAddress: number | null | undefined = null;

  constructor(
    private readonly appStore: AppStore,
    private readonly refDataStore: RefDataStore,
    private readonly elementRef: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
  ) {}

  @HostListener('mouseenter')
  updateTitle(): void {
    const text = this.resolveText();
    if (text) {
      this.renderer.setAttribute(this.elementRef.nativeElement, 'title', `${text} — cliquer pour copier`);
    }
  }

  @HostListener('click', ['$event'])
  copy(event: Event): void {
    const text = this.resolveText();
    if (!text) return;

    event.stopPropagation();
    this.copyToClipboard(text);
  }

  private resolveText(): string {
    const directText = String(this.appCopyText ?? '').trim();
    if (directText) return directText;

    const lieuId = Number(this.appCopyLieuAddress ?? 0);
    const projectId = Number(this.appStore.selectedProject()?.id ?? 0);
    if (!lieuId || !projectId) return '';

    const lieu = this.refDataStore
      .getLieuxState(projectId)
      .Liste.find((item) => Number(item.id) === lieuId);

    return this.formatAddress(lieu?.adresse);
  }

  private formatAddress(address: any): string {
    if (!address) return '';
    if (typeof address === 'string') return address.trim();

    if (address.raw) return String(address.raw).trim();

    return [
      address.adresse1,
      address.adresse2,
      address.adresse3,
      address.Street,
      address.code_postal,
      address.PostCode,
      address.ville,
      address.City,
      address.Country,
    ]
      .map((value) => String(value ?? '').trim())
      .filter(Boolean)
      .join(' ');
  }

  private copyToClipboard(text: string): void {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => this.copyFallback(text));
      return;
    }

    this.copyFallback(text);
  }

  private copyFallback(text: string): void {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
      document.execCommand('copy');
    } finally {
      document.body.removeChild(textarea);
    }
  }
}
