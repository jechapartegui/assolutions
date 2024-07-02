import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
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

@Component({
  selector: 'app-cours',
  templateUrl: './cours.component.html',
  styleUrls: ['./cours.component.css']
})
export class CoursComponent implements OnInit {
  // cours.component.ts
  constructor(private coursservice: CoursService, private lieuserv: LieuService, public ridersService: AdherentService, private router: Router, private saisonserv: SaisonService,
    private grServ: GroupeService) { }
  listeprof: KeyValuePair[];
  listelieu: KeyValuePair[];

  seasons: KeyValuePair[];
  listeCours: cours[] = [];
  listeCours_VM: Cours[] = []; // Initialisez la liste des cours (vous pouvez la charger à partir d'une API, par exemple)
  editMode = false;
  editCours: Cours | null = null;
  current_groupe_id: number;
  groupe_dispo: Groupe[] = [];
  liste_groupe: Groupe[] = [];

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

  ngOnInit(): void {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger les cours`;
    if (GlobalService.is_logged_in) {

      if (GlobalService.menu === "ADHERENT") {
        this.router.navigate(['/menu']);
        return;
      }
      // Chargez la liste des cours
      this.grServ.GetAll().then((groupes) => {
        if (groupes.length == 0) {
          let o = errorService.CreateError($localize`Récupérer les groupes`, $localize`Il faut au moins un groupe pour créer un cours`);
          errorService.emitChange(o);
          this.router.navigate(['/groupe']);
          return;
        }
        this.liste_groupe = groupes;
        this.ridersService.GetProf().then((profs) => {
          if (profs.length == 0) {
            let o = errorService.CreateError($localize`Récupérer les professeurs`, $localize`Il faut au moins un professeur pour créer un cours`);
            errorService.emitChange(o);
            this.router.navigate(['/adherent']);
            return;
          }
          this.listeprof = profs;
          this.lieuserv.GetAllLight().then((lieux) => {
            if (lieux.length == 0) {
              let o = errorService.CreateError($localize`Récupérer les lieux`, $localize`Il faut au moins un lieu pour créer un cours`);
              errorService.emitChange(o);
              if (GlobalService.menu === "ADMIN") {
                this.router.navigate(['/lieu']);

              }
              return;
            }
            this.listelieu = lieux;
            this.saisonserv.GetAllLight().then((sa) => {
              if (sa.length == 0) {
                let o = errorService.CreateError($localize`Récupérer les saisons`, $localize`Il faut au moins une saison pour créer un cours`);
                errorService.emitChange(o);
                if (GlobalService.menu === "ADMIN") {
                  this.router.navigate(['/saison']);
  
                }
                return;
              }
              this.seasons = sa;
              this.UpdateListeCours();
              let o = errorService.OKMessage(this.action);
              errorService.emitChange(o);
            }).catch((err: HttpErrorResponse) => {
              let o = errorService.CreateError($localize`récupérer les saisons`, err.message);
              errorService.emitChange(o);
              this.router.navigate(['/menu']);
              return;
            })
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

    } else {
      let o = errorService.CreateError(this.action, $localize`Accès impossible, vous n'êtes pas connecté`);
      errorService.emitChange(o);
      this.router.navigate(['/login']);
    }
  }

  UpdateListeCours() {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger les cours`;
    if (this.season_id && this.season_id > 0) {
      this.coursservice.GetCoursSeason(this.season_id).then((c) => {
        this.listeCours = c;
        this.listeCours_VM = this.listeCours.map(x => new Cours(x));
        this.UpdateListeFiltre();
      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        this.router.navigate(['/menu']);
        return;
      })
    } else {
      this.coursservice.GetCours().then((c) => {
        this.listeCours = c;
        console.log(c);
        this.listeCours_VM = this.listeCours.map(x => new Cours(x));
        console.log(this.listeCours_VM);
        this.UpdateListeFiltre();
      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        this.router.navigate(['/menu']);
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

  UpdateListeFiltre() {
    this.liste_groupe_filter = [];
    this.liste_prof_filter = [];
    this.liste_lieu_filter = [];
    this.listeCours_VM.forEach(cours => {
      // Vérifiez si le groupe est déjà présent dans la liste
      // Parcourez la liste de groupes du cours
      cours.Groupes.forEach(groupe => {
        // Vérifiez si le groupe est déjà présent dans la liste
        if (!this.liste_groupe_filter.find(g => g.id === groupe.id)) {
          this.liste_groupe_filter.push({
            id: groupe.id,
            nom: groupe.nom, // Assurez-vous que votre classe Groupe a un attribut nom
            saison_id: groupe.saison_id, // Assurez-vous que votre classe Groupe a un attribut saison_id
            temp_id: groupe.id, display:false // Utilisez l'ID du groupe comme temp_id, si nécessaire
          });
        }
      });

      // Vérifiez si le professeur principal est déjà présent dans la liste
      if (!this.liste_prof_filter.find(kv => kv.key === cours.ProfPrincipalId)) {
        this.liste_prof_filter.push(new KeyValuePairAny(cours.ProfPrincipalId, this.trouverProfesseur(cours.ProfPrincipalId))); // Remplacez "Nom du professeur" par le nom réel du professeur
      }

      // Vérifiez si le lieu est déjà présent dans la liste
      if (!this.liste_lieu_filter.find(kv => kv.key === cours.LieuId)) {
        this.liste_lieu_filter.push(new KeyValuePairAny(cours.LieuId, this.trouverLieu(cours.LieuId))); // Remplacez "Nom du lieu" par le nom réel du lieu
      }
    });
  }
  // Méthode pour trouver un professeur à partir de son ID
  trouverProfesseur(profId: number): any {
    // Implémentez la logique pour trouver le professeur à partir de la liste des professeurs
    // que vous pouvez stocker dans une variable
    const indexToUpdate = this.listeprof.findIndex(prof => prof.key === profId);

    if (indexToUpdate !== -1) {
      // Remplacer l'élément à l'index trouvé par la nouvelle valeur
      return this.listeprof[indexToUpdate].value;
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
            let o = errorService.CreateError(this.action, $localize`Erreur inconnue`);
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
            let o = errorService.CreateError(this.action, $localize`Erreur inconnue`);
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
            let o = errorService.CreateError(this.action, $localize`Erreur inconnue`);
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

  Filtrer() {
    this.UpdateListeCours();
  }
  FiltrerBack() {
    this.season_id = null;
    this.UpdateListeCours();
  }

  ReinitFiltre() {
    this.filter_jour = null;
    this.filter_groupe = null;
    this.filter_lieu = null;
    this.filter_nom = null;
    this.filter_prof = null;
  }
}
