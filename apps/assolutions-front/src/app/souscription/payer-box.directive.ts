import {
  AfterViewInit,
  Directive,
  ElementRef,
  Host,
  OnDestroy,
  Renderer2,
} from '@angular/core';

import { SouscriptionTunnelComponent } from './souscription-tunnel.component';

@Directive({
  selector: '.payer-box',
  standalone: false,
})
export class PayerBoxDirective implements AfterViewInit, OnDestroy {
  private static readonly initialized = new WeakSet<SouscriptionTunnelComponent>();
  private readonly cleanups: Array<() => void> = [];

  constructor(
    @Host() private readonly tunnel: SouscriptionTunnelComponent,
    private readonly elementRef: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
  ) {}

  ngAfterViewInit(): void {
    if (!PayerBoxDirective.initialized.has(this.tunnel)) {
      PayerBoxDirective.initialized.add(this.tunnel);
      this.tunnel.payerMode = null;
      this.tunnel.onPayerModeChange();
    }

    queueMicrotask(() => this.enhanceForm());
  }

  ngOnDestroy(): void {
    this.cleanups.splice(0).forEach((cleanup) => cleanup());
  }

  private enhanceForm(): void {
    const host = this.elementRef.nativeElement;
    const select = host.querySelector('select');
    const emailInput = host.querySelector<HTMLInputElement>('input[type="email"]');
    const textInputs = host.querySelectorAll<HTMLInputElement>(
      'input:not([type]), input[type="text"]',
    );

    if (!select || !emailInput) return;

    this.ensurePlaceholder(select);

    textInputs.forEach((input) =>
      this.renderer.setAttribute(input, 'required', ''),
    );
    this.renderer.setAttribute(emailInput, 'required', '');
    this.renderer.setAttribute(emailInput, 'autocomplete', 'email');
    this.renderer.setAttribute(emailInput, 'inputmode', 'email');

    const selectHelp = this.createHelp(select.closest('.field'));
    const emailHelp = this.createHelp(emailInput.parentElement);

    const refresh = () => {
      const hasPayer = this.tunnel.payerMode != null;
      const email = this.tunnel.payerEmail.trim();
      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      const emailInvalid = hasPayer && !emailValid;

      this.setHelp(
        selectHelp,
        hasPayer ? '' : 'Choisis la personne qui effectue le paiement.',
      );
      this.setHelp(
        emailHelp,
        emailInvalid
          ? 'Une adresse email valide est obligatoire pour le payeur.'
          : '',
      );

      if (emailInvalid) {
        this.renderer.addClass(emailInput, 'is-danger');
      } else {
        this.renderer.removeClass(emailInput, 'is-danger');
      }
      this.renderer.setAttribute(
        emailInput,
        'aria-invalid',
        String(emailInvalid),
      );
    };

    this.cleanups.push(
      this.renderer.listen(select, 'change', () => {
        setTimeout(refresh);
      }),
      this.renderer.listen(emailInput, 'input', refresh),
      this.renderer.listen(emailInput, 'blur', refresh),
    );

    refresh();
  }

  private ensurePlaceholder(select: HTMLSelectElement): void {
    if (select.querySelector('option[data-payer-placeholder]')) return;

    const option = this.renderer.createElement('option') as HTMLOptionElement;
    this.renderer.setAttribute(option, 'data-payer-placeholder', 'true');
    this.renderer.setAttribute(option, 'disabled', '');
    this.renderer.setAttribute(option, 'value', '');
    this.renderer.setProperty(option, 'textContent', 'Choisir le payeur');
    this.renderer.insertBefore(select, option, select.firstChild);

    if (this.tunnel.payerMode == null) {
      setTimeout(() => {
        this.renderer.setProperty(select, 'selectedIndex', 0);
      });
    }
  }

  private createHelp(parent: Element | null): HTMLElement | null {
    if (!parent) return null;
    const help = this.renderer.createElement('p') as HTMLElement;
    this.renderer.addClass(help, 'help');
    this.renderer.addClass(help, 'is-danger');
    this.renderer.appendChild(parent, help);
    return help;
  }

  private setHelp(element: HTMLElement | null, message: string): void {
    if (!element) return;
    this.renderer.setProperty(element, 'textContent', message);
    this.renderer.setStyle(element, 'display', message ? '' : 'none');
  }
}
