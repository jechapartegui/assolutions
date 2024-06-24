import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { cours } from 'src/class/cours';
import { Groupe } from 'src/class/groupe';
import { KeyValuePair, KeyValuePairAny } from 'src/class/keyvaluepair';
import { Seance, StatutSeance, seance } from 'src/class/seance';
import { AdherentService } from 'src/services/adherent.service';
import { CoursService } from 'src/services/cours.service';
import { ErrorService } from 'src/services/error.service';
import { GlobalService } from 'src/services/global.services';
import { GroupeService } from 'src/services/groupe.service';
import { LieuService } from 'src/services/lieu.service';
import { SaisonService } from 'src/services/saison.service';
import { SeancesService } from 'src/services/seance.service';

@Component({
  selector: 'app-seance',
  templateUrl: './seance.component.html',
  styleUrls: ['./seance.component.css']
})
export class SeanceComponent  implements OnInit {
  listeprof: KeyValuePair[];
  listelieu: KeyValuePair[];
  prof_dispo: KeyValuePair[];
  est_prof: boolean = false;
  est_admin: boolean = false;
  seasons: KeyValuePair[];
  titre_groupe: string = $localize`Liste des groupes de la séance`;
  listeCours: cours[] = [];
  list_seance: seance[] = []; // Initialisez la liste des séances (vous pouvez la charger à partir d'une API, par exemple)
  editMode = false;
  editMode_serie: boolean = false;
  list_seance_VM: Seance[] = [];
  editSeance: Seance | null = null;
  all_seance:boolean=false;
  jour_semaine: string = "";
  date_fin_serie: Date;
  list_saison: KeyValuePair[];
  current_prof: number;
  coursselectionne: boolean = false;

  current_groupe_id: number;
  groupe_dispo: Groupe[] = [];
  liste_groupe: Groupe[] = []


  sort_nom = "NO";
  sort_cours = "NO";
  sort_date = "NO";
  sort_lieu = "NO";
  season_id: number;
  filter_date_avant: Date;
  filter_date_apres: Date;
  filter_nom: string;
  filter_cours: number;
  filter_groupe: number;
  filter_lieu: number;
  filter_prof: number;
  liste_groupe_filter: Groupe[];
  liste_prof_filter: KeyValuePairAny[];
  liste_lieu_filter: KeyValuePairAny[];
  action: string = "";
  afficher_menu_admin: boolean = false;

  listeStatuts: StatutSeance[];

  constructor(
    private seancesservice: SeancesService, private coursservice: CoursService, private lieuserv: LieuService, public ridersService: AdherentService, private router: Router, private saisonserv: SaisonService,
    private grServ: GroupeService) { }

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
                this.coursservice.GetCours().then((c) =>{
                  this.listeCours = c;
                }).catch((err: HttpErrorResponse) => {
                  let o = errorService.CreateError($localize`récupérer les cours`, err.message);
                  errorService.emitChange(o);
                  this.router.navigate(['/menu']);
                  return;
                })
                this.UpdateListeSeance();
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

  UpdateListSeance() {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger les séances`;
    if (this.season_id && this.season_id > 0) {
      this.seancesservice.GetSeancesSeason(this.season_id).then((seance) => {
        this.list_seance = seance;
        this.list_seance_VM = this.list_seance.map(x => new Seance(x));
        this.UpdateListeFiltre();
      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        this.router.navigate(['/menu-inscription']);
        return;
      })
    } else {
      this.seancesservice.GetSeances().then((seance) => {
        this.list_seance = seance;
        this.list_seance_VM = this.list_seance.map(x => new Seance(x));
        this.UpdateListeFiltre();
      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        this.router.navigate(['/menu-inscription']);
        return;
      })
    }
  }


  AjouterProf() {
    let kvp = this.prof_dispo.filter(e => e.key == this.current_prof)[0];
    this.editSeance.professeurs.push(kvp);
    this.current_prof = null;
    this.MAJListeProf();
  }
  RemoveProf(item) {
    this.editSeance.professeurs = this.editSeance.professeurs.filter(e => e.key !== item.key);
    this.MAJListeProf();
  }
  MAJListeProf() {
    this.prof_dispo = this.listeprof;
    this.editSeance.professeurs.forEach(element => {
      let element_to_remove = this.listeprof.find(e => e.key == element.key);
      if (element_to_remove) {
        this.prof_dispo = this.prof_dispo.filter(e => e.key !== element_to_remove.key);
      }
    });
  }

  MAJListeGroupe() {
    this.groupe_dispo = this.liste_groupe;
    this.editSeance.Groupes.forEach((element: Groupe) => {
      let element_to_remove = this.liste_groupe.find(e => e.id == element.id);
      if (element_to_remove) {
        this.groupe_dispo = this.groupe_dispo.filter(e => e.id !== element_to_remove.id);
      }
    });
  }


  Edit(seance: Seance): void {
    var this_seance = this.list_seance.find(x => x.seance_id == seance.ID);
    this.editSeance = new Seance(this_seance);
    this.MAJListeProf();
    this.MAJListeGroupe();
    if(this.editSeance.Cours){
      this.coursselectionne = true;

    } else {
      this.coursselectionne = false;

    }
    this.editMode = true;
  }
  onCoursSelectionChange(cours_id: any): void {
    //  console.log('Nouvelle valeur sélectionnée :', newValue);
    if (!isNaN(cours_id)) {
      const indexToUpdate = this.listeCours.findIndex(cc => cc.id === cours_id);
      const newValue = this.listeCours[indexToUpdate];
      this.coursselectionne = true;
      this.editSeance.duree_seance = newValue.duree;
      this.editSeance.AgeRequis = newValue.age_minimum;
      this.editSeance.AgeMaximum = newValue.age_maximum;
      this.editSeance.EstAgeMaximum = newValue.est_limite_age_maximum;
      this.editSeance.EstAgeRequis = newValue.est_limite_age_minimum
      this.editSeance.libelle = newValue.nom;
      this.editSeance.heure_debut = newValue.heure;
      this.editSeance.ConvocationNominative = newValue.convocation_nominative;
      this.editSeance.EstPlaceMaximum = newValue.est_place_maximum;
      this.editSeance.PlaceMaximum = newValue.place_maximum;
      this.editSeance.AfficherPresent = newValue.afficher_present;
      this.editSeance.TypeSeance = newValue.type_cours;
      this.editSeance.date_seance = null;
      this.editSeance.Groupes = [];
      newValue.groupes.forEach((el) => {
        this.editSeance.Groupes.push(el);
      })
      this.editSeance.professeurs = [];
      this.editSeance.professeurs.push(new KeyValuePair(newValue.prof_principal_id, newValue.prof_principal_nom));
      this.editSeance.LieuId = newValue.lieu_id;
      this.jour_semaine = newValue.jour_semaine;
    } else {
      this.coursselectionne = false;
    }
    this.MAJListeGroupe();
    this.MAJListeProf();
    this.editSeance.valid.controler();
    // Faites ce que vous voulez avec la nouvelle valeur sélectionnée ici
  }

  isProfInEditSeance(prof: KeyValuePair): boolean {
    return this.editSeance.professeurs.some(p => p.value === prof.value);
  }



  Creer(serie: boolean = false): void {
    this.editSeance = new Seance(new seance());
    this.coursselectionne = false;
    if (serie) {
      this.editMode_serie = true;
      this.editSeance.date_seance = new Date();
      this.date_fin_serie = new Date();
    }
    this.editMode = true;
    this.MAJListeProf();
    this.MAJListeGroupe();
  }

  VoirMaSeance() {
    let confirmation = window.confirm("Voulez-vous aller vers la vue du professeur ? les modifications non sauvegardées seront perdues");
    if (confirmation) {
      this.router.navigate(['/ma-seance'], { queryParams: { id: this.editSeance.ID } });

    }
  }

  AjouterSerie() {
    this.editMode_serie = false;
  }
  TerminerSeance() {
    let confirmation = window.confirm("Voulez-vous aller vers la vue du professeur ? les modifications non sauvegardées seront perdues");
  }





  AnnulerCetteSeance() {
    let errorService = ErrorService.instance;
    this.action = $localize`Annuler la séance`
    let confirmation = window.confirm($localize`La séance sera annulée et ne sera plus visible pour les adhérents et professeurs, vous allez être basculé sur le mail d'annulation. Confirmez vous l'opération ?`);
    if (confirmation) {
      this.seancesservice.MAJStatut(this.editSeance.ID, StatutSeance.annulée).then((retour) => {
        if (retour) {
          this.editSeance.Statut = StatutSeance.annulée;
          this.editSeance.MailAnnulation = true;
          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
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
  TerminerCetteSeance() {
    let errorService = ErrorService.instance;
    this.action = $localize`Terminer la séance`
    let confirmation = window.confirm($localize`La séance sera terminée et ne sera plus visible pour les adhérents et professeurs. Confirmez vous l'opération ?`);
    if (confirmation) {
      this.seancesservice.MAJStatut(this.editSeance.ID, StatutSeance.réalisée).then((retour) => {
        if (retour) {
          this.editSeance.Statut = StatutSeance.réalisée;
          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
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
  RePlanifierCetteSeance() {
    let errorService = ErrorService.instance;
    this.action = $localize`Planifier à nouveau la séance`
    let confirmation = window.confirm($localize`La séance sera à nouveau planifiée et sera à nouveau visible pour les adhérents et professeurs. Confirmez vous l'opération ?`);
    if (confirmation) {
      this.seancesservice.MAJStatut(this.editSeance.ID, StatutSeance.prévue).then((retour) => {
        if (retour) {
          this.editSeance.Statut = StatutSeance.prévue;
          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
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

  AnnulerCetteSeanceListe(seance : Seance) {
    let errorService = ErrorService.instance;
    this.action = $localize`Annuler la séance`
    let confirmation = window.confirm($localize`La séance sera annulée et ne sera plus visible pour les adhérents et professeurs, vous allez être basculé sur le mail d'annulation. Confirmez vous l'opération ?`);
    if (confirmation) {
      this.seancesservice.MAJStatut(seance.ID, StatutSeance.annulée).then((retour) => {
        if (retour) {
          seance.Statut = StatutSeance.annulée;
          seance.MailAnnulation = true;
          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
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
  TerminerCetteSeanceListe(seance : Seance) {
    let errorService = ErrorService.instance;
    this.action = $localize`Terminer la séance`
    let confirmation = window.confirm($localize`La séance sera terminée et ne sera plus visible pour les adhérents et professeurs. Confirmez vous l'opération ?`);
    if (confirmation) {
      this.seancesservice.MAJStatut(seance.ID, StatutSeance.réalisée).then((retour) => {
        if (retour) {
          seance.Statut = StatutSeance.réalisée;
          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
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
  RePlanifierCetteSeanceListe(seance: Seance) {
    let errorService = ErrorService.instance;
    this.action = $localize`Planifier à nouveau la séance`
    let confirmation = window.confirm($localize`La séance sera à nouveau planifiée et sera à nouveau visible pour les adhérents et professeurs. Confirmez vous l'opération ?`);
    if (confirmation) {
      this.seancesservice.MAJStatut(seance.ID, StatutSeance.prévue).then((retour) => {
        if (retour) {
          seance.Statut = StatutSeance.prévue;
          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
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

  UpdateListeSeance() {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger les séances`;
    if (this.season_id && this.season_id > 0) {
      this.seancesservice.GetSeancesSeason(this.season_id, this.all_seance).then((seances) => {
        this.list_seance = seances;
        this.list_seance_VM = this.list_seance.map(x => new Seance(x));
        this.UpdateListeFiltre();
      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        this.router.navigate(['/menu-inscription']);
        return;
      })
    } else {
      this.seancesservice.GetSeances(this.all_seance).then((seances) => {
        this.list_seance = seances;
        this.list_seance_VM = this.list_seance.map(x => new Seance(x));
        this.UpdateListeFiltre();
      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        this.router.navigate(['/menu-inscription']);
        return;
      })
    }
  }

  UpdateListeFiltre() {
    this.liste_groupe_filter = [];
    this.liste_prof_filter = [];
    this.liste_lieu_filter = [];
    this.list_seance_VM.forEach(seance => {
      // Vérifiez si le groupe est déjà présent dans la liste
      // Parcourez la liste de groupes du cours
      seance.Groupes.forEach(groupe => {
        // Vérifiez si le groupe est déjà présent dans la liste
        if (!this.liste_groupe_filter.find(g => g.id === groupe.id)) {
          this.liste_groupe_filter.push({
            id: groupe.id,
            nom: groupe.nom, // Assurez-vous que votre classe Groupe a un attribut nom
            saison_id: groupe.saison_id, // Assurez-vous que votre classe Groupe a un attribut saison_id
            temp_id: groupe.id // Utilisez l'ID du groupe comme temp_id, si nécessaire
          });
        }
      });

      seance.professeurs.forEach(prof => {
        // Vérifiez si le groupe est déjà présent dans la liste
        if (!this.liste_prof_filter.find(g => g.key === prof.key)) {
          this.liste_prof_filter.push({
            key: prof.key,
            value: prof.value
          });
        }
      });

      // Vérifiez si le lieu est déjà présent dans la liste
      if (!this.liste_lieu_filter.find(kv => kv.key === seance.LieuId)) {
        this.liste_lieu_filter.push(new KeyValuePairAny(seance.LieuId, this.trouverLieu(seance.LieuId))); // Remplacez "Nom du lieu" par le nom réel du lieu
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

  supprimerSeance(seance: Seance): void {
    const errorService = ErrorService.instance;

    let confirmation = window.confirm($localize`Voulez-vous supprimer cette séance ? Cette action est définitive. `);
    if (confirmation) {
      this.action = $localize`Supprimer une séance`;
      if (seance) {
        this.seancesservice.Delete(seance.ID).then((result) => {
          if (result) {
            this.UpdateListeSeance();
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


  Save(seance: Seance) {
    const errorService = ErrorService.instance;
    this.action = $localize`Ajouter une séance`;
    if (seance) {
      if (seance.ID == 0) {

        this.seancesservice.Add(seance.datasource).then((id) => {
          if (id > 0) {
            this.editSeance.ID = id;
            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
            this.UpdateListeSeance();
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
        this.seancesservice.Update(seance.datasource).then((ok) => {

          this.action = $localize`Mettre à jour une séance`;
          if (ok) {


            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
            this.UpdateListeSeance();
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

  public GetSeanceID(id: number): Promise<seance | null> {
    return this.seancesservice.Get(id)
      .then((c: seance) => {
        return c; // Retourne la valeur du cours récupéré
      })
      .catch(() => {
        return null; // Retourne null en cas d'erreur
      });
  }



  Message() {
    let confirm = window.confirm($localize`Vous perdrez les modifications réalisées non sauvegardées, voulez-vous continuer ?`);
    if (confirm) {
      this.editMode = false;
      this.editSeance = null;
      this.UpdateListeSeance();
    }
  }

  Sort(sens: "NO" | "ASC" | "DESC", champ: string) {
    switch (champ) {
      case "nom":
        this.sort_nom = sens;
        this.sort_date = "NO";
        this.sort_lieu = "NO";
        this.sort_cours = "NO";
        this.list_seance_VM.sort((a, b) => {
          const nomA = a.libelle.toUpperCase(); // Ignore la casse lors du tri
          const nomB = b.libelle.toUpperCase();
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
        this.list_seance_VM.sort((a, b) => {
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
      case "date":
        this.sort_lieu = "NO";
        this.sort_date = sens;
        this.sort_cours = "NO";
        this.sort_nom = "NO";
        this.list_seance_VM.sort((a, b) => {
          let dateA = a.date_seance;
          let dateB = b.date_seance;

          let comparaison = 0;
          if (dateA > dateB) {
            comparaison = 1;
          } else if (dateA < dateB) {
            comparaison = -1;
          }

          return this.sort_date === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
        });
        break;
      case "cours":
        this.sort_lieu = "NO";
        this.sort_date = "NO";
        this.sort_cours = sens;
        this.sort_nom = "NO";
        this.list_seance_VM.sort((a, b) => {
          const coursA = this.listeCours.find(cours => cours.id === a.Cours)?.nom || '';
          const coursB = this.listeCours.find(cours => cours.id === b.Cours)?.nom || '';

          let comparaison = 0;
          if (coursA > coursB) {
            comparaison = 1;
          } else if (coursA < coursB) {
            comparaison = -1;
          }

          return this.sort_cours === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
        });
        break;

    }


  }


  Filtrer() {
    this.UpdateListeSeance();
  }
  FiltrerBack() {
    this.season_id = null;
    this.UpdateListeSeance();
  }

  ReinitFiltre() {
    this.filter_date_apres = null;
    this.filter_date_avant = null;
    this.filter_cours = null;
    this.filter_groupe = null;
    this.filter_lieu = null;
    this.filter_nom = null;
    this.filter_prof = null;
  }
}

