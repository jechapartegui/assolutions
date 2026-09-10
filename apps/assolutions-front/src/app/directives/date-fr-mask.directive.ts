import { Directive, HostListener } from '@angular/core';

/**
 * Masque léger pour les dates françaises saisies au clavier numérique.
 *
 * Le sélecteur cible volontairement le champ de naissance existant sans
 * modifier son contrat Angular : le composant continue de recevoir une chaîne
 * JJ/MM/AAAA et garde son parsing explicite jour/mois/année.
 */
@Directive({
  selector: 'input[inputmode="numeric"][placeholder="JJ/MM/AAAA"]',
  standalone: false,
})
export class DateFrMaskDirective {
  private redispatching = false;

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    if (this.redispatching) return;

    const input = event.target as HTMLInputElement | null;
    if (!input) return;

    const masked = this.format(input.value);
    if (masked === input.value) return;

    // Angular/ngModel écoute lui aussi `input`. On remet donc la valeur
    // normalisée dans le DOM puis on réémet un événement pour garantir que le
    // modèle reçoit bien la chaîne masquée, quel que soit l'ordre des listeners.
    this.redispatching = true;
    input.value = masked;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    this.redispatching = false;
  }

  private format(value: string): string {
    const digits = String(value ?? '')
      .replace(/\D/g, '')
      .slice(0, 8);

    if (digits.length <= 2) return digits;
    if (digits.length <= 4) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }

    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  }
}
