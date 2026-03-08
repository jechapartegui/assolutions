import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Personne_VM } from '@shared/lib/personne.interface';
import { Compte_VM } from '@shared/lib/compte.interface';

@Component({
    standalone:false,
  selector: 'app-adherent-account-selector',
  templateUrl: './adherent-account-selector.component.html',
})
export class AdherentAccountSelectorComponent {
  @Input() ListePersonne: Personne_VM[] = [];
  @Input() personne: Personne_VM | null = null;

  @Output() personneChange = new EventEmitter<Personne_VM | null>();
  @Output() retour = new EventEmitter<void>();
  @Output() createPersonne = new EventEmitter<void>();
  @Output() selectPersonne = new EventEmitter<void>();
  @Output() createCompte = new EventEmitter<Compte_VM>();

  onPersonneChange(value: Personne_VM | null) {
    this.personneChange.emit(value);
  }
}