import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AdherentMenu } from 'src/class/adherent';
import { cours } from 'src/class/cours';
import { inscription_seance, InscriptionSeance, StatutPresence } from 'src/class/inscription';
import { KeyValuePair, KeyValuePairAny } from 'src/class/keyvaluepair';
import { professeur } from 'src/class/professeur';
import { AdherentService } from 'src/services/adherent.service';
import { CoursService } from 'src/services/cours.service';
import { ErrorService } from 'src/services/error.service';
import { GlobalService } from 'src/services/global.services';
import { InscriptionSeanceService } from 'src/services/inscription-seance.service';
import { LieuService } from 'src/services/lieu.service';
import { StaticClass } from '../global';
import { ProfesseurService } from 'src/services/professeur.service';
import { seance, StatutSeance } from 'src/class/seance';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css'],
})
export class MenuComponent implements OnInit {
  action: string;
  Riders: AdherentMenu[];
  listeprof: professeur[];
  listelieu: KeyValuePair[];
  btn_adherent: boolean = false;
  btn_admin: boolean = false;
  btn_prof: boolean = false;


    public loading: boolean = false;
    @ViewChild('scrollableContent', { static: false })
    scrollableContent!: ElementRef;
    showScrollToTop: boolean = false;

  public liste_prof_filter: KeyValuePairAny[];
  public liste_lieu_filter: string[];
  listeCours: cours[] = [];

  public g: StaticClass;
  constructor(
    public GlobalService: GlobalService,
    private prof_serv: ProfesseurService,
    private router: Router,
    private adherent_serv: AdherentService,
    private lieuserv: LieuService,
    private coursservice: CoursService,
    public inscriptionserv: InscriptionSeanceService
  ) {}

  ngOnInit(): void {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger le menu`;
    this.loading = true;
    if (GlobalService.is_logged_in) {
      const projet = GlobalService.other_project.find(
        (x) => x.id == GlobalService.projet.id
      );
      switch (GlobalService.menu) {
        default:
        case 'PROF':
        case 'ADHERENT':
          if (GlobalService.menu == 'PROF') {
            this.btn_prof = false;
            if (projet.adherent) {
              this.btn_adherent = true;
            } else {
              this.btn_adherent = false;
            }
            if (projet.admin) {
              this.btn_admin = true;
            } else {
              this.btn_admin = false;
            }
          } else {
            this.btn_adherent = false;
            if (projet.prof) {
              this.btn_prof = true;
            } else {
              this.btn_prof = false;
            }
            if (projet.admin) {
              this.btn_admin = true;
            } else {
              this.btn_admin = false;
            }
          }
          const auj = new Date();
          const yesterday = new Date(auj);
          yesterday.setDate(yesterday.getDate() - 1);
          let date_apres = this.formatDate(yesterday);

          // Date dans un mois
          const nextMonth = new Date(auj);
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          let date_avant = this.formatDate(nextMonth);
          this.adherent_serv
            .Get(GlobalService.compte.id, GlobalService.menu)
            .then((riders) => {
              this.Riders = riders.map((x) => {
                const rider = new AdherentMenu(x);
                rider.filters.filter_date_avant = yesterday;
                rider.filters.filter_date_apres = nextMonth;
                return rider;
              });

              this.Riders.sort((a, b) => {
                let comparaison = 0;
                if (a.datasource.id > b.datasource.id) {
                  comparaison = 1;
                } else if (a.datasource.id < b.datasource.id) {
                  comparaison = -1;
                }

                return comparaison; // Inverse pour le tri descendant
              });
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
                  this.liste_prof_filter = profs.map(
                    (x) => new KeyValuePairAny(x.id, x.prenom + ' ' + x.nom)
                  );
                  this.lieuserv
                    .GetAllLight()
                    .then((lieux) => {
                      if (lieux.length == 0) {
                        let o = errorService.CreateError(
                          $localize`Récupérer les lieux`,
                          $localize`Il faut au moins un lieu pour créer un cours`
                        );
                        errorService.emitChange(o);
                        if (GlobalService.menu === 'ADMIN') {
                          this.router.navigate(['/lieu']);
                          this.loading = false;
                        }
                        return;
                      }
                      this.listelieu = lieux;
                      this.liste_lieu_filter = lieux.map((x) => x.value);
                      this.coursservice
                        .GetCours()
                        .then((c) => {
                          this.listeCours = c;
                          this.loading = false;
                        })
                        .catch((err: HttpErrorResponse) => {
                          let o = errorService.CreateError(
                            $localize`récupérer les cours`,
                            err.message
                          );
                          this.loading = false;
                          errorService.emitChange(o);
                          return;
                        });
                    })
                    .catch((err: HttpErrorResponse) => {
                      let o = errorService.CreateError(
                        $localize`récupérer les lieux`,
                        err.message
                      );
                      this.loading = false;
                      errorService.emitChange(o);
                      return;
                    });
                })
                .catch((err: HttpErrorResponse) => {
                  let o = errorService.CreateError(
                    $localize`récupérer les profs`,
                    err.message
                  );
                  this.loading = false;
                  errorService.emitChange(o);
                  return;
                });
            })
            .catch((error: Error) => {
              let o = errorService.CreateError(this.action, error.message);
              errorService.emitChange(o);
              this.loading = false;
            });
          break;
        case 'ADMIN':
          this.btn_admin = false;
          if (projet.prof) {
            this.btn_prof = true;
          } else {
            this.btn_prof = false;
          }
          if (projet.adherent) {
            this.btn_adherent = true;
          } else {
            this.btn_adherent = false;
          }
          this.loading = false;
          break;
      }
    } else {
      let o = errorService.CreateError(
        this.action,
        $localize`Accès impossible, vous n'êtes pas connecté`
      );
      this.loading = false;
      errorService.emitChange(o);
      this.router.navigate(['/login']);
    }
  }
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  }

  trouverLieu(lieuId: number): any {
    if (this.listelieu) {
      const indexToUpdate = this.listelieu.findIndex(
        (lieu) => lieu.key === lieuId
      );

      if (indexToUpdate !== -1) {
        // Remplacer l'élément à l'index trouvé par la nouvelle valeur
        return this.listelieu[indexToUpdate].value;
      } else {
        return $localize`Lieu non trouvé`;
      }
    } // Implémentez la logique pour trouver le professeur à partir de la liste des professeurs
    // que vous pouvez stocker dans une variable
    else {
      return $localize`Lieu non trouvé`;
    }
  }
  Sort( sens: 'NO' | 'ASC' | 'DESC', champ: string, rider: AdherentMenu ) {
    let liste_seance_VM = this.Riders.find(
      (x) => x.datasource.id == rider.ID
    ).InscriptionSeances;
    switch (champ) {
      case 'nom':
        rider.sort_nom = sens;
        rider.sort_date = 'NO';
        rider.sort_lieu = 'NO';
        rider.sort_cours = 'NO';
        liste_seance_VM.sort((a, b) => {
          const nomA = a.thisSeance.libelle.toUpperCase(); // Ignore la casse lors du tri
          const nomB = b.thisSeance.libelle.toUpperCase();
          let comparaison = 0;
          if (nomA > nomB) {
            comparaison = 1;
          } else if (nomA < nomB) {
            comparaison = -1;
          }

          return rider.sort_nom === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
        });
        break;
        
      case 'type':
        rider.sort_nom = "NO";
        rider.sort_date = 'NO';
        rider.sort_lieu = 'NO';
        rider.sort_cours = sens;
        liste_seance_VM.sort((a, b) => {
          const nomA = this.trouverCours(a.thisSeance);
          const nomB = this.trouverCours(b.thisSeance);
          let comparaison = 0;
          if (nomA > nomB) {
            comparaison = 1;
          } else if (nomA < nomB) {
            comparaison = -1;
          }

          return rider.sort_cours === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
        });
        break;
      case 'lieu':
        rider.sort_lieu = sens;
        rider.sort_date = 'NO';
        rider.sort_nom = 'NO';
        rider.sort_cours = 'NO';
        liste_seance_VM.sort((a, b) => {
          const lieuA =
            this.listelieu.find((lieu) => lieu.key === a.thisSeance.lieu_id)
              ?.value || '';
          const lieuB =
            this.listelieu.find((lieu) => lieu.key === b.thisSeance.lieu_id)
              ?.value || '';

          // Ignorer la casse lors du tri
          const lieuAUpper = lieuA.toUpperCase();
          const lieuBUpper = lieuB.toUpperCase();

          let comparaison = 0;
          if (lieuAUpper > lieuBUpper) {
            comparaison = 1;
          } else if (lieuAUpper < lieuBUpper) {
            comparaison = -1;
          }

          return rider.sort_lieu === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
        });
        break;
      case 'date':
        rider.sort_lieu = 'NO';
        rider.sort_date = sens;
        rider.sort_cours = 'NO';
        rider.sort_nom = 'NO';
        liste_seance_VM.sort((a, b) => {
          let dateA = a.thisSeance.date_seance;
          let dateB = b.thisSeance.date_seance;

          let comparaison = 0;
          if (dateA > dateB) {
            comparaison = 1;
          } else if (dateA < dateB) {
            comparaison = -1;
          }

          return rider.sort_date === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
        });
        break;
    }
  }
  trouverCours(_s:seance) : string{
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

  MAJInscription(inscription: inscription_seance, statut: boolean) {
    const errorService = ErrorService.instance;
    let oldstatut = inscription.statut_inscription;
    let libellenom = this.Riders.find(
      (x) => x.datasource.id == inscription.rider_id
    ).Libelle;
    let libelleseab = this.Riders.find(
      (x) => x.datasource.id == inscription.rider_id
    ).InscriptionSeances.find(
      (x) => x.thisSeance.seance_id == inscription.seance_id
    ).thisSeance.libelle;
    if (statut == null) {
      this.inscriptionserv
        .Delete(inscription.id)
        .then((ok) => {
          if (ok) {
            console.log(this.action);
            inscription.statut_inscription = null;
          } else {
            let o = errorService.UnknownError(this.action);
            errorService.emitChange(o);
          }
        })
        .catch((err: HttpErrorResponse) => {
          inscription.statut_inscription = oldstatut;
          let o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
          return;
        });
      return;
    } else {
      if (statut) {
        inscription.statut_inscription = StatutPresence.Présent;
        this.action =
          libellenom +
          $localize` prévoit d'être présent à la séance ` +
          libelleseab;
      } else {
        inscription.statut_inscription = StatutPresence.Absent;
        this.action =
          libellenom +
          $localize` prévoit d'être absent à la séance ` +
          libelleseab;
      }
      if (inscription.id == 0) {
        this.inscriptionserv
          .Add(inscription)
          .then((id) => {
            inscription.id = id;
            console.log(this.action);
            this.inscriptionserv.Get(id).then((ins) => {
              inscription = ins;
            });
          })
          .catch((err: HttpErrorResponse) => {
            inscription.statut_inscription = oldstatut;
            let o = errorService.CreateError(this.action, err.message);
            errorService.emitChange(o);
            return;
          });
      } else {
        this.inscriptionserv
          .Update(inscription)
          .then((retour) => {
            if (retour) {
              console.log(this.action);
              this.inscriptionserv.Get(inscription.id).then((ins) => {
                inscription = ins;
              });
            } else {
              let o = errorService.UnknownError(this.action);
              errorService.emitChange(o);
            }
          })
          .catch((err: HttpErrorResponse) => {
            inscription.statut_inscription = oldstatut;
            let o = errorService.CreateError(this.action, err.message);
            errorService.emitChange(o);
            return;
          });
      }
    }
  }

  Voir(id: number) {
    this.router.navigate(['/adherent'], { queryParams: { id: id } });
  }

  ReinitFiltre(adh: AdherentMenu) {
    adh.filters = new FilterMenu();
  }

  VoirMaSeance(seance: any) {
    this.router.navigate(['/ma-seance'], {
      queryParams: { id: seance.seance_id },
    });
  }

  ChangerMenu(type: 'PROF' | 'ADMIN' | 'ADHERENT') {
    let proj = GlobalService.projet;
    let proj_compl = GlobalService.other_project.find((x) => x.id == proj.id);
    switch (type) {
      case 'ADHERENT':
        if (proj_compl.adherent) {
          proj.adherent = true;
          proj.admin = false;
          proj.prof = false;
          GlobalService.instance.updateProjet(proj);
          GlobalService.instance.updateMenuType(type);
          this.ngOnInit();
        }
        break;
      case 'ADMIN':
        if (proj_compl.admin) {
          proj.adherent = false;
          proj.admin = true;
          proj.prof = false;
          GlobalService.instance.updateProjet(proj);
          GlobalService.instance.updateMenuType(type);
          this.ngOnInit();
        }
        break;
      case 'PROF':
        if (proj_compl.prof) {
          proj.adherent = false;
          proj.admin = false;
          proj.prof = true;
          GlobalService.instance.updateProjet(proj);
          GlobalService.instance.updateMenuType(type);
          this.ngOnInit();
        }
        break;
    }
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
export class FilterMenu {
  private _filter_date_apres: Date | null = null;
  get filter_date_apres(): Date | null {
    return this._filter_date_apres;
  }
  set filter_date_apres(value: Date | null) {
    this._filter_date_apres = value;
    this.onFilterChange();
  }

  private _filter_date_avant: Date | null = null;
  get filter_date_avant(): Date | null {
    return this._filter_date_avant;
  }
  set filter_date_avant(value: Date | null) {
    this._filter_date_avant = value;
    this.onFilterChange();
  }

  private _filter_nom: string | null = null;
  get filter_nom(): string | null {
    return this._filter_nom;
  }
  set filter_nom(value: string | null) {
    this._filter_nom = value;
    this.onFilterChange();
  }

  private _filter_cours: string | null = null;
  get filter_cours(): string | null {
    return this._filter_cours;
  }
  set filter_cours(value: string | null) {
    this._filter_cours = value;
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

  private _filter_statut: StatutSeance | null = null;
  get filter_statut(): StatutSeance | null {
    return this._filter_statut;
  }
  set filter_statut(value: StatutSeance | null) {
    this._filter_statut = value;
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

  private onFilterChange(): void {
    // Logic to handle filter changes
  }
}