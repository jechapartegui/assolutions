export class CoursFilterVm {
  public editing = {
    nom: false,
    jour: false,
    prof: false,
    lieu: false,
    groupe: false,
  };

  private _filter_nom: string | null = null;
  private _filter_jour: string | null = null;
  private _filter_prof: number | null = null;
  private _filter_lieu: number | null = null;
  private _filter_groupe: string | null = null;

  get filter_nom(): string | null {
    return this._filter_nom;
  }
  set filter_nom(value: string | null) {
    this._filter_nom = value;
  }

  get filter_jour(): string | null {
    return this._filter_jour;
  }
  set filter_jour(value: string | null) {
    this._filter_jour = value;
  }

  get filter_prof(): number | null {
    return this._filter_prof;
  }
  set filter_prof(value: number | null) {
    this._filter_prof = value;
  }

  get filter_lieu(): number | null {
    return this._filter_lieu;
  }
  set filter_lieu(value: number | null) {
    this._filter_lieu = value;
  }

  get filter_groupe(): string | null {
    return this._filter_groupe;
  }
  set filter_groupe(value: string | null) {
    this._filter_groupe = value;
  }

  reset(): void {
    this.filter_nom = null;
    this.filter_jour = null;
    this.filter_prof = null;
    this.filter_lieu = null;
    this.filter_groupe = null;
  }
}