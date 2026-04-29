import { MesSeances_VM, Adherent_VM, AdhMenDto, Seance, MesSeanceDto } from "@shared/index";
import { FilterMenu } from "../app/menu/menu.component";

export class AdherentMenu extends Adherent_VM {
  public sort_nom = 'NO';
  public sort_cours = 'NO';
  public sort_date = 'NO';
  public sort_lieu = 'NO';
  public selected_filter = '';
  public filtre_et_option = false;
  public filters = new FilterMenu();
  public profil: 'ADH' | 'PROF' = 'ADH';
  public MesSeances: MesSeances_VM[] = [];
  public afficher = false;
  private _SeancePassee = false;

  public get SeancePassee(): boolean {
    return this._SeancePassee;
  }

  public set SeancePassee(v: boolean) {
    this._SeancePassee = v;
  }

  constructor() {
    super();
    this.inscrit = true;
  }
}
