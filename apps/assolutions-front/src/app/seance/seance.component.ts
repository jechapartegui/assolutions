import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
import { KeyValuePair, KeyValuePairAny, ValidationItem } from '@shared/lib/autres.interface';
import { LieuNestService } from '../../services/lieu.nest.service';
import { Cours_VM } from '@shared/lib/cours.interface';
import {  Seance_VM, SeanceProfesseur_VM, StatutSeance } from '@shared/lib/seance.interface';
import { LienGroupe_VM } from '@shared/lib/groupe.interface';
import { Professeur_VM } from '@shared/lib/prof.interface';
import { Saison_VM } from '@shared/lib/saison.interface';
import type { donnee_date_lieu } from '../component/datelieu/datelieu.component';
import type { caracteristique } from '../component/caracteristique_seance/caracteristique_seance.component';
import { AppStore } from '../app.store';
import { StaticClass } from '../global';


@Component({
  standalone: false,
  selector: 'app-seance',
  templateUrl: './seance.component.html',
  styleUrls: ['./seance.component.css'],
})
export class SeanceComponent implements OnInit, OnDestroy {
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
  listeprof: Professeur_VM[];
  listelieu: KeyValuePair[];
  current_prof_id: number;
  prof_dispo: Professeur_VM[];
  est_prof: boolean = false;
  est_admin: boolean = false;
  manage_prof: boolean = false;
  titre_groupe: string = $localize`Liste des groupes de la séance`;
  listeCours: Cours_VM[] = [];
  editMode_serie: boolean = false;
        rNom:ValidationItem ={key:true, value:''};
        rProf:ValidationItem ={key:false, value:$localize`Un professeur responsable est nécessaire pour le cours`};

  list_seance_VM: Seance_VM[] = [];
  editSeance: Seance_VM | null = null;
  is_valid:boolean = false;

  all_seance: boolean = false;
  jour_semaine: string = '';
  date_debut_serie: Date;
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
  public liste_prof_filter: KeyValuePair[];
  public liste_lieu_filter: string[];
  public liste_saison: Saison_VM[] = [];
  public active_saison: Saison_VM;
  public showText: boolean = false;
  public action: string = '';
  public listeStatuts: StatutSeance[];
  edit_prof:boolean = false;
  edit_nom:boolean = false;
  public readonly = false;

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
    private grServ: GroupeService,
        private route: ActivatedRoute,
        public store:AppStore,
        public global:StaticClass
  ) {}

  async ngOnInit(): Promise<void> {
    
  window.addEventListener('resize', this.onResize);
    const errorService = ErrorService.instance;
    this.loading = true;
    this.route.queryParams.subscribe(async (params) => {
  if ('id' in params) {
    let id = params['id'];
    this.action = $localize`Charger la séance`;
    const thisseance = await this.seancesservice.Get(id);
    this.editSeance = thisseance;
        this.histo_seance = JSON.stringify(this.editSeance);
    this.readonly = true;
    let o = errorService.OKMessage(this.action);
    errorService.emitChange(o);
  }
});
    this.action = $localize`Charger les séances`;
    if (this.store.isLoggedIn()) {    
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
              this.liste_prof_filter = profs.map((x) => {
                return { key: x.person.id, value: x.person.prenom + ' ' + x.person.nom };
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
                    if (this.store.appli() === 'ADMIN') {
                      this.router.navigate(['/lieu']);
            this.store.updateSelectedMenu("LIEU");
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
                        if (this.store.appli() === 'ADMIN') {
                          this.router.navigate(['/saison']);
                          this.store.updateSelectedMenu("SAISON");
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

  Edit(seance: Seance_VM): void {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger la séance`;
    this.seancesservice
      .Get(seance.seance_id)
      .then((ss) => {
        this.editSeance = ss
        this.edit_nom = false;
        this.edit_prof = false;
        this.MAJListeProf();
        if (this.editSeance.cours) {
          this.coursselectionne = true;
        } else {
          this.coursselectionne = false;
        }
        this.histo_seance = JSON.stringify(this.editSeance);
      })
      .catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });
  }
  onCoursSelectionChange(cours_id: any): void {
    //  console.log('Nouvelle valeur sélectionnée :', newValue);
    if (!isNaN(cours_id)) {
      const newValue = this.listeCours.find(
        (cc) => Number(cc.id) === Number(cours_id)
      );
      this.coursselectionne = true;
      this.editSeance.duree_seance = newValue.duree;
      this.editSeance.age_minimum = newValue.age_minimum;
      this.editSeance.age_maximum = newValue.age_maximum;
      this.editSeance.est_limite_age_maximum = newValue.est_limite_age_maximum;
      this.editSeance.est_limite_age_minimum = newValue.est_limite_age_minimum;
      this.editSeance.libelle = newValue.nom;
      this.editSeance.saison_id = newValue.saison_id;
      this.editSeance.heure_debut = newValue.heure;
      this.editSeance.convocation_nominative = newValue.convocation_nominative;
      this.editSeance.est_place_maximum = newValue.est_place_maximum;
      this.editSeance.place_maximum = newValue.place_maximum;
      this.editSeance.essai_possible = false;
      this.editSeance.rdv = newValue.rdv;
      this.editSeance.essai_possible = newValue.essai_possible;
      this.editSeance.afficher_present = newValue.afficher_present;
      this.editSeance.date_seance = null;
      this.editSeance.groupes = [];
      newValue.groupes.forEach((el) => {
        this.editSeance.groupes.push(el);
      });

      this.editSeance.seanceProfesseurs = [];
      newValue.professeursCours.forEach((el) => {
        let stp = new SeanceProfesseur_VM();
        stp.personne = el;
        stp.id = 0;
        stp.cout = this.listeprof.find(x => x.person.id == el.id).taux;
        stp.minutes = newValue.duree;
        stp.statut = StatutSeance.prévue;
        this.editSeance.seanceProfesseurs.push(stp);
      });
      this.editSeance.statut = StatutSeance.prévue;     
      this.editSeance.lieu_id = newValue.lieu_id;
      this.jour_semaine = newValue.jour_semaine;
    } else {
      this.coursselectionne = false;
    }
    // Faites ce que vous voulez avec la nouvelle valeur sélectionnée ici
  }

  Creer(serie: boolean = false): void {
    let ss = new Seance_VM();
    
    this.editSeance = ss;
    this.editSeance.saison_id = this.active_saison.id;
        this.MAJListeProf();
    this.coursselectionne = false;
    this.editMode_serie = serie;
    this.date_debut_serie = null
    this.date_fin_serie = null;
      this.edit_prof = true;
    this.histo_seance = JSON.stringify(this.editSeance);
  }
  
  
     public is_valid_datelieu: boolean = false;
  
  valid_DateLieu(isValid: boolean): void {
    this.is_valid_datelieu = isValid;
    this.checkall();
  }
  
  
  checkall(){
    this.rNom.key = true;
    this.rProf.key = true;
     if(this.editSeance.seanceProfesseurs.length>0){
      this.rProf.key = true;
      this.rProf.value = "";
    } else {
      this.rProf.key = false;
      this.rProf.value = $localize`Un encadrant est nécessaire pour le cours`;
    }
    if(!this.editSeance.libelle){
      this.rNom.key = false;
      this.rNom.value = $localize`Un nom doit être saisi`
      this.is_valid = false;
      return;
    }
    if(this.editSeance.libelle.length <4){
      this.rNom.key = false;
      this.rNom.value = $localize`Le nom doit faire au moins 4 caractères`
      this.is_valid = false;
      return;
    }
     if(this.is_valid_caracteristique && this.is_valid_datelieu && this.rProf.key && this.rNom.key){
      this.is_valid = true;
    } else {
      this.is_valid = false;
    }
  }
     public is_valid_caracteristique: boolean = false;
  
  valid_Caracteristique(isValid: boolean): void {
    this.is_valid_caracteristique = isValid;
    this.checkall();
  }
  
  SaveDateLieu(donnee_date_lieu :donnee_date_lieu){
    if (this.editSeance) {
      this.editSeance.lieu_id = donnee_date_lieu.lieu_id;
      this.editSeance.heure_debut = donnee_date_lieu.heure;
      this.jour_semaine = donnee_date_lieu.jour_semaine;
      this.editSeance.duree_seance = donnee_date_lieu.duree;
      this.editSeance.rdv = donnee_date_lieu.rdv;
        this.editSeance.date_seance = donnee_date_lieu.date;
      if(this.editMode_serie){
        this.date_fin_serie = donnee_date_lieu.date_fin;
        this.date_debut_serie = donnee_date_lieu.date_debut;
      }
    }
     this.checkall();
    if(this.is_valid && this.editSeance.seance_id > 0){
    this.Save();
    }
  }

  SaveNom(){
    this.edit_nom = false;
    this.checkall();
    if(this.is_valid){
    this.Save();
    }

  }
  
  autoSave(){
    this.checkall();
    if(this.is_valid){
    this.Save();
    }
  }
  retour(){
    this.editSeance = JSON.parse(this.histo_seance)
  }
  
  SaveCaracteristique(caracteristique :caracteristique){
    if(this.editSeance){
      this.editSeance.est_limite_age_minimum = caracteristique.age_min;
      this.editSeance.age_minimum = caracteristique.age_min_valeur;
      this.editSeance.est_limite_age_maximum = caracteristique.age_max;
      this.editSeance.age_maximum = caracteristique.age_max_valeur;
      this.editSeance.est_place_maximum = caracteristique.place_limite;
      this.editSeance.place_maximum = caracteristique.place_limite_valeur;
      this.editSeance.essai_possible = caracteristique.essai_possible;
      this.editSeance.afficher_present = caracteristique.afficher_present;
    }
     this.checkall();
    if(this.is_valid && this.editSeance.seance_id > 0){
    this.Save();
    }
  }

  VoirMaSeanceByID(id:number){
    this.router.navigate(['/ma-seance'], { queryParams: { id: id } });
  }

  VoirMaSeance(seance: Seance_VM = null) {
    if (this.checkModification() && !this.readonly) {
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
      (prof) => prof.person.id === profId
    );

    if (indexToUpdate !== -1) {
      // Remplacer l'élément à l'index trouvé par la nouvelle valeur
      return this.listeprof[indexToUpdate].person.prenom + ' ' + this.listeprof[indexToUpdate].person.nom;
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

  Delete(seance: Seance_VM): void {
    const errorService = ErrorService.instance;

    let confirmation = window.confirm(
      $localize`Voulez-vous supprimer cette séance ? Cette action est définitive. `
    );
    if (confirmation) {
      this.action = $localize`Supprimer une séance`;
      if (seance) {
        this.seancesservice
          .Delete(seance.seance_id)
          .then(() => {
                this.spservice.Update(seance.seance_id, []);  
                this.editSeance = null;            
              this.UpdateListeSeance();
              let o = errorService.OKMessage(this.action);
              errorService.emitChange(o);
          
          })
          .catch((err: HttpErrorResponse) => {
            let o = errorService.CreateError(this.action, err.message);
            errorService.emitChange(o);
          });
      }
    }
  }
  onProfUpdated(updatedProfs: SeanceProfesseur_VM[]) {
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
              this.date_debut_serie,
              this.date_fin_serie,
              this.jour_semaine
            )
            .then((seances) => {
              if (seances.length > 0) {
                seances.forEach((id_s) => {
                  this.spservice.Update(id_s, this.editSeance.seanceProfesseurs);
                  this.editSeance.groupes.forEach((gr: LienGroupe_VM) => {
                    this.grServ.AddLien(Number(gr.id), 'séance', id_s);
                  });
                });
                let o = errorService.OKMessage(this.action);
                errorService.emitChange(o);
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
            .then((retour) => {
              if (retour.seance_id > 0) {
                this.editSeance.seance_id   = retour.seance_id;
                  this.spservice.Update(Number(retour.seance_id), this.editSeance.seanceProfesseurs);
                this.editSeance.groupes.forEach((gr: LienGroupe_VM) => {
                  this.grServ.AddLien(Number(retour.seance_id), 'séance', Number(gr.id));
                });
                this.edit_nom = false;
                this.edit_prof = false;
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

  public GetSeanceID(id: number): Promise<Seance_VM | null> {
    return this.seancesservice
      .Get(id)
      .then((c: Seance_VM) => {
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

  RetourListe(): void {
  
   if (this.checkModification()) {
      let confirm = window.confirm(
        $localize`Vous perdrez les modifications réalisées non sauvegardées, voulez-vous continuer ?`
      );
      if (!confirm) {
        return;
      } 

    }
             if(this.list_seance_VM.length == 0 && !this.store.isProf() ){
      this.router.navigate(['/menu']);
      this.store.updateSelectedMenu("MENU");
      return;
   }
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
  trouverCours(_s:Seance_VM) : string{
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
    let list: Seance_VM[] = this.getFilteredSeances();
    this.excelService.exportAsExcelFile(list, 'liste_seance', headers);
  }
  getFilteredSeances(): Seance_VM[] {
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
            x.personne.nom
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
     async AjouterProf() {
        this.action = $localize`Ajouter un professeur à la séance`;
        const indexToUpdate = this.listeprof.find(cc => cc.person.id === +this.current_prof_id);
          const seanceprof = new SeanceProfesseur_VM();
          seanceprof.personne =  indexToUpdate.person;
          seanceprof.seance_id = this.editSeance.seance_id;
          seanceprof.minutes = this.editSeance.duree_seance;
          seanceprof.statut = this.editSeance.statut;
          //cout = durée * tx horaire : contrat
          this.editSeance.seanceProfesseurs.push(seanceprof);
          if(this.editSeance.seance_id>0){
            await this.spservice.Update(this.editSeance.seance_id, this.editSeance.seanceProfesseurs);
          }   
          
          this.current_prof_id = null;
          this.MAJListeProf();
      
          
      }
      
      async RemoveProf(item : SeanceProfesseur_VM) {
        this.action = $localize`Supprimer un professeur de la liste`;      
        this.editSeance.seanceProfesseurs = this.editSeance.seanceProfesseurs.filter(e => e.personne.id !== item.personne.id);
     
        if(this.editSeance.seance_id>0){
            await this.spservice.Update(this.editSeance.seance_id, this.editSeance.seanceProfesseurs);
          }   
             this.MAJListeProf();
       
          
      }
      MAJListeProf() {
        this.prof_dispo = this.listeprof;
        this.editSeance.seanceProfesseurs.forEach((element: SeanceProfesseur_VM) => {
          let element_to_remove = this.listeprof.find(e => e.person.id == element.personne.id);
          if (element_to_remove) {
            this.prof_dispo = this.prof_dispo.filter(e => e.person.id !== element_to_remove.person.id);
          }
        });
        this.checkall();
      }

      pollOpen = false;
pollCopied = false;

/** Dropdown “up” sur desktop (comme pour tes autres menus d’options) */
isDesktopDropUp = window.innerWidth >= 1024;
onResize = () => (this.isDesktopDropUp = window.innerWidth >= 1024);

ngOnDestroy() {
  window.removeEventListener('resize', this.onResize);
}

/** Base très courte pour les liens (mets ton domaine court ici si tu en as un) */
private shortBase(): string {
  // idéalement: https://t.tondomaine.fr
  return `${location.origin}/s`;
}

/** Code bref et stable par séance (base62) */
private shortCodeForSeance(): string {
  const id = this.editSeance?.seance_id ?? 0;
  const d  = this.editSeance?.date_seance ? new Date(this.editSeance.date_seance).getTime() : 0;
  // mélange simple: (id << 8) ^ (timestamp jour)
  const day = Math.floor(d / 86400000);
  const n = (id << 8) ^ day;
  return this.base62(Math.abs(n));
}

/** Encodeur base62 simple */
private base62(n: number): string {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  if (n === 0) return '0';
  let s = '';
  while (n > 0) { s = alphabet[n % 62] + s; n = Math.floor(n / 62); }
  return s;
}

/** Fabrique le texte à coller dans WhatsApp */
generatePoll(mode: 'avec' | 'seul') {
  const libelle = this.editSeance?.libelle ?? 'Séance';
  const type_seance = this.editSeance?.type_seance ?? 'Evenement';
  const lieu    = (this.editSeance as any)?.lieu ?? '';
  const dateStr = this.editSeance?.date_seance
    ? new Date(this.editSeance.date_seance).toLocaleDateString('fr-FR')
    : '';
  const heure   = (this.editSeance as any)?.heure ?? '';
  const rdv     = (this.editSeance as any)?.rdv ?? '';

  const titre = `${libelle} ${lieu ? 'à ' + lieu : ''} le ${dateStr}${heure ? ' à ' + heure : ''}. ${rdv}.`;
  let message = `${type_seance} ${titre} Vous venez ?`;

  if (mode === 'avec') {
    const id = this.editSeance?.seance_id ?? 0;
    const yes = this.global.shortLinkSeanceWithAnswer(id, true);
    const no  = this.global.shortLinkSeanceWithAnswer(id, false);
    message += `\nOui : ${yes}\nNon : ${no}`;
  }

  this.copyToClipboard(message);
}

private async copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    this.pollCopied = true;
    setTimeout(() => (this.pollCopied = false), 1500);
  } catch {
    // fallback: prompt
    window.prompt('Copier le message WhatsApp :', text);
  }
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

private _filter_date_avant: Date | null = this.calcDate(-2);   // aujourd'hui - 2 jours
private _filter_date_apres: Date | null = this.calcDate(0, 2); // aujourd'hui + 2 mois

get filter_date_apres(): Date | null {
  return this._filter_date_apres;
}
set filter_date_apres(value: Date | null) {
  this._filter_date_apres = value;
  this.onFilterChange();
}

get filter_date_avant(): Date | null {
  return this._filter_date_avant;
}
set filter_date_avant(value: Date | null) {
  this._filter_date_avant = value;
  this.onFilterChange();
}

/** utilitaire pour décaler une date */
private calcDate(daysDelta = 0, monthsDelta = 0): Date {
  const d = new Date();
  if (daysDelta) d.setDate(d.getDate() + daysDelta);
  if (monthsDelta) d.setMonth(d.getMonth() + monthsDelta);
  return d;
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
