import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { cours } from 'src/class/cours';
import { Groupe } from 'src/class/groupe';
import { KeyValuePair, KeyValuePairAny } from 'src/class/keyvaluepair';
import { professeur, Professeur } from 'src/class/professeur';
import { Saison } from 'src/class/saison';
import { Seance, StatutSeance, seance } from 'src/class/seance';
import { SeanceProf } from 'src/class/seanceprof';
import { AdherentService } from 'src/services/adherent.service';
import { CoursService } from 'src/services/cours.service';
import { ErrorService } from 'src/services/error.service';
import { GlobalService } from 'src/services/global.services';
import { GroupeService } from 'src/services/groupe.service';
import { LieuService } from 'src/services/lieu.service';
import { ProfesseurService } from 'src/services/professeur.service';
import { SaisonService } from 'src/services/saison.service';
import { SeancesService } from 'src/services/seance.service';
import { SeanceprofService } from 'src/services/seanceprof.service';

@Component({
  selector: 'app-seance',
  templateUrl: './seance.component.html',
  styleUrls: ['./seance.component.css']
})
export class SeanceComponent implements OnInit {
  listeprof: professeur[];
  listelieu: KeyValuePair[];
  prof_dispo: Professeur[];
  est_prof: boolean = false;
  est_admin: boolean = false;
  manage_prof: boolean = false;
  titre_groupe: string = $localize`Liste des groupes de la séance`;
  listeCours: cours[] = [];
  list_seance: seance[] = []; // Initialisez la liste des séances (vous pouvez la charger à partir d'une API, par exemple)
  editMode = false;
  editMode_serie: boolean = false;
  list_seance_VM: Seance[] = [];
  editSeance: Seance | null = null;
  all_seance: boolean = false;
  jour_semaine: string = "";
  date_fin_serie: Date;
  current_prof: number;
  filter_statut: string = 'prévue';
  coursselectionne: boolean = false;

  current_groupe_id: number;
  groupe_dispo: Groupe[] = [];
  liste_groupe: Groupe[] = []


  public sort_nom = "NO";
  public sort_cours = "NO";
  public sort_date = "NO";
  public sort_lieu = "NO";
  public afficher_filtre: boolean = false;
  public season_id: number;
  public filter_date_avant: Date;
  public filter_date_apres: Date;
  public filter_nom: string;
  public filter_cours: number;
  public filter_groupe: number;
  public filter_lieu: number;
  public filter_prof: number;
  public liste_groupe_filter: Groupe[];
  public liste_prof_filter: KeyValuePairAny[];
  public liste_lieu_filter: KeyValuePairAny[];
  public liste_saison: Saison[] = [];
  public active_saison: Saison;
  public showText: boolean = false;
  public action: string = "";
  public listeStatuts: StatutSeance[];

  constructor(
    public GlobalService: GlobalService,
    private prof_serv: ProfesseurService,
    private seancesservice: SeancesService, private spservice: SeanceprofService, private coursservice: CoursService, private lieuserv: LieuService, public ridersService: AdherentService, private router: Router, private saisonserv: SaisonService,
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
        this.prof_serv.GetProf().then((profs) => {
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
            this.saisonserv.GetAll().then((sa) => {
              if (sa.length == 0) {
                let o = errorService.CreateError($localize`Récupérer les saisons`, $localize`Il faut au moins une saison pour créer un cours`);
                errorService.emitChange(o);
                if (GlobalService.menu === "ADMIN") {
                  this.router.navigate(['/saison']);

                }
                return;
              }
              this.liste_saison = sa.map(x => new Saison(x));
              this.active_saison = this.liste_saison.filter(x => x.active == true)[0];
              this.coursservice.GetCours().then((c) => {
                this.listeCours = c;
                this.UpdateListeSeance();
                let o = errorService.OKMessage(this.action);
                errorService.emitChange(o);
              }).catch((err: HttpErrorResponse) => {
                let o = errorService.CreateError($localize`récupérer les cours`, err.message);
                errorService.emitChange(o);
                this.router.navigate(['/menu']);
                return;
              })
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
  GetCours(cours) {
    return this.listeCours.find(x => x.id == cours).nom;
  }
  GetType(type) {
    switch (type) {
      case "ENTRAINEMENT":
        return $localize`Entraînement`;
      case "SORTIE":
        return $localize`Sortie`;
      case "MATCH":
        return $localize`Match`;
      case "EVENEMENT":
        return $localize`Evénement`;
    }
    return "";
  }




  Edit(seance: Seance): void {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger la séance`;
    this.seancesservice.Get(seance.ID).then((ss) => {
      this.editSeance = new Seance(ss);
      if (this.editSeance.Cours) {
        this.coursselectionne = true;

      } else {
        this.coursselectionne = false;

      }
      this.editMode = true;
    }).catch((err: HttpErrorResponse) => {
      let o = errorService.CreateError(this.action, err.message);
      errorService.emitChange(o);
    })

  }
  onCoursSelectionChange(cours_id: any): void {
    //  console.log('Nouvelle valeur sélectionnée :', newValue);
    if (!isNaN(cours_id)) {
      const indexToUpdate = this.listeCours.findIndex(cc => cc.id === cours_id);
      const newValue = this.listeCours[indexToUpdate];
      this.coursselectionne = true;
      this.editSeance.duree_seance = newValue.duree;
      this.editSeance.AgeMinimum = newValue.age_minimum;
      this.editSeance.AgeMaximum = newValue.age_maximum;
      this.editSeance.EstAgeMaximum = newValue.est_limite_age_maximum;
      this.editSeance.EstAgeMinimum = newValue.est_limite_age_minimum
      this.editSeance.libelle = newValue.nom;
      this.editSeance.heure_debut = newValue.heure;
      this.editSeance.ConvocationNominative = newValue.convocation_nominative;
      this.editSeance.EstPlaceMaximum = newValue.est_place_maximum;
      this.editSeance.PlaceMaximum = newValue.place_maximum;
      this.editSeance.EssaiPossible = newValue.essai_possible;
      this.editSeance.AfficherPresent = newValue.afficher_present;
      this.editSeance.date_seance = null;
      this.editSeance.Groupes = [];
      newValue.groupes.forEach((el) => {
        this.editSeance.Groupes.push(el);
      })
      this.editSeance.professeurs = [];
      let pr = new SeanceProf();
      pr.professeur_id = newValue.prof_principal_id;
      pr.prenom = this.listeprof.filter(x => x.id == pr.professeur_id)[0].prenom;
      pr.nom = this.listeprof.filter(x => x.id == pr.professeur_id)[0].nom;
      pr.taux_horaire = this.listeprof.filter(x => x.id == pr.professeur_id)[0].taux;
      pr.minutes = newValue.duree;
      pr.statut = 0;
      this.editSeance.professeurs.push(pr);
      this.editSeance.LieuId = newValue.lieu_id;
      this.jour_semaine = newValue.jour_semaine;
    } else {
      this.coursselectionne = false;
    }
    this.editSeance.valid.controler();
    // Faites ce que vous voulez avec la nouvelle valeur sélectionnée ici
  }



  Creer(serie: boolean = false): void {
    this.editSeance = new Seance(new seance());
    this.coursselectionne = false;
    if (serie) {
      this.editMode_serie = true;
    } else {
      this.editMode_serie = false;
    }
    this.editSeance.date_seance = new Date();
    this.date_fin_serie = new Date();
    this.editMode = true;
  }

  VoirMaSeance(seance: Seance = null) {
    let id: number;
    if (seance) {
      id = seance.ID;
    } else if (this.editSeance) {
      id = this.editSeance.ID
    } else {
      return;
    }
    let confirmation = window.confirm("Voulez-vous aller vers la vue du professeur ? les modifications non sauvegardées seront perdues");
    if (confirmation) {
      this.router.navigate(['/ma-seance'], { queryParams: { id: id } });
    }
  }
  TerminerSeances() {
    const errorService = ErrorService.instance;
    this.action = $localize`Terminer les séances passées`;
    let list_s: number[] = [];
    const today =  new Date();
    const tomorrow =  new Date(today.setDate(today.getDate() - 1));
    this.list_seance_VM.filter(x => x.Statut = StatutSeance.prévue).forEach((SVM) => {
      if (new Date(SVM.date_seance) < tomorrow ) {
        list_s.push(SVM.ID);
      }
    })
    this.seancesservice.TerminerSeances(list_s).then((retour) => {
      if (retour == list_s.length) {
        let o = errorService.OKMessage(this.action);
        errorService.emitChange(o);
        this.UpdateListeSeance();
      } else {
        let o = errorService.CreateError(this.action, $localize`Nombre de séances mise à jour : ` + retour.toString() + "/" + list_s.length.toString());
        errorService.emitChange(o);
      }
    }).catch((err: HttpErrorResponse) => {
      let o = errorService.CreateError(this.action, err.message);
      errorService.emitChange(o);
    })
  }


  ChangerStatut(statut: string) {
    const errorService = ErrorService.instance;
    const old_statut = this.editSeance.Statut;
    switch (statut) {
      case 'réalisée':
        this.action = $localize`Terminer la séance`;
        this.editSeance.Statut = StatutSeance.réalisée;
        break;
      case 'prévue':
        this.action = $localize`Planifier la séance`;
        this.editSeance.Statut = StatutSeance.prévue;
        break;
      case 'annulée':
        this.action = $localize`Annuler la séance`;
        this.editSeance.Statut = StatutSeance.annulée;
        break;
    }
    this.seancesservice.MAJStatutSeance(this.editSeance.ID, statut).then((retour) => {
      if (retour) {
        let o = errorService.OKMessage(this.action);
        errorService.emitChange(o);
      } else {
        this.editSeance.Statut = old_statut;
        let o = errorService.UnknownError(this.action);
        errorService.emitChange(o);
      }
      this.UpdateListeSeance();
    }).catch((err: HttpErrorResponse) => {
      this.editSeance.Statut = old_statut;
      let o = errorService.CreateError(this.action, err.message);
      errorService.emitChange(o);
    })
  }

  UpdateListeSeance() {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger les séances`;
    if (this.season_id && this.season_id > 0) {
      this.seancesservice.GetSeancesSeason(this.season_id, true).then((seances) => {
        this.list_seance = seances;
        this.list_seance_VM = this.list_seance.map(x => new Seance(x));
        this.list_seance_VM.sort((a, b) => {
          let dateA = a.date_seance;
          let dateB = b.date_seance;

          let comparaison = 0;
          if (dateA > dateB) {
            comparaison = -1;
          } else if (dateA < dateB) {
            comparaison = 1;
          }

          return -comparaison; // Inverse pour le tri descendant
        });
        this.UpdateListeFiltre();
      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        this.router.navigate(['/menu']);
        return;
      })
    } else {
      this.seancesservice.GetSeances(true).then((seances) => {
        this.list_seance = seances;
        this.list_seance_VM = this.list_seance.map(x => new Seance(x));
        this.list_seance_VM.sort((a, b) => {
          let dateA = a.date_seance;
          let dateB = b.date_seance;

          let comparaison = 0;
          if (dateA > dateB) {
            comparaison = -1;
          } else if (dateA < dateB) {
            comparaison = 1;
          }

          return -comparaison; // Inverse pour le tri descendant
        });
        this.UpdateListeFiltre();
      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        this.router.navigate(['/menu']);
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
            temp_id: groupe.id, display: false, lien_groupe_id: 0 // Utilisez l'ID du groupe comme temp_id, si nécessaire
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
    const indexToUpdate = this.listeprof.findIndex(prof => prof.id === profId);

    if (indexToUpdate !== -1) {
      // Remplacer l'élément à l'index trouvé par la nouvelle valeur
      return this.listeprof[indexToUpdate].nom;
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

  Delete(seance: Seance): void {
    const errorService = ErrorService.instance;

    let confirmation = window.confirm($localize`Voulez-vous supprimer cette séance ? Cette action est définitive. `);
    if (confirmation) {
      this.action = $localize`Supprimer une séance`;
      if (seance) {
        this.seancesservice.Delete(seance.ID).then((result) => {
          if (result) {
            seance.professeurs.forEach((sp) => {
              this.spservice.Delete(sp);
            })
            this.UpdateListeSeance();
            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
          } else {
            let o = errorService.UnknownError(this.action);
            errorService.emitChange(o);
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
        if (this.editMode_serie) {
          this.action = $localize`Ajouter une série de séances`;
          this.seancesservice.AddRange(seance.datasource, seance.datasource.date_seance, this.date_fin_serie, this.jour_semaine).then((seances) => {
            if (seances.length > 0) {
              seances.forEach((id_s) => {
                this.editSeance.professeurs.forEach((prof: SeanceProf) => {
                  prof.seance_id = id_s; this.spservice.Add(prof);
                })
              })
              let o = errorService.OKMessage(this.action);
              errorService.emitChange(o);
              this.editMode = false;
              this.editSeance = null;
              this.UpdateListeSeance();
            } else {
              let o = errorService.CreateError(this.action, $localize`Aucune séance créée`);
              errorService.emitChange(o);
            }
          }).catch((err) => {
            let o = errorService.CreateError(this.action, err.message);
            errorService.emitChange(o);
          });

        } else {
          this.seancesservice.Add(seance.datasource).then((id) => {
            if (id > 0) {
              this.editSeance.ID = id;
              this.editSeance.professeurs.forEach((ss) => {
                ss.seance_id = id;
                this.spservice.Add(ss);
              })
              let o = errorService.OKMessage(this.action);
              errorService.emitChange(o);
              this.UpdateListeSeance();
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
      else {
        this.action = $localize`Mettre à jour une séance`;
        this.seancesservice.Update(seance.datasource).then((ok) => {
          if (ok) {
            this.spservice.UpdateSeance(seance.professeurs, seance.ID).then((ok) => {
              if (ok) {
                let o = errorService.OKMessage(this.action);
                errorService.emitChange(o);
              } else {
                this.action = $localize`Mettre à jour une séance OK - Mise à jour liste professeur KO`;
                let o = errorService.UnknownError(this.action);
                errorService.emitChange(o);
              }

            }).catch((err) => {
              this.action = $localize`Mettre à jour une séance OK - Mise à jour liste professeur KO`;
              let o = errorService.CreateError(this.action, err.message);
              errorService.emitChange(o);
            });
            this.UpdateListeSeance();
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

  public GetSeanceID(id: number): Promise<seance | null> {
    return this.seancesservice.Get(id)
      .then((c: seance) => {
        return c; // Retourne la valeur du cours récupéré
      })
      .catch(() => {
        return null; // Retourne null en cas d'erreur
      });
  }



  Refresh() {
    const errorService = ErrorService.instance;
    this.action = $localize`Rafraichir la séance`;
    this.seancesservice.Get(this.editSeance.ID).then((c) => {
      this.editSeance = new Seance(c);
      let o = errorService.OKMessage(this.action);
      errorService.emitChange(o);
    }).catch((err: HttpErrorResponse) => {
      let o = errorService.CreateError(this.action, err.message);
      errorService.emitChange(o);
      return;
    })
  }

  Retour(): void {

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

