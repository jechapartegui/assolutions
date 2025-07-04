import { AdherentVM } from "@shared/src";
import { InscriptionSeance } from "./inscription";

export class AdherentMenu extends AdherentVM {
  public sort_nom = "NO";
  public sort_cours = "NO";
  public sort_date = "NO";
  public sort_lieu = "NO";
    public selected_filter: string;
  public filters = new FilterMenu();
  public InscriptionSeances: InscriptionSeance[];
  constructor(_adh: adherent) {
    super(_adh);
    this.datasource = _adh;

    this.afficher_filtre = false;
    this.InscriptionSeances = [];
    if (this.datasource.seances) {
      this.datasource.seances.forEach((ss) => {
        let ins = this.datasource.inscriptions.find(x => x.seance_id == ss.seance_id);
        let i = new InscriptionSeance(ss, ins, _adh.id)
        this.InscriptionSeances.push(i);
      })
    }
    this.Libelle = "";
    if (_adh.prenom && _adh.prenom.length > 0) {
      this.Libelle = _adh.prenom;
    }
    if (_adh.nom && _adh.nom.length > 0) {
      if (this.Libelle && this.Libelle.length > 0) {
        this.Libelle = this.Libelle + " " + _adh.nom;
      } else {
        this.Libelle = _adh.nom;
      }
    }
    if (_adh.surnom && _adh.surnom.length > 0) {
      if (this.Libelle && this.Libelle.length > 0) {
        this.Libelle = this.Libelle + " " + _adh.surnom;
      } else {
        this.Libelle = _adh.surnom;
      }
    }



  }

  //mois



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







}