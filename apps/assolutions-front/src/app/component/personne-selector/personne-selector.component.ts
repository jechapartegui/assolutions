import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PersonneSearchItem } from '@shared/index';
import { AdhesionApiService } from 'apps/assolutions-front/src/services/adhesion-api.service';



@Component({
  standalone: false,
  selector: 'app-personne-selector',
  templateUrl: './personne-selector.component.html',
  styleUrls: ['./personne-selector.component.css'],
})
export class PersonneSelectorComponent {
  @Input() personneId: number | null | undefined = null;
  @Input() disabled = false;
  @Input() placeholder = 'Rechercher une personne';
  @Input() minLength = 2;

  @Output() personneIdChange = new EventEmitter<number | null>();
  @Output() selectedChange = new EventEmitter<PersonneSearchItem | null>();

  searchText = '';
  loading = false;
  opened = false;
  results: PersonneSearchItem[] = [];
  selected: PersonneSearchItem | null = null;

  private searchTimer: any = null;
  private lastSearch = '';

  constructor(private adherentApi: AdhesionApiService) {}

  onSearchChange(value: string): void {
    this.searchText = value ?? '';
    this.opened = true;

    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }

    const txt = this.searchText.trim();

    if (txt.length < this.minLength) {
      this.results = [];
      this.loading = false;
      return;
    }

    this.searchTimer = setTimeout(() => {
      this.search(txt);
    }, 250);
  }

  async search(txt: string): Promise<void> {
    if (!txt || txt === this.lastSearch) return;

    this.lastSearch = txt;
    this.loading = true;

    try {
      this.results = await this.adherentApi.admin_search(txt);
    } finally {
      this.loading = false;
    }
  }

  select(personne: PersonneSearchItem): void {
    this.selected = personne;
    this.personneId = personne.id;
    this.searchText = this.getLabel(personne);
    this.results = [];
    this.opened = false;

    this.personneIdChange.emit(personne.id);
    this.selectedChange.emit(personne);
  }

  clear(): void {
    this.selected = null;
    this.personneId = null;
    this.searchText = '';
    this.results = [];
    this.opened = false;
    this.lastSearch = '';

    this.personneIdChange.emit(null);
    this.selectedChange.emit(null);
  }

  getLabel(personne: PersonneSearchItem | null | undefined): string {
    if (!personne) return '';

    return (
      personne.libelle ||
      `${personne.prenom ?? ''} ${personne.nom ?? ''}`.trim() ||
      `Personne #${personne.id}`
    );
  }

}