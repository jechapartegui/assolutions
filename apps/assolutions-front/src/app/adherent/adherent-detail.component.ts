import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Adherent_VM } from '@shared/lib/member.interface';
import { Adresse } from '@shared/lib/adresse.interface';
import { Groupe, LienGroupe_VM } from '@shared/lib/groupes.interface';

@Component({
    standalone: false,
  selector: 'app-adherent-detail',
  templateUrl: './adherent-detail.component.html',
})
export class AdherentDetailComponent {
  @Input() thisAdherent!: Adherent_VM;
  @Input() context!: 'ECRAN_MENU' | 'ECRAN_LISTE' | 'ESSAI';
  @Input() photoAdherent: string | null = null;
  @Input() store: any;
  @Input() GlobalService: any;
  @Input() liste_groupe: Groupe[] = [];
  @Input() editmongroupe = false;
  @Input() titre_contact = '';
  @Input() titre_contact_prevenir = '';
  @Input() adherentValide = false;
  @Input() AdresseValide = false;
  @Input() ContactValide = false;
  @Input() ContactUrgenceValide = false;
  @Input() currentActiveGroupes: LienGroupe_VM[] = [];
  @Input() currentInactiveGroupes: LienGroupe_VM[] = [];
  @Input() isInscriptionActive = false;

  @Output() retour = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  @Output() inscrire = new EventEmitter<void>();
  @Output() archiver = new EventEmitter<void>();
  @Output() desarchiver = new EventEmitter<void>();
  @Output() toggleEditMonGroupe = new EventEmitter<void>();

  @Output() photoSelected = new EventEmitter<string>();
  @Output() infoPersoChange = new EventEmitter<void>();
  @Output() adresseChange = new EventEmitter<Adresse>();
  @Output() contactChange = new EventEmitter<void>();
  @Output() contactUrgenceChange = new EventEmitter<void>();
  @Output() validAdherent = new EventEmitter<boolean>();
  @Output() validAdresse = new EventEmitter<boolean>();
  @Output() validContact = new EventEmitter<boolean>();
  @Output() validContactUrgence = new EventEmitter<boolean>();

  get canSaveNew(): boolean {
    return this.thisAdherent.id < 1
      && this.adherentValide
      && this.AdresseValide
      && this.ContactValide
      && this.ContactUrgenceValide;
  }
}