import {
  AfterViewChecked,
  Directive,
  ElementRef,
  Host,
  Input,
} from '@angular/core';
import { ErrorService } from '../../services/error.service';
import { AdherentEditorComponent } from '../adherent/detail/adherent-editor.component';

@Directive({
  selector: 'app-adherent-editor[context]',
  standalone: false,
})
export class AdherentSelfGroupsDirective implements AfterViewChecked {
  @Input() context = '';

  private lastSignature = '';

  constructor(
    @Host() private readonly editor: AdherentEditorComponent,
    private readonly host: ElementRef<HTMLElement>,
  ) {}

  ngAfterViewChecked(): void {
    const section = Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>('section.editor-box'),
    ).find((item) =>
      (item.querySelector('h3')?.textContent ?? '').trim().startsWith('Groupes'),
    );

    if (!section) return;

    const editableGrid = section.querySelector<HTMLElement>('.editor-check-grid');

    if (this.context !== 'MON_COMPTE') {
      if (editableGrid) editableGrid.style.removeProperty('display');
      section.querySelector('.self-groups-readonly')?.remove();
      this.lastSignature = '';
      return;
    }

    // On garde le DOM Angular en place pour éviter de perturber le change
    // detection, mais les cases d'affectation ne sont jamais visibles en mode
    // MON_COMPTE : l'adhérent ne peut donc pas modifier ses groupes.
    if (editableGrid) editableGrid.style.display = 'none';

    const groups = (this.editor.groupesDisponibles ?? []).filter(
      (groupe: any) =>
        groupe?.visible === true &&
        this.editor.hasGroupeActiveSaison(Number(groupe.id)),
    );

    const signature = groups
      .map((groupe: any) => `${groupe.id}:${groupe.nom}:${groupe.whatsapp ?? ''}`)
      .join('|');

    if (
      this.lastSignature === signature &&
      section.querySelector('.self-groups-readonly')
    ) {
      return;
    }

    this.lastSignature = signature;
    section.querySelector('.self-groups-readonly')?.remove();

    const container = document.createElement('div');
    container.className = 'self-groups-readonly tags are-medium';

    if (!groups.length) {
      const empty = document.createElement('p');
      empty.className = 'help';
      empty.textContent = 'Aucun groupe public à afficher.';
      container.appendChild(empty);
    }

    for (const groupe of groups as any[]) {
      const whatsapp = String(groupe.whatsapp ?? '').trim();

      if (whatsapp) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tag is-primary is-light';
        button.textContent = String(groupe.nom ?? 'Groupe');
        button.title = 'Cliquez sur le groupe pour copier le groupe WhatsApp';
        button.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.copy(whatsapp);
        });
        container.appendChild(button);
      } else {
        const tag = document.createElement('span');
        tag.className = 'tag is-primary is-light';
        tag.textContent = String(groupe.nom ?? 'Groupe');
        container.appendChild(tag);
      }
    }

    section.appendChild(container);
  }

  private copy(text: string): void {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => this.notifyCopied())
        .catch(() => {
          this.copyFallback(text);
          this.notifyCopied();
        });
      return;
    }

    this.copyFallback(text);
    this.notifyCopied();
  }

  private notifyCopied(): void {
    const errorService = ErrorService.instance;
    errorService.emitChange(
      errorService.OKMessage($localize`Groupe WhatsApp copié`),
    );
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
