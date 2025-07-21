import { Adherent_VM, AdherentSeance_VM, MesSeances_VM } from "@shared/src";
import { FilterMenu } from "../app/menu/menu.component";

export class AdherentMenu extends Adherent_VM {
  public sort_nom = "NO";
  public sort_cours = "NO";
  public sort_date = "NO";
  public sort_lieu = "NO";
  public selected_filter: string;
  public filters = new FilterMenu();
  public profil : "ADH" | "PROF" = "ADH";
  public MesSeances: MesSeances_VM[];
  public afficher: boolean = false;
  private _SeancePassee: boolean;
  public get SeancePassee(): boolean {
    return this._SeancePassee;
  }
  public set SeancePassee(v: boolean) {
    this._SeancePassee = v;
  }


  private _afficher_filtre: boolean;
  public get afficher_filtre(): boolean {
    return this._afficher_filtre;
  }
  public set afficher_filtre(v: boolean) {
    this._afficher_filtre = v;
  }
  constructor(_adh: AdherentSeance_VM) {  
    super();
      // 1. Copier les propriétés de personne dans `this` (hérité de Personne_VM)
    Object.assign(this, _adh.personne);
    this.MesSeances = _adh.mes_seances;
    this.afficher_filtre = false;
    this.inscrit = true;  
  }

  //mois



 







}