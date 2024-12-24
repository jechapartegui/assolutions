import { HttpErrorResponse } from '@angular/common/http';
import { Component,
  ElementRef,
  Input,
  OnInit,
  ViewChild, } from '@angular/core';
import { Router } from '@angular/router';
import { Cours, cours } from 'src/class/cours';
import { KeyValuePair, KeyValuePairAny } from 'src/class/keyvaluepair';
import { ErrorService } from 'src/services/error.service';
import { Groupe } from 'src/class/groupe';
import { jour_semaine } from '../global';
import { AdherentService } from 'src/services/adherent.service';
import { GlobalService } from 'src/services/global.services';
import { LieuService } from 'src/services/lieu.service';
import { SaisonService } from 'src/services/saison.service';
import { CoursService } from 'src/services/cours.service';
import { GroupeService } from 'src/services/groupe.service';
import { professeur, Professeur } from 'src/class/professeur';
import { ProfesseurService } from 'src/services/professeur.service';
import { Saison } from 'src/class/saison';
import { ExcelService } from 'src/services/excel.service';

@Component({
  selector: 'app-cours',
  templateUrl: './cours.component.html',
  styleUrls: ['./cours.component.css']
})
export class CoursComponent implements OnInit {
  // cours.component.ts
  constructor(private prof_serv:ProfesseurService, private coursservice: CoursService, private lieuserv: LieuService, public ridersService: AdherentService, private router: Router, private saisonserv: SaisonService,
    private grServ: GroupeService, private excelService:ExcelService) { }
  listeprof: professeur[];
  listelieu: KeyValuePair[];

  listeCours: cours[] = [];
  listeCours_VM: Cours[] = []; // Initialisez la liste des cours (vous pouvez la charger à partir d'une API, par exemple)
  editMode = false;
  editCours: Cours | null = null;
  current_groupe_id: number;
  groupe_dispo: Groupe[] = [];
  liste_groupe: Groupe[] = [];
  
  public liste_saison: Saison[] = [];
  public active_saison: Saison;

  sort_nom = "NO";
  sort_jour = "NO";
  sort_lieu = "NO";
  season_id: number;
  filter_jour: any;
  filter_nom: string;
  filter_groupe: number;
  filter_lieu: number;
  filter_prof: number;
  liste_groupe_filter: Groupe[];
  liste_prof_filter: KeyValuePairAny[];
  liste_lieu_filter: KeyValuePairAny[];
  action: string = "";
  liste_jour_semaine = Object.keys(jour_semaine).map(key => jour_semaine[key]);
  afficher_menu_admin: boolean = false;

  
    public filters: FilterCours = new FilterCours();  
    public selected_filter: string;
    public selected_sort: any;
    public selected_sort_sens: any;
    public afficher_tri: boolean = false;
      public loading: boolean = false;
      public afficher_filtre: boolean = false;
      @ViewChild('scrollableContent', { static: false })
      scrollableContent!: ElementRef;
      showScrollToTop: boolean = false;

  ngOnInit(): void {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger les cours`;
    this.loading = true;
    if (GlobalService.is_logged_in) {

      if (GlobalService.menu === "ADHERENT") {
        this.router.navigate(['/menu']);
        this.loading = false;
        return;
      }

      this.saisonserv
              .GetAll()
              .then((sa) => {
                if (sa.length == 0) {
                  this.loading = false;
                  let o = errorService.CreateError(
                    $localize`Récupérer les saisons`,
                    $localize`Il faut au moins une saison pour créer un cours`
                  );
                  errorService.emitChange(o);
                  if (
                    GlobalService.menu === 'ADMIN' ||
                    GlobalService.menu == 'PROF'
                  ) {
                    this.router.navigate(['/saison']);
                  } else {
                    this.router.navigate(['/menu']);
                    GlobalService.selected_menu = 'MENU';
                  }
                  this.loading = false;
                  return;
                }
                this.liste_saison = sa.map((x) => new Saison(x));
                this.active_saison = this.liste_saison.filter(
                  (x) => x.active == true
                )[0];

      // Chargez la liste des cours
      this.grServ.GetAll().then((groupes) => {
        if (groupes.length == 0) {
          let o = errorService.CreateError($localize`Récupérer les groupes`, $localize`Il faut au moins un groupe pour créer un cours`);
          errorService.emitChange(o);
          this.loading = false;
          this.router.navigate(['/groupe']);
          return;
        }
        this.liste_groupe = groupes;
        this.prof_serv.GetProf().then((profs) => {
          if (profs.length == 0) {
            let o = errorService.CreateError($localize`Récupérer les professeurs`, $localize`Il faut au moins un professeur pour créer un cours`);
            errorService.emitChange(o);
            this.loading = false;
            this.router.navigate(['/adherent']);
            return;
          }
          this.listeprof = profs;
          this.lieuserv.GetAllLight().then((lieux) => {
            if (lieux.length == 0) {
              let o = errorService.CreateError($localize`Récupérer les lieux`, $localize`Il faut au moins un lieu pour créer un cours`);
              errorService.emitChange(o);
              this.loading = false;
              if (GlobalService.menu === "ADMIN") {
                this.router.navigate(['/lieu']);

              }
              return;
            }
            this.listelieu = lieux;
              this.UpdateListeCours();
              let o = errorService.OKMessage(this.action);
              errorService.emitChange(o);
                         
          }).catch((err: HttpErrorResponse) => {
            let o = errorService.CreateError($localize`récupérer les lieux`, err.message);
            errorService.emitChange(o);
            this.router.navigate(['/menu']);
            return;
          })
        }).catch((err: HttpErrorResponse) => {
          let o = errorService.CreateError($localize`récupérer les profs`, err.message);
          errorService.emitChange(o);
          this.router.navigate(['/menu']);
          return;
        })
      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError($localize`Récupérer les groupes`, err.message);
        errorService.emitChange(o);
        this.router.navigate(['/groupe']);
        return;
      });
}).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError($localize`Récupérer les groupes`, err.message);
        errorService.emitChange(o);
        this.router.navigate(['/groupe']);
        return;
      });
    } else {
      let o = errorService.CreateError(this.action, $localize`Accès impossible, vous n'êtes pas connecté`);
      errorService.emitChange(o);
      this.router.navigate(['/login']);
    }
  }
  onGroupesUpdated(updatedGroupes: Groupe[]) {
    this.editCours.Groupes = updatedGroupes;
    // Ici tu peux aussi déclencher d'autres actions, comme la sauvegarde ou la validation
  }

  UpdateListeCours() {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger les cours`;
    
    this.loading = true;
    if (this.season_id && this.season_id > 0) {
      this.coursservice.GetCoursSeason(this.season_id).then((c) => {
        this.listeCours = c;
        this.listeCours_VM = this.listeCours.map(x => new Cours(x));        
        this.loading = false;
      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        this.router.navigate(['/menu']);
        this.loading = false;
        return;
      })
    } else {
      this.coursservice.GetCours().then((c) => {
        this.listeCours = c;
        this.listeCours_VM = this.listeCours.map(x => new Cours(x));
        this.loading = false;
      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        this.router.navigate(['/menu']);
        this.loading = false;
        return;
      })
    }
  }

  Refresh(){
    const errorService = ErrorService.instance;
    this.action = $localize`Rafraichir le cours`;
    this.coursservice.Get(this.editCours.ID).then((c)=>{
      this.editCours = new Cours(c);
      let o = errorService.OKMessage(this.action);
      errorService.emitChange(o);
     }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        return;
      })
  }

  
  // Méthode pour trouver un professeur à partir de son ID
  trouverProfesseur(profId: number): any {
    // Implémentez la logique pour trouver le professeur à partir de la liste des professeurs
    // que vous pouvez stocker dans une variable
    const indexToUpdate = this.listeprof.findIndex(prof => prof.id === profId);

    if (indexToUpdate !== -1) {
      // Remplacer l'élément à l'index trouvé par la nouvelle valeur
      return this.listeprof[indexToUpdate].prenom + " " + this.listeprof[indexToUpdate].nom;
    } else {
      return $localize`Professeur non trouvé`;
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
  Edit(c: Cours): void {
    this.editCours = c;
    this.editMode = true;
  }

  Delete(c: Cours): void {
    const errorService = ErrorService.instance;

    let confirmation = window.confirm($localize`Voulez-vous supprimer ce cours ? Cette action est définitive. `);
    if (confirmation) {
      this.action = $localize`Supprimer un cours`;
      if (cours) {
        this.coursservice.Delete(c.ID).then((result) => {
          if (result) {
            this.UpdateListeCours();
            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
          } else {
            let o = errorService.UnknownError(this.action);
          }
        }).catch((err: HttpErrorResponse) => {
          let o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
        })
      }
    }
  }

  Create(): void {
    let c = new cours();
    this.editCours = new Cours(c);
    this.editMode = true;
  }

  Save(cours: Cours) {
    const errorService = ErrorService.instance;
    this.action = $localize`Ajouter un cours`;
    if (cours) {
      if (cours.ID == 0) {

        this.coursservice.Add(cours.datasource).then((id) => {
          if (id > 0) {
            this.editCours.ID = id;
            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
            this.UpdateListeCours();
          } else {
            let o = errorService.UnknownError(this.action);
            errorService.emitChange(o);
          }

        }).catch((err) => {
          let o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
        });
      }
      else {
        this.coursservice.Update(cours.datasource).then((ok) => {

          this.action = $localize`Mettre à jour un cours`;
          if (ok) {


            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
            this.UpdateListeCours();
          } else {
            let o = errorService.UnknownError(this.action);
            errorService.emitChange(o);
          }

        }).catch((err) => {
          let o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
        });
      }
    }
  }

  public GetCoursID(id: number): Promise<cours | null> {
    return this.coursservice.Get(id)
      .then((c: cours) => {
        return c; // Retourne la valeur du cours récupéré
      })
      .catch(() => {
        return null; // Retourne null en cas d'erreur
      });
  }

  Retour(): void {

    let confirm = window.confirm($localize`Vous perdrez les modifications réalisées non sauvegardées, voulez-vous continuer ?`);
    if (confirm) {
      this.editMode = false;
      this.editCours = null;
      this.UpdateListeCours();
    }
  }



  Sort(sens: "NO" | "ASC" | "DESC", champ: string) {
    switch (champ) {
      case "nom":
        this.sort_nom = sens;
        this.sort_jour = "NO";
        this.sort_lieu = "NO";
        this.listeCours_VM.sort((a, b) => {
          const nomA = a.Nom.toUpperCase(); // Ignore la casse lors du tri
          const nomB = b.Nom.toUpperCase();
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
        this.sort_jour = "NO";
        this.sort_nom = "NO";
        this.listeCours_VM.sort((a, b) => {
          const lieuA = this.listelieu.find(lieu => lieu.key === a.LieuId)?.value || '';
          const lieuB = this.listelieu.find(lieu => lieu.key === b.LieuId)?.value || '';

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
      case "jour":
        this.sort_lieu = "NO";
        this.sort_jour = sens;
        this.sort_nom = "NO";
        this.listeCours_VM.sort((a, b) => {
          let jourA = 0;
          let jourB = 0;
          let jourEnum = jour_semaine[a.JourSemaine.toLowerCase() as keyof typeof jour_semaine];
          if (jourEnum !== undefined) {
            jourA = jourEnum;
          };
          jourEnum = jour_semaine[b.JourSemaine.toLowerCase() as keyof typeof jour_semaine];
          if (jourEnum !== undefined) {
            jourB = jourEnum;
          };
          // Ignorer la casse lors du tri

          let comparaison = 0;
          if (jourA > jourB) {
            comparaison = 1;
          } else if (jourA < jourB) {
            comparaison = -1;
          }

          return this.sort_jour === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
        });
        break;

    }


  }
  getActiveSaison(): string {
    let s = this.liste_saison.find((x) => x == this.active_saison);
    if (s) {
      return s.nom;
    } else {
      return '';
    }
  }

    ExportExcel() {
      let headers = {
        ID: 'ID',
        Nom: 'Nom',
        JourSemaine: 'Jour de la semaine',
        Heure: 'Heure',
        Duree: 'Durée',
        ProfPrincipalId: 'Professeur principal',
        LieuId: 'Lieu',
        SaisonId: 'Saison',
        AgeMinimum: 'Âge minimum',
        AgeMaximum: 'Âge maximum',
        PlaceMaximum: 'Nombre de places maximum',
        ConvocationNominative: 'Convocation nominative',
        AfficherPresent: 'Afficher présent',
        EssaiPossible: 'Essai possible',
      };
      let list: Cours[] = this.getFilteredCours();
      this.excelService.exportAsExcelFile(list, 'liste_cours', headers);
    }
    getFilteredCours(): Cours[] {
      return this.listeCours_VM.filter((item) => {
        return (
          (!this.filters.filter_nom ||
            item.Nom.toLowerCase().includes(
              this.filters.filter_nom.toLowerCase()
            )) &&
            (!this.filters.filter_lieu ||
              item.LieuId == this.filters.filter_lieu
              ) &&
              (!this.filters.filter_jour ||
                  item.JourSemaine == this.filters.filter_jour
                  ) &&
       
          (!this.filters.filter_groupe ||
            item.Groupes.some((x) =>
              x.nom.toLowerCase().includes(
                this.filters.filter_groupe?.toLowerCase() ?? ''
              )
            )) && 
            (!this.filters.filter_prof ||
              item.ProfPrincipalId == 
              this.filters.filter_prof
                ))
                
          });
      }



  ReinitFiltre() {
    this.filters.filter_groupe = null;
    this.filters.filter_lieu = null;
    this.filters.filter_nom = null;
    this.filters.filter_prof = null;
  }
}

export class FilterCours {
  private _filter_nom: string | null = null;
  get filter_nom(): string | null {
    return this._filter_nom;
  }
  set filter_nom(value: string | null) {
    this._filter_nom = value;
    this.onFilterChange();
  }


  private _filter_prof: number | null = null;
  get filter_prof(): number | null {
    return this._filter_prof;
  }
  set filter_prof(value: number | null) {
    this._filter_prof = value;
    this.onFilterChange();
  }



  private _filter_groupe: string | null = null;
  get filter_groupe(): string | null {
    return this._filter_groupe;
  }
  set filter_groupe(value: string | null) {
    this._filter_groupe = value;
    this.onFilterChange();
  }
  private _filter_jour: string | null = null;
  get filter_jour(): string | null {
    return this._filter_jour;
  }
  set filter_jour(value: string | null) {
    this._filter_jour = value;
    this.onFilterChange();
  }
  private _filter_lieu: number | null = null;
  get filter_lieu(): number | null {
    return this._filter_lieu;
  }
  set filter_lieu(value: number | null) {
    this._filter_lieu = value;
    this.onFilterChange();
  }

  private onFilterChange(): void {}
}
