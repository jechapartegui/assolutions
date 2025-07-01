import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AdherentService } from '../../services/adherent.service';
import { CoursService } from '../../services/cours.service';
import { ErrorService } from '../../services/error.service';
import { ExcelService } from '../../services/excel.service';
import { GlobalService } from '../../services/global.services';
import { GroupeService } from '../../services/groupe.service';
import { ProfesseurService } from '../../services/professeur.service';
import { SaisonService } from '../../services/saison.service';
import { SeancesService } from '../../services/seance.service';
import { SeanceprofService } from '../../services/seanceprof.service';
import { KeyValuePair, KeyValuePairAny } from '@shared/src/lib/autres.interface';
import { LieuNestService } from '../../services/lieu.nest.service';
import { CoursVM } from '@shared/src/lib/cours.interface';
import { SeanceProfesseurVM, SeanceVM, StatutSeance } from '@shared/src/lib/seance.interface';
import { LienGroupe_VM } from '@shared/src/lib/groupe.interface';
import { ProfesseurVM, SaisonVM } from '@shared/src';


@Component({
  selector: 'app-seance',
  templateUrl: './seance.component.html',
  styleUrls: ['./seance.component.css'],
})
export class SeanceComponent implements OnInit {
  public afficher_filtre: boolean = false;
  public loading: boolean = false;
  @ViewChild('scrollableContent', { static: false })
  scrollableContent!: ElementRef;
  showScrollToTop: boolean = false;
  public filters: FilterSeance = new FilterSeance();
  public selected_filter: string;
  public selected_sort: any;
  public selected_sort_sens: any;
  public afficher_tri: boolean = false;
  public histo_seance: string;
  listeprof: ProfesseurVM[];
  listelieu: KeyValuePair[];
  prof_dispo: ProfesseurVM[];
  est_prof: boolean = false;
  est_admin: boolean = false;
  manage_prof: boolean = false;
  titre_groupe: string = $localize`Liste des groupes de la séance`;
  listeCours: CoursVM[] = [];
  editMode = false;
  editMode_serie: boolean = false;

  list_seance_VM: SeanceVM[] = [];
  editSeance: SeanceVM | null = null;

  all_seance: boolean = false;
  jour_semaine: string = '';
  date_fin_serie: Date;
  current_prof: number;
  filter_statut: string = 'prévue';
  coursselectionne: boolean = false;

  current_groupe_id: number;
  groupe_dispo: KeyValuePair[] = [];
  liste_groupe: KeyValuePair[] = [];

  public sort_nom = 'NO';
  public sort_cours = 'NO';
  public sort_date = 'NO';
  public sort_lieu = 'NO';
  public season_id: number;

  public liste_groupe_filter: KeyValuePair[];
  public liste_prof_filter: KeyValuePairAny[];
  public liste_lieu_filter: string[];
  public liste_saison: SaisonVM[] = [];
  public active_saison: SaisonVM;
  public showText: boolean = false;
  public action: string = '';
  public listeStatuts: StatutSeance[];

  constructor(
    public GlobalService: GlobalService,
    private excelService: ExcelService,
    private prof_serv: ProfesseurService,
    private seancesservice: SeancesService,
    private spservice: SeanceprofService,
    private coursservice: CoursService,
    private lieuserv: LieuNestService,
    public ridersService: AdherentService,
    private router: Router,
    private saisonserv: SaisonService,
    private grServ: GroupeService
  ) {}

  async ngOnInit(): Promise<void> {
    const errorService = ErrorService.instance;
    this.loading = true;
    this.action = $localize`Charger les cours`;
    if (GlobalService.is_logged_in) {
      if (GlobalService.menu === 'ADMIN') {
        this.router.navigate(['/menu']);
        this.loading = false;
        return;
      }
      // Chargez la liste des cours
      this.grServ
        .GetAll()
        .then((groupes) => {
          if (groupes.length == 0) {
            let o = errorService.CreateError(
              $localize`Récupérer les groupes`,
              $localize`Il faut au moins un groupe pour créer un cours`
            );
            errorService.emitChange(o);
            this.router.navigate(['/groupe']);
            this.loading = false;
            return;
          }
          this.liste_groupe = groupes;
          this.liste_groupe_filter = groupes;
          this.prof_serv
            .GetProf()
            .then((profs) => {
              if (profs.length == 0) {
                let o = errorService.CreateError(
                  $localize`Récupérer les professeurs`,
                  $localize`Il faut au moins un professeur pour créer un cours`
                );
                errorService.emitChange(o);
                this.router.navigate(['/adherent']);
                this.loading = false;
                return;
              }
              this.listeprof = profs;
              this.liste_prof_filter = this.listeprof.map((x) => {
                return { key: x.id, value: x.prenom + ' ' + x.nom };
              });
              this.lieuserv
                .GetAllLight()
                .then((lieux) => {
                  if (lieux.length == 0) {
                    let o = errorService.CreateError(
                      $localize`Récupérer les lieux`,
                      $localize`Il faut au moins un lieu pour créer un cours`
                    );
                    errorService.emitChange(o);
                    this.loading = false;
                    if (GlobalService.menu === 'ADMIN') {
                      this.router.navigate(['/lieu']);
                    }
                    return;
                  }
                  this.listelieu = lieux;
                  this.liste_lieu_filter = lieux.map((x) => x.value);
                  this.saisonserv
                    .GetAll()
                    .then((sa) => {
                      if (sa.length == 0) {
                        let o = errorService.CreateError(
                          $localize`Récupérer les saisons`,
                          $localize`Il faut au moins une saison pour créer un cours`
                        );
                        errorService.emitChange(o);
                        this.loading = false;
                        if (GlobalService.menu === 'ADMIN') {
                          this.router.navigate(['/saison']);
                        }
                        return;
                      }
                      this.liste_saison = sa;
                      this.active_saison = this.liste_saison.filter(
                        (x) => x.active == true
                      )[0];
                      this.coursservice
                        .GetAll(this.active_saison.id)
                        .then((c) => {
                          this.listeCours = c;
                          this.UpdateListeSeance();
                          let o = errorService.OKMessage(this.action);
                          errorService.emitChange(o);
                        })
                        .catch((err: HttpErrorResponse) => {
                          let o = errorService.CreateError(
                            $localize`récupérer les cours`,
                            err.message
                          );
                          errorService.emitChange(o);
                          this.loading = false;
                          this.router.navigate(['/menu']);
                          return;
                        });
                    })
                    .catch((err: HttpErrorResponse) => {
                      let o = errorService.CreateError(
                        $localize`récupérer les saisons`,
                        err.message
                      );
                      errorService.emitChange(o);
                      this.loading = false;
                      this.router.navigate(['/menu']);
                      return;
                    });
                })
                .catch((err: HttpErrorResponse) => {
                  let o = errorService.CreateError(
                    $localize`récupérer les lieux`,
                    err.message
                  );
                  errorService.emitChange(o);
                  this.loading = false;
                  this.router.navigate(['/menu']);
                  return;
                });
            })
            .catch((err: HttpErrorResponse) => {
              let o = errorService.CreateError(
                $localize`récupérer les profs`,
                err.message
              );
              errorService.emitChange(o);
              this.loading = false;
              this.router.navigate(['/menu']);
              return;
            });
        })
        .catch((err: HttpErrorResponse) => {
          let o = errorService.CreateError(
            $localize`Récupérer les groupes`,
            err.message
          );
          errorService.emitChange(o);
          this.loading = false;
          this.router.navigate(['/groupe']);
          return;
        });
    } else {
      let o = errorService.CreateError(
        this.action,
        $localize`Accès impossible, vous n'êtes pas connecté`
      );
      errorService.emitChange(o);
      this.loading = false;
      this.router.navigate(['/login']);
    }
  }
  GetCours(cours) {
    return this.listeCours.find((x) => x.id == cours).nom;
  }
  GetType(type) {
    switch (type) {
      case 'ENTRAINEMENT':
        return $localize`Entraînement`;
      case 'SORTIE':
        return $localize`Sortie`;
      case 'MATCH':
        return $localize`Match`;
      case 'EVENEMENT':
        return $localize`Evénement`;
    }
    return '';
  }

  checkModification(): boolean {
    let ret_sa = JSON.stringify(this.editSeance);
    if (ret_sa != this.histo_seance) {
      return true;
    }
    return false;
  }

  Edit(seance: SeanceVM): void {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger la séance`;
    this.seancesservice
      .Get(seance.seance_id)
      .then((ss) => {
        this.editSeance = new SeanceVM();
        if (this.editSeance.cours) {
          this.coursselectionne = true;
        } else {
          this.coursselectionne = false;
        }
        this.histo_seance = JSON.stringify(this.editSeance);
        this.editMode = true;
      })
      .catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });
  }
  onCoursSelectionChange(cours_id: any): void {
    //  console.log('Nouvelle valeur sélectionnée :', newValue);
    if (!isNaN(cours_id)) {
      const indexToUpdate = this.listeCours.findIndex(
        (cc) => cc.id === cours_id
      );
      const newValue = this.listeCours[indexToUpdate];
      this.coursselectionne = true;
      this.editSeance.duree_seance = newValue.duree;
      this.editSeance.age_minimum = newValue.age_minimum;
      this.editSeance.age_maximum = newValue.age_maximum;
      this.editSeance.est_limite_age_maximum = newValue.est_limite_age_maximum;
      this.editSeance.est_limite_age_minimum = newValue.est_limite_age_minimum;
      this.editSeance.libelle = newValue.nom;
      this.editSeance.heure_debut = newValue.heure;
      this.editSeance.convocation_nominative = newValue.convocation_nominative;
      this.editSeance.est_place_maximum = newValue.est_place_maximum;
      this.editSeance.place_maximum = newValue.place_maximum;
      this.editSeance.essai_possible = false;
      this.editSeance.afficher_present = newValue.afficher_present;
      this.editSeance.date_seance = null;
      this.editSeance.groupes = [];
      newValue.groupes.forEach((el) => {
        this.editSeance.groupes.push(el);
      });
      this.editSeance.seanceProfesseurs = [];
      let pr = new SeanceProfesseurVM();
      pr.professeur_id = newValue.prof_principal_id;
      pr.prenom = this.listeprof.filter(
        (x) => x.id == pr.professeur_id
      )[0].prenom;
      pr.nom = this.listeprof.filter((x) => x.id == pr.professeur_id)[0].nom;
      pr.taux_horaire = this.listeprof.filter(
        (x) => x.id == pr.professeur_id
      )[0].taux;
      pr.minutes = newValue.duree;
      pr.statut = 0;
      this.editSeance.seanceProfesseurs.push(pr);
      this.editSeance.lieu_id = newValue.lieu_id;
      this.jour_semaine = newValue.jour_semaine;
    } else {
      this.coursselectionne = false;
    }
    // Faites ce que vous voulez avec la nouvelle valeur sélectionnée ici
  }

  Creer(serie: boolean = false): void {
    this.editSeance = new SeanceVM();
    this.coursselectionne = false;
    this.editMode_serie = serie;
    this.editSeance.date_seance = new Date();
    this.date_fin_serie = new Date();
    this.histo_seance = JSON.stringify(this.editSeance);
    this.editMode = true;
  }

  VoirMaSeanceByID(id:number){
    this.router.navigate(['/ma-seance'], { queryParams: { id: id } });
  }

  VoirMaSeance(seance: SeanceVM = null) {
    if (this.checkModification()) {
      let confirm = window.confirm(
        $localize`Vous perdrez les modifications réalisées non sauvegardées, voulez-vous continuer ?`
      );
      if (!confirm) {
        return;
      }
    }
    let id: number;
    if (seance) {
      id = seance.seance_id;
    } else if (this.editSeance) {
      id = this.editSeance.seance_id;
    } else {
      return;
    }

    this.router.navigate(['/ma-seance'], { queryParams: { id: id } });
  }
  TerminerSeances()  {
    const errorService = ErrorService.instance;
    this.action = $localize`Terminer les séances passées`;
    let list_s: KeyValuePairAny[] = [];
    const today = new Date();
    const tomorrow = new Date(today.setDate(today.getDate() - 1));
    this.list_seance_VM
      .filter((x) => (x.statut = StatutSeance.prévue))
      .forEach(async (SVM) => {
        if (new Date(SVM.date_seance) < tomorrow) {
        SVM.statut = StatutSeance.réalisée;
          await this.seancesservice.Update(SVM)
            .then((ok) => {
              if (ok) {
               list_s.push({ key: SVM.seance_id, value: true });
              } else {
               list_s.push({ key: SVM.seance_id, value: false });
              }}).catch(() => {
               list_s.push({ key: SVM.seance_id, value: false });
              });
              
        }
      });
      if( list_s.filter(x => x.value == false).length == 0) {
        let o = errorService.OKMessage(this.action);
        errorService.emitChange(o);
      } else {
        let o = errorService.CreateError(
          this.action,
          $localize`Certaines séances n'ont pas pu être mises à jour` 
        );
        errorService.emitChange(o);
      }
      
        this.UpdateListeSeance();
  }

  ChangerStatut(statut: string) {
    const errorService = ErrorService.instance;
    const old_statut = this.editSeance.statut;
    switch (statut) {
      case 'réalisée':
        this.action = $localize`Terminer la séance`;
        this.editSeance.statut = StatutSeance.réalisée;
        break;
      case 'prévue':
        this.action = $localize`Planifier la séance`;
        this.editSeance.statut = StatutSeance.prévue;
        break;
      case 'annulée':
        this.action = $localize`Annuler la séance`;
        this.editSeance.statut = StatutSeance.annulée;
        break;
    }
    this.seancesservice.Update(this.editSeance)
      .then((retour) => {
        if (retour) {
          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
        } else {
          this.editSeance.statut = old_statut;
          let o = errorService.UnknownError(this.action);
          errorService.emitChange(o);
        }
        this.UpdateListeSeance();
      })
      .catch((err: HttpErrorResponse) => {
        this.editSeance.statut = old_statut;
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });
  }

  UpdateListeSeance() {
    const errorService = ErrorService.instance;
    this.loading = true;
    this.action = $localize`Charger les séances`;
    if (this.season_id && this.season_id > 0) {
      this.ridersService
        .GetAllSeance()
        .then((seances) => {
          this.list_seance_VM = seances;
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
          this.loading = false;
        })
        .catch((err: HttpErrorResponse) => {
          let o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
          this.router.navigate(['/menu']);
          this.loading = false;
          return;
        });
    } else {
      this.seancesservice
        .GetSeances()
        .then((seances) => {
          this.list_seance_VM = seances;
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
          this.loading = false;
        })
        .catch((err: HttpErrorResponse) => {
          let o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
          this.loading = false;
          this.router.navigate(['/menu']);
          return;
        });
    }
  }

  // Méthode pour trouver un professeur à partir de son ID
  trouverProfesseur(profId: number): any {
    // Implémentez la logique pour trouver le professeur à partir de la liste des professeurs
    // que vous pouvez stocker dans une variable
    const indexToUpdate = this.listeprof.findIndex(
      (prof) => prof.id === profId
    );

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
    const indexToUpdate = this.listelieu.findIndex(
      (lieu) => lieu.key === lieuId
    );

    if (indexToUpdate !== -1) {
      // Remplacer l'élément à l'index trouvé par la nouvelle valeur
      return this.listelieu[indexToUpdate].value;
    } else {
      return $localize`Lieu non trouvé`;
    }
  }

  Delete(seance: SeanceVM): void {
    const errorService = ErrorService.instance;

    let confirmation = window.confirm(
      $localize`Voulez-vous supprimer cette séance ? Cette action est définitive. `
    );
    if (confirmation) {
      this.action = $localize`Supprimer une séance`;
      if (seance) {
        this.seancesservice
          .Delete(seance.seance_id)
          .then((result) => {
            if (result) {
              seance.seanceProfesseurs.forEach((sp) => {
                this.spservice.Delete(sp.id);
              });
              this.UpdateListeSeance();
              let o = errorService.OKMessage(this.action);
              errorService.emitChange(o);
            } else {
              let o = errorService.UnknownError(this.action);
              errorService.emitChange(o);
            }
          })
          .catch((err: HttpErrorResponse) => {
            let o = errorService.CreateError(this.action, err.message);
            errorService.emitChange(o);
          });
      }
    }
  }
  onProfUpdated(updatedProfs: SeanceProfesseurVM[]) {
    this.editSeance.seanceProfesseurs = updatedProfs;
    // Ici tu peux aussi déclencher d'autres actions, comme la sauvegarde ou la validation
  }
  onGroupesUpdated(updatedGroupes: LienGroupe_VM[]) {
    this.editSeance.groupes = updatedGroupes;
    // Ici tu peux aussi déclencher d'autres actions, comme la sauvegarde ou la validation
  }

  Save() {
    const errorService = ErrorService.instance;
    this.action = $localize`Ajouter une séance`;
    if (this.editSeance) {
      if (this.editSeance.seance_id == 0) {
        if (this.editMode_serie) {
          this.action = $localize`Ajouter une série de séances`;
          this.seancesservice
            .AddRange(
              this.editSeance,
              this.editSeance.date_seance,
              this.date_fin_serie,
              this.jour_semaine
            )
            .then((seances) => {
              if (seances.length > 0) {
                seances.forEach((id_s) => {
                  this.editSeance.seanceProfesseurs.forEach((prof: SeanceProfesseurVM) => {
                    prof.seance_id = id_s;
                    this.spservice.Add(prof);
                  });
                  this.editSeance.groupes.forEach((gr: LienGroupe_VM) => {
                    this.grServ.AddLien(Number(gr.id), 'séance', id_s);
                  });
                });
                let o = errorService.OKMessage(this.action);
                errorService.emitChange(o);
                this.editMode = false;
                this.editSeance = null;
                this.UpdateListeSeance();
              } else {
                let o = errorService.CreateError(
                  this.action,
                  $localize`Aucune séance créée`
                );
                errorService.emitChange(o);
              }
            })
            .catch((err) => {
              let o = errorService.CreateError(this.action, err.message);
              errorService.emitChange(o);
            });
        } else {
          this.seancesservice
            .Add(this.editSeance)
            .then((id) => {
              if (id > 0) {
                this.editSeance.seance_id   = id;
                this.editSeance.seanceProfesseurs.forEach((ss) => {
                  ss.seance_id = id;
                  this.spservice.Add(ss);
                });
                this.editSeance.groupes.forEach((gr: LienGroupe_VM) => {
                  this.grServ.AddLien(Number(gr.id), 'séance', id);
                });
                this.histo_seance = JSON.stringify(this.editSeance);
                let o = errorService.OKMessage(this.action);
                errorService.emitChange(o);
                this.UpdateListeSeance();
              } else {
                let o = errorService.UnknownError(this.action);
                errorService.emitChange(o);
              }
            })
            .catch((err) => {
              let o = errorService.CreateError(this.action, err.message);
              errorService.emitChange(o);
            });
        }
      } else {
        this.action = $localize`Mettre à jour une séance`;
        this.seancesservice
          .Update(this.editSeance)
          .then((ok) => {
            if (ok) {
              let o = errorService.OKMessage(this.action);
              this.histo_seance = JSON.stringify(this.editSeance);
              errorService.emitChange(o);
              this.UpdateListeSeance();
            } else {
              let o = errorService.UnknownError(this.action);
              errorService.emitChange(o);
            }
          })
          .catch((err) => {
            this.action = $localize`Mettre à jour une séance OK`;
            let o = errorService.CreateError(this.action, err.message);
            errorService.emitChange(o);
          });
      }
    }
  }

  public GetSeanceID(id: number): Promise<SeanceVM | null> {
    return this.seancesservice
      .Get(id)
      .then((c: SeanceVM) => {
        return c; // Retourne la valeur du cours récupéré
      })
      .catch(() => {
        return null; // Retourne null en cas d'erreur
      });
  }

  Refresh() {
    const errorService = ErrorService.instance;
    this.action = $localize`Rafraichir la séance`;
    if (this.checkModification()) {
      let confirm = window.confirm(
        $localize`Vous perdrez les modifications réalisées non sauvegardées, voulez-vous continuer ?`
      );
      if (!confirm) {
        return;
      }
    }
    this.seancesservice
      .Get(this.editSeance.seance_id)
      .then((c) => {
        this.editSeance = c;
        let o = errorService.OKMessage(this.action);
        errorService.emitChange(o);
      })
      .catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        return;
      });
  }

  Retour(): void {
   if (this.checkModification()) {
      let confirm = window.confirm(
        $localize`Vous perdrez les modifications réalisées non sauvegardées, voulez-vous continuer ?`
      );
      if (!confirm) {
        return;
      }
    }
    this.editMode = false;
    this.editSeance = null;
    this.UpdateListeSeance();
  }

  Sort(sens: 'NO' | 'ASC' | 'DESC', champ: string) {
    switch (champ) {
      case 'nom':
        this.sort_nom = sens;
        this.sort_date = 'NO';
        this.sort_lieu = 'NO';
        this.sort_cours = 'NO';
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
      case 'lieu':
        this.sort_lieu = sens;
        this.sort_date = 'NO';
        this.sort_nom = 'NO';
        this.sort_cours = 'NO';
        this.list_seance_VM.sort((a, b) => {
          const lieuA =
            this.listelieu.find((lieu) => lieu.key === a.lieu_id)?.value || '';
          const lieuB =
            this.listelieu.find((lieu) => lieu.key === b.lieu_id)?.value || '';

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
      case 'date':
        this.sort_lieu = 'NO';
        this.sort_date = sens;
        this.sort_cours = 'NO';
        this.sort_nom = 'NO';
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
    
      case 'cours':
        this.sort_lieu = 'NO';
        this.sort_date = 'NO';
        this.sort_cours = sens;
        this.sort_nom = 'NO';
        this.list_seance_VM.sort((a, b) => {
          const coursA =
            this.listeCours.find((cours) => cours.id === a.cours)?.nom || '';
          const coursB =
            this.listeCours.find((cours) => cours.id === b.cours)?.nom || '';

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
  trouverCours(_s:SeanceVM) : string{
    if(_s.type_seance == "ENTRAINEMENT"){
      return this.listeCours.find(x => x.id == _s.cours).nom || $localize`Cours non trouvé`;
    } else if(_s.type_seance == "MATCH"){
      return $localize`Match`;
    } else if(_s.type_seance == "SORTIE"){
      return $localize`Sortie`;
    } else {
return $localize`Evénement`;
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
      TypeSeance: 'Type de séance',
      Libelle: 'Libellé',
      DateSeance: 'Date de la séance',
      HeureDebut: 'Heure de début',
      DureeSeance: 'Durée de la séance',
      Lieu: 'Lieu',
      LieuId: 'ID du lieu',
      Groupes: 'Groupes',
      AgeMinimum: 'Âge minimum',
      AgeMaximum: 'Âge maximum',
      PlaceMaximum: 'Places maximum',
      EstPlaceMaximum: 'Est places maximum',
      EstAgeMinimum: 'Est limite âge minimum',
      EstAgeMaximum: 'Est limite âge maximum',
      ConvocationNominative: 'Convocation nominative',
      Professeurs: 'Professeurs',
      Cours: 'Cours',
      Statut: 'Statut de la séance',
      EssaiPossible: 'Essai possible',
      Notes: 'Notes',
      InfoSeance: 'Informations de la séance',
      MailAnnulation: "Mail d'annulation",
    };
    let list: SeanceVM[] = this.getFilteredSeances();
    this.excelService.exportAsExcelFile(list, 'liste_seance', headers);
  }
  getFilteredSeances(): SeanceVM[] {
    return this.list_seance_VM.filter((seance) => {
      return (
        (!this.filters.filter_nom ||
          seance.libelle
            .toLowerCase()
            .includes(this.filters.filter_nom.toLowerCase())) &&
        (!this.filters.filter_lieu ||
          seance.lieu_nom.toLowerCase().includes(
            this.filters.filter_lieu.toLowerCase()
          )) &&
        (!this.filters.filter_date_avant ||
          new Date(seance.date_seance) <=
            new Date(this.filters.filter_date_avant)) &&
        (!this.filters.filter_date_apres ||
          new Date(seance.date_seance) >=
            new Date(this.filters.filter_date_apres)) &&
        (!this.filters.filter_statut ||
          seance.statut === this.filters.filter_statut) &&
        (!this.filters.filter_groupe ||
          seance.groupes.find((x) =>
            x.nom
              .toLowerCase()
              .includes(this.filters.filter_groupe.toLowerCase())
          )) &&
        (!this.filters.filter_prof ||
          seance.seanceProfesseurs.find((x) =>
            x.nom
              .toLowerCase()
              .includes(this.filters.filter_prof.toLowerCase())
          ))
      );
    });
  }

  ReinitFiltre() {
    this.filters.filter_date_apres = null;
    this.filters.filter_date_avant = null;
    this.filters.filter_groupe = null;
    this.filters.filter_lieu = null;
    this.filters.filter_nom = null;
    this.filters.filter_prof = null;
    this.filters.filter_statut = null;
  }

  ngAfterViewInit(): void {
    this.waitForScrollableContainer();
  }

  private waitForScrollableContainer(): void {
    setTimeout(() => {
      if (this.scrollableContent) {
        this.scrollableContent.nativeElement.addEventListener(
          'scroll',
          this.onContentScroll.bind(this)
        );
      } else {
        this.waitForScrollableContainer(); // Re-tente de le trouver
      }
    }, 100); // Réessaie toutes les 100 ms
  }

  onContentScroll(): void {
    const scrollTop = this.scrollableContent.nativeElement.scrollTop || 0;
    this.showScrollToTop = scrollTop > 200;
  }

  scrollToTop(): void {
    this.scrollableContent.nativeElement.scrollTo({
      top: 0,
      behavior: 'smooth', // Défilement fluide
    });
  }
}

export class FilterSeance {
  private _filter_nom: string | null = null;
  get filter_nom(): string | null {
    return this._filter_nom;
  }
  set filter_nom(value: string | null) {
    this._filter_nom = value;
    this.onFilterChange();
  }

  private _filter_date_avant: Date | null = new Date();
  get filter_date_avant(): Date | null {
    return this._filter_date_avant;
  }
  set filter_date_avant(value: Date | null) {
    this._filter_date_avant = value;
    this.onFilterChange();
  }

  private _filter_date_apres: Date | null ;
  get filter_date_apres(): Date | null {
    return this._filter_date_apres;
  }
  set filter_date_apres(value: Date | null) {
    this._filter_date_apres = value;
    this.onFilterChange();
  }

  private _filter_prof: string | null = null;
  get filter_prof(): string | null {
    return this._filter_prof;
  }
  set filter_prof(value: string | null) {
    this._filter_prof = value;
    this.onFilterChange();
  }

  private _filter_statut: StatutSeance | null = StatutSeance.prévue;
  get filter_statut(): StatutSeance | null {
    return this._filter_statut;
  }
  set filter_statut(value: StatutSeance | null) {
    this._filter_statut = value;
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
  private _filter_lieu: string | null = null;
  get filter_lieu(): string | null {
    return this._filter_lieu;
  }
  set filter_lieu(value: string | null) {
    this._filter_lieu = value;
    this.onFilterChange();
  }

  private onFilterChange(): void {}
}
