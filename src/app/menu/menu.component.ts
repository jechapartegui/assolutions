import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Adherent, Adherent_VM } from 'src/class/adherent';
import { cours } from 'src/class/cours';
import { KeyValuePair, KeyValuePairAny } from 'src/class/keyvaluepair';
import { Professeur } from 'src/class/professeur';
import { AdherentService } from 'src/services/adherent.service';
import { ErrorService } from 'src/services/error.service';
import { GlobalService } from 'src/services/global.services';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css']
})
export class MenuComponent implements OnInit {
  action:string
  Riders:Adherent_VM[];
  listeprof: Professeur[];
  listelieu: KeyValuePair[];

  public  sort_nom = "NO";
  public  sort_cours = "NO";
  public  sort_date = "NO";
  public  sort_lieu = "NO";
  listeCours: cours[] = [];
  public   filter_date_avant: Date;
  public   filter_date_apres: Date;
  public  filter_nom: string;
  public  filter_cours: number;
  public  filter_groupe: number;
  public  filter_lieu: number;
  public  filter_prof: number;
  public  liste_prof_filter: KeyValuePairAny[];
  public  liste_lieu_filter: KeyValuePairAny[];  
  constructor(private router: Router, private adherent_serv:AdherentService) { }

  ngOnInit(): void {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger le menu`;
    if (GlobalService.is_logged_in) {
      switch (GlobalService.menu) {
        default:
        case "ADHERENT":
          case "PROF":
          this.adherent_serv.Get(GlobalService.compte.id).then((riders) => {
            this.Riders = riders.map( x => new Adherent_VM(x));
            this.Riders.sort((a, b) => {
           
              let comparaison = 0;
              if (a.datasource.id > b.datasource.id) {
                comparaison = 1;
              } else if (a.datasource.id < b.datasource.id) {
                comparaison = -1;
              }

              return comparaison; // Inverse pour le tri descendant
            });
          }).catch((error: Error) => {
            let o = errorService.CreateError(this.action, error.message);
            errorService.emitChange(o);
          });
          break;
        case "ADMIN":

          break;
      }

    } else { let o = errorService.CreateError(this.action, $localize`Accès impossible, vous n'êtes pas connecté`);
      errorService.emitChange(o);
      this.router.navigate(['/login']);
    }
  }

  trouverLieu(lieuId: number): any {
    // Implémentez la logique pour trouver le professeur à partir de la liste des professeurs
    // que vous pouvez stocker dans une variable
    const indexToUpdate = this.listelieu.findIndex(lieu => lieu.key === lieuId);

    if (indexToUpdate !== -1) {
      // Remplacer l'élément à l'index trouvé par la nouvelle valeur
      return this.listelieu[indexToUpdate].value;
    } else {
      return $localize`Lieu non trouvé`;
    }
  }
  Sort(sens: "NO" | "ASC" | "DESC", champ: string, id:number) {
    let liste_seance_VM = this.Riders.find(x => x.datasource.id == id).InscriptionSeances;
    switch (champ) {
      case "nom":
        this.sort_nom = sens;
        this.sort_date = "NO";
        this.sort_lieu = "NO";
        this.sort_cours = "NO";
        liste_seance_VM.sort((a, b) => {
          const nomA = a.thisSeance.libelle.toUpperCase(); // Ignore la casse lors du tri
          const nomB = a.thisSeance.libelle.toUpperCase();
          let comparaison = 0;
          if (nomA > nomB) {
            comparaison = 1;
          } else if (nomA < nomB) {
            comparaison = -1;
          }

          return this.sort_nom === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
        });
        break;
      case "lieu":
        this.sort_lieu = sens;
        this.sort_date = "NO";
        this.sort_nom = "NO";
        this.sort_cours = "NO";
        liste_seance_VM.sort((a, b) => {
          const lieuA = this.listelieu.find(lieu => lieu.key === a.thisSeance.lieu_id)?.value || '';
          const lieuB = this.listelieu.find(lieu => lieu.key === b.thisSeance.lieu_id)?.value || '';

          // Ignorer la casse lors du tri
          const lieuAUpper = lieuA.toUpperCase();
          const lieuBUpper = lieuB.toUpperCase();

          let comparaison = 0;
          if (lieuAUpper > lieuBUpper) {
            comparaison = 1;
          } else if (lieuAUpper < lieuBUpper) {
            comparaison = -1;
          }

          return this.sort_lieu === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
        });
        break;
      case "date":
        this.sort_lieu = "NO";
        this.sort_date = sens;
        this.sort_cours = "NO";
        this.sort_nom = "NO";
        liste_seance_VM.sort((a, b) => {
          let dateA = a.thisSeance.date_seance;
          let dateB = b.thisSeance.date_seance;

          let comparaison = 0;
          if (dateA > dateB) {
            comparaison = 1;
          } else if (dateA < dateB) {
            comparaison = -1;
          }

          return this.sort_date === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
        });
        break;
    }


  }

}
