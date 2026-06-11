import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Lieu } from '@shared/index';
import { LieuApiService } from 'apps/assolutions-front/src/services/lieu-api.service';



@Component({
  standalone: false,
  selector: 'app-lieu-selector',
  templateUrl: './lieu-selector.component.html',
  styleUrls: ['./lieu-selector.component.css'],
})
export class LieuSelectorComponent {
  @Input() lieuId: number | null | undefined = null;
  @Input() disabled = false;
  @Input() placeholder = 'Rechercher un lieu';
  @Input() minLength = 2;
  @Input() creationpossible = false;

  @Output() lieuIdChange = new EventEmitter<number | null>();
  @Output() selectedChange = new EventEmitter<Lieu | null>();

  searchText = '';
  loading = false;
  opened = false;
  results: Lieu[] = [];
  selected: Lieu | null = null;

  private searchTimer: any = null;
  private lastSearch = '';

  constructor(private lieuApi: LieuApiService) {}

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
      this.results = await this.lieuApi.search(txt);
    } finally {
      this.loading = false;
    }
  }

  select(lieu: Lieu): void {
    this.selected = lieu;
    this.lieuId = lieu.id;
    this.searchText = this.getLabel(lieu);
    this.results = [];
    this.opened = false;

    this.lieuIdChange.emit(lieu.id);
    this.selectedChange.emit(lieu);
  }

  clear(): void {
    this.selected = null;
    this.lieuId = null;
    this.searchText = '';
    this.results = [];
    this.opened = false;
    this.lastSearch = '';

    this.lieuIdChange.emit(null);
    this.selectedChange.emit(null);
  }

  getLabel(lieu: Lieu | null | undefined): string {
    if (!lieu) return '';

    return (
      lieu.nom || 
      `Lieu #${lieu.id}`
    );
  }

}