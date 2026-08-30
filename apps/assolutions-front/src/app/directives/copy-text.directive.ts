import { Directive, ElementRef, HostListener, Input, Renderer2 } from '@angular/core';
import { AppStore } from '../app.store';
import { RefDataStore } from '../../store/ref-data.store';
import { ErrorService } from '../../services/error.service';

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
  async copy(event: Event): Promise<void> {
    const text = this.resolveText();
    if (!text) {
      ErrorService.instance.emitChange(
        ErrorService.instance.CreateError($localize`Copier l'adresse`, $localize`Adresse du lieu introuvable`),
      );
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const copied = await this.copyToClipboard(text);
    if (copied) {
      ErrorService.instance.emitChange(
        ErrorService.instance.OKMessage($localize`Adresse copiée dans le presse-papiers`),
      );
    } else {
      // Dernier filet de sécurité, notamment pour certains Safari iOS :
      // le texte reste immédiatement sélectionnable/copier dans la boîte native.
      window.prompt($localize`Copiez l'adresse du lieu`, text);
    }
  }

  private resolveText(): string {
    const directText = String(this.appCopyText ?? '').trim();
    if (directText) return directText;

    const lieuId = Number(this.appCopyLieuAddress ?? 0);
    if (!lieuId) return '';

    // On tente d'abord le projet courant.
    const projectId = Number(this.appStore.selectedProject()?.id ?? 0);
    if (projectId) {
      const lieu = this.refDataStore
        .getLieuxState(projectId)
        .Liste.find((item) => Number(item.id) === lieuId);
      const address = this.formatAddress(lieu?.adresse);
      if (address) return address;
    }

    // Sur le menu/profil mobile le projet courant peut ne pas encore être
    // réhydraté alors que les références lieux le sont déjà. Recherche donc
    // aussi dans tous les caches lieux chargés.
    for (const state of Object.values(this.refDataStore.lieux())) {
      const lieu = state.Liste.find((item) => Number(item.id) === lieuId);
      const address = this.formatAddress(lieu?.adresse);
      if (address) return address;
    }

    return '';
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

  private async copyToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Safari peut refuser l'API Clipboard malgré une interaction utilisateur.
      // On passe alors au mécanisme historique ci-dessous.
    }

    return this.copyFallback(text);
  }

  private copyFallback(text: string): boolean {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);

    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch {
      copied = false;
    } finally {
      document.body.removeChild(textarea);
    }

    return copied;
  }
}
