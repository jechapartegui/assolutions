import { StatutSeance } from '@shared/index';
export class SeanceFilterVm {
  public editing = {
    nom: false,
    date: false,
    lieu: false,
    groupe: false,
    prof: false,
    statut: false,
  };

  private _filter_nom: string | null = null;
  private _filter_date_apres: string | null = this.calcISO(-2, 0);
  private _filter_date_avant: string | null = this.calcISO(0, 2);
  private _filter_prof: string | null = null;
  private _filter_statut: StatutSeance | null = StatutSeance.prévue;
  private _filter_groupe: string | null = null;
  private _filter_lieu: string | null = null;

  get filter_nom(): string | null {
    return this._filter_nom;
  }
  set filter_nom(value: string | null) {
    this._filter_nom = value;
  }

  get filter_date_apres(): string | null {
    return this._filter_date_apres;
  }
  set filter_date_apres(value: string | null) {
    this._filter_date_apres = value || null;
  }

  get filter_date_avant(): string | null {
    return this._filter_date_avant;
  }
  set filter_date_avant(value: string | null) {
    this._filter_date_avant = value || null;
  }

  get filter_prof(): string | null {
    return this._filter_prof;
  }
  set filter_prof(value: string | null) {
    this._filter_prof = value;
  }

  get filter_statut(): StatutSeance | null {
    return this._filter_statut;
  }
  set filter_statut(value: StatutSeance | null) {
    this._filter_statut = value;
  }

  get filter_groupe(): string | null {
    return this._filter_groupe;
  }
  set filter_groupe(value: string | null) {
    this._filter_groupe = value;
  }

  get filter_lieu(): string | null {
    return this._filter_lieu;
  }
  set filter_lieu(value: string | null) {
    this._filter_lieu = value;
  }

  reset(): void {
    this.filter_nom = null;
    this.filter_date_apres = null;
    this.filter_date_avant = null;
    this.filter_prof = null;
    this.filter_statut = null;
    this.filter_groupe = null;
    this.filter_lieu = null;
  }

  private calcISO(daysDelta = 0, monthsDelta = 0): string {
    const d = new Date();
    if (daysDelta) d.setDate(d.getDate() + daysDelta);
    if (monthsDelta) d.setMonth(d.getMonth() + monthsDelta);

    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
      .toISOString()
      .slice(0, 10);
  }
}