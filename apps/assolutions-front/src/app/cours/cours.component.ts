import { HttpErrorResponse } from '@angular/common/http';
import { Component,
  ElementRef,
  OnInit,
  ViewChild, } from '@angular/core';
import { Router } from '@angular/router';
import { jour_semaine } from '../global';
import { AdherentService } from '../../services/adherent.service';
import { CoursService } from '../../services/cours.service';
import { ErrorService } from '../../services/error.service';
import { ExcelService } from '../../services/excel.service';
import { GlobalService } from '../../services/global.services';
import { GroupeService } from '../../services/groupe.service';
import { ProfesseurService } from '../../services/professeur.service';
import { SaisonService } from '../../services/saison.service';
import { LieuNestService } from '../../services/lieu.nest.service';
import { KeyValuePair, KeyValuePairAny, ValidationItem } from '@shared/lib/autres.interface';
import { Groupe_VM, LienGroupe_VM } from '@shared/lib/groupe.interface';
import { Professeur_VM } from '@shared/lib/prof.interface';
import { Cours_VM } from '@shared/lib/cours.interface';
import { Saison_VM } from '@shared/lib/saison.interface';
import { donnee_date_lieu } from '../component/datelieu/datelieu.component';
import { caracteristique } from '../component/caracteristique_seance/caracteristique_seance.component';
import { PersonneLight_VM } from '@shared/lib/personne.interface';
import { AppStore } from '../app.store';

@Component({
  standalone: false,
  selector: 'app-cours',
  templateUrl: './cours.component.html',
  styleUrls: ['./cours.component.css']
})
export class CoursComponent implements OnInit {
  // cours.component.ts
  constructor(private prof_serv:ProfesseurService, private coursservice: CoursService, private lieuserv: LieuNestService, public ridersService: AdherentService, private router: Router, private saisonserv: SaisonService,
    private grServ: GroupeService, private excelService:ExcelService, public store:AppStore) { }
  listelieu: KeyValuePair[];
    titre_groupe: string = $localize`Groupes du cours`;
  listeCours: Cours_VM[] = [];
  editCours: Cours_VM | null = null;
  current_groupe_id: number;
  current_prof_id: number;
   prof_dispo: Professeur_VM[];
  groupe_dispo: KeyValuePair[] = [];
  liste_groupe: Groupe_VM[] = [];
  liste_prof: Professeur_VM[];
  is_valid:boolean = false;
  save:string= "";
  // Ref pour focus (met uniquement celles que tu utilises dans le template)
@ViewChild('nomFilterInput') nomFilterInput?: ElementRef<HTMLInputElement>;
@ViewChild('jourSelect') jourSelect?: ElementRef<HTMLSelectElement>;
@ViewChild('profSelect') profSelect?: ElementRef<HTMLSelectElement>;
@ViewChild('lieuSelect') lieuSelect?: ElementRef<HTMLSelectElement>;
@ViewChild('groupeSelect') groupeSelect?: ElementRef<HTMLSelectElement>;

  public liste_saison: Saison_VM[] = [];
  public active_saison: Saison_VM;

  
  @ViewChild('scrollableContent', { static: false })
  scrollableContent!: ElementRef;
  showScrollToTop: boolean = false;

  sort_nom = "NO";
  sort_jour = "NO";
  sort_lieu = "NO";
  season_id: number;
  filter_jour: any;
  filter_nom: string;
  filter_groupe: number;
  filter_lieu: number;
  filter_prof: number;
  liste_groupe_filter: Groupe_VM[];
  liste_prof_filter: KeyValuePairAny[];
  liste_lieu_filter: KeyValuePairAny[];
  action: string = "";
  liste_jour_semaine = Object.keys(jour_semaine).map(key => jour_semaine[key]);
  afficher_menu_admin: boolean = false;
  edit_prof:boolean = false;
  edit_nom:boolean = false;

  public GlobalService = GlobalService.instance;
    public filters: FilterCours = new FilterCours();  
    public selected_filter: string;
    public selected_sort: any;
    public selected_sort_sens: any;
    public afficher_tri: boolean = false;
      public loading: boolean = false;
      public afficher_filtre: boolean = false;
      rNom:ValidationItem ={key:true, value:''};
      rProf:ValidationItem ={key:false, value:$localize`Un professeur responsable est nécessaire pour le cours`};
    

  ngOnInit(): void {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger les cours`;
    this.loading = true;
    this.filters.editing = { nom:false, jour:false, prof:false, lieu:false, groupe:false };
    if (this.store.isLoggedIn) {
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
                    this.store.mode() === 'ADMIN'                  ) {
                    this.router.navigate(['/saison']);
                    this.store.updateSelectedMenu("SAISON");
                  } else {
                    this.router.navigate(['/menu']);
                    this.store.updateSelectedMenu("MENU");
                  }
                  this.loading = false;
                  return;
                }
                this.liste_saison = sa;
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
        this.liste_groupe_filter = groupes;
        this.prof_serv.GetProf().then((profs) => {
          if (profs.length == 0) {
            let o = errorService.CreateError($localize`Récupérer les professeurs`, $localize`Il faut au moins un professeur pour créer un cours`);
            errorService.emitChange(o);
            this.loading = false;
            this.router.navigate(['/adherent']);
            return;
          }
          this.liste_prof = profs;
          this.liste_prof_filter = this.liste_prof.map((x) => { return { key: x.person.id, value: x.person.prenom + ' ' + x.person.nom } });
          this.lieuserv.GetAllLight().then((lieux) => {
            if (lieux.length == 0) {
              let o = errorService.CreateError($localize`Récupérer les lieux`, $localize`Il faut au moins un lieu pour créer un cours`);
              errorService.emitChange(o);
              this.loading = false;
              if (this.store.mode() === "ADMIN") {
                this.router.navigate(['/lieu']);
                    this.store.updateSelectedMenu("LIEU");

              }
              return;
            }
            this.listelieu = lieux;
            this.liste_lieu_filter = lieux;
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

  normalizeFilterValue(key: string, raw: any): any {
  switch (key) {
    case 'nom':
    case 'groupe': {
      const v = (raw ?? '').toString().trim();
      return v || null;
    }
    case 'jour': {
      const v = (raw ?? '').toString().trim();
      return v || null; // ex: 'lundi' | null
    }
    case 'prof':
    case 'lieu': {
      // valeurs numériques (id) ou null
      if (raw === null || raw === '' || Number.isNaN(+raw)) return null;
      return +raw;
    }
    default: return raw;
  }
}

startEditFilter(key: string, input?: ElementRef<any> | any) {
  (this.filters as any).editing[key] = true;
  setTimeout(() => {
    const el = input?.nativeElement ?? input;
    el?.focus?.();
    el?.select?.();
  }, 0);
}
onFilterChange(key: string, value: any) {
  (this.filters as any)[`filter_${key}`] = this.normalizeFilterValue(key, value);
}
endEditFilter(key: string)   { (this.filters as any).editing[key] = false; }
cancelEditFilter(key: string){ (this.filters as any).editing[key] = false; }
clearFilter(key: string) {
  (this.filters as any)[`filter_${key}`] = null;
  (this.filters as any).editing[key] = false;
}


  onGroupesUpdated(updatedGroupes: LienGroupe_VM[]) {
    this.editCours.groupes = updatedGroupes;
    // Ici tu peux aussi déclencher d'autres actions, comme la sauvegarde ou la validation
  }

  UpdateListeCours() {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger les cours`;
    
    this.loading = true;
    if (this.season_id && this.season_id > 0) {
      this.coursservice.GetAll(this.season_id).then((c) => {
        this.listeCours = c;
        this.loading = false;
      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        this.router.navigate(['/menu']);
        this.loading = false;
        return;
      })
    } else {
      this.coursservice.GetAll(this.store.saison_active().id).then((c) => {
        this.listeCours = c;
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
    this.coursservice.Get(this.editCours.id).then((c)=>{
      this.editCours = c;
      this.save = JSON.stringify(c);
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
    const indexToUpdate = this.liste_prof.findIndex(prof => prof.person.id === profId);

    if (indexToUpdate !== -1) {
      // Remplacer l'élément à l'index trouvé par la nouvelle valeur
      return this.liste_prof[indexToUpdate].person.prenom + " " + this.liste_prof[indexToUpdate].person.nom;
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
  Edit(c: Cours_VM): void {
    this.editCours = c;
    this.edit_nom = false;
    this.edit_prof = false;
      this.save = JSON.stringify(c);
  }

  Delete(c: Cours_VM): void {
    const errorService = ErrorService.instance;

    let confirmation = window.confirm($localize`Voulez-vous supprimer ce cours ? Cette action est définitive. `);
    if (confirmation) {
      this.action = $localize`Supprimer un cours`;
      if (c) {
        this.coursservice.Delete(c.id).then(() => {
            this.UpdateListeCours();
            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
        
        }).catch((err: HttpErrorResponse) => {
          let o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
        })
      }
    }
  }

  Create(): void {
    this.editCours = new Cours_VM();
    this.editCours.saison_id = this.active_saison.id;
    this.edit_prof = true;
      this.save = JSON.stringify(this.editCours);
    
  }
   public is_valid_datelieu: boolean = false;

valid_DateLieu(isValid: boolean): void {
  this.is_valid_datelieu = isValid;
  this.checkall();
}


checkall(){
  this.rNom.key = true;
  this.rProf.key = true;
   if(this.editCours.prof_principal_id>0){
    this.rProf.key = true;
    this.rProf.value = "";
  } else {
    this.rProf.key = false;
    this.rProf.value = $localize`Un professeur responsable est nécessaire pour le cours`;
  }
  if(!this.editCours.nom){
    this.rNom.key = false;
    this.rNom.value = $localize`Un nom doit être saisi`
    this.is_valid = false;
    return;
  }
  if(this.editCours.nom.length <4){
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
  if (this.editCours) {
    this.editCours.lieu_id = donnee_date_lieu.lieu_id;
    this.editCours.heure = donnee_date_lieu.heure;
    this.editCours.jour_semaine = donnee_date_lieu.jour_semaine;
    this.editCours.duree = donnee_date_lieu.duree;
    this.editCours.rdv = donnee_date_lieu.rdv;
  }
   this.checkall();
    if(this.is_valid && this.editCours.id > 0){
  this.Save();
  }
}

autoSave(){
  this.checkall();
  if(this.is_valid){
  this.Save();
  this.edit_prof = false;
  }
}
retour(){
  this.editCours = JSON.parse(this.save)
}

SaveCaracteristique(caracteristique :caracteristique){
  if(this.editCours){
    this.editCours.est_limite_age_minimum = caracteristique.age_min;
    this.editCours.age_minimum = caracteristique.age_min_valeur;
    this.editCours.est_limite_age_maximum = caracteristique.age_max;
    this.editCours.age_maximum = caracteristique.age_max_valeur;
    this.editCours.est_place_maximum = caracteristique.place_limite;
    this.editCours.place_maximum = caracteristique.place_limite_valeur;
    this.editCours.afficher_present = caracteristique.afficher_present;
    this.editCours.essai_possible = caracteristique.essai_possible;
  }
   this.checkall();
  if(this.is_valid && this.editCours.id > 0){
  this.Save();
  }
}
  Save() {
    const errorService = ErrorService.instance;
    this.action = $localize`Ajouter un cours`;
    if(!this.is_valid){
         let o = errorService.CreateError(this.action,$localize`Erreur sur les données`);
            errorService.emitChange(o);
            return;
    }
    if (this.editCours) {
      if (this.editCours.id == 0) {

        this.coursservice.Add(this.editCours).then((retour) => {
          if (retour.id > 0) {
            this.editCours.id = retour.id;
            this.editCours.professeursCours.forEach(async (prof) =>{
              await this.coursservice.AddCoursProf(retour.id, prof.id);
            })
            this.editCours.groupes.forEach(async (gr)=>{
              await this.grServ.AddLien(retour.id, "cours", gr.id);
            })
            //on attend bien que la boucle foreach soit finie pour afficher ?
            let o = errorService.OKMessage(this.action);
            this.edit_nom = false;
            this.edit_prof = false;
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
        this.coursservice.Update(this.editCours).then((ok) => {

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

  public GetCoursID(id: number): Promise<Cours_VM | null> {
    return this.coursservice.Get(id)
      .then((c: Cours_VM) => {
        return c; // Retourne la valeur du cours récupéré
      })
      .catch(() => {
        return null; // Retourne null en cas d'erreur
      });
  }

  Retour(): void {
   let temp_editcours = JSON.stringify(this.editCours);
   if(temp_editcours === this.save){
    
      this.editCours = null;
      this.UpdateListeCours();
   } else {
 let confirm = window.confirm($localize`Vous perdrez les modifications réalisées non sauvegardées, voulez-vous continuer ?`);
    if (confirm) {
      this.editCours = null;
      this.UpdateListeCours();
    }
   }
   
  }

  ModifierSerie(): void {
    const errorService = ErrorService.instance;
    this.action = $localize`Application des modifications à toutes les séances de la série`;
    let o = errorService.Create(this.action, "", "Warning");
    errorService.emitChange(o);
    this.loading = true;
    this.coursservice.UpdateSerieCours(this.editCours, new Date()).then((retour : KeyValuePairAny) => {
      this.loading = false;
      if(Number(retour.key) === Number(retour.value) ){
      let o = errorService.OKMessage(this.action);
      errorService.emitChange(o);
      } else if(Number(retour.value) >0){
        let o = errorService.Create(this.action, $localize`Nombre de modification : ` + retour.key.toString() + ` OK sur ` + retour.value, "Warning");
         errorService.emitChange(o);
      } else {
        let o = errorService.UnknownError(this.action);
        errorService.emitChange(o);
      }
    }).catch((err: HttpErrorResponse) => {
      this.loading = false;
      let o = errorService.CreateError(this.action, err.message);
      errorService.emitChange(o);
      return;
    });

  }




  Sort(sens: "NO" | "ASC" | "DESC", champ: string) {
    switch (champ) {
      case "nom":
        this.sort_nom = sens;
        this.sort_jour = "NO";
        this.sort_lieu = "NO";
        this.listeCours.sort((a, b) => {
          const nomA = a.nom.toUpperCase(); // Ignore la casse lors du tri
          const nomB = b.nom.toUpperCase();
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
        this.listeCours.sort((a, b) => {
          const lieuA = this.listelieu.find(lieu => lieu.key === a.lieu_id)?.value || '';
          const lieuB = this.listelieu.find(lieu => lieu.key === b.lieu_id)?.value || '';

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
        this.listeCours.sort((a, b) => {
          let jourA = 0;
          let jourB = 0;
          let jourEnum = jour_semaine[a.jour_semaine.toLowerCase() as keyof typeof jour_semaine];
          if (jourEnum !== undefined) {
            jourA = jourEnum;
          };
          jourEnum = jour_semaine[b.jour_semaine.toLowerCase() as keyof typeof jour_semaine];
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
      let list: Cours_VM[] = this.getFilteredCours();
      this.excelService.exportAsExcelFile(list, 'liste_cours', headers);
    }
    getFilteredCours(): Cours_VM[] {
      return this.listeCours.filter((item) => {
        return (
          (!this.filters.filter_nom ||
            item.nom.toLowerCase().includes(
              this.filters.filter_nom.toLowerCase()
            )) &&
            (!this.filters.filter_lieu ||
              item.lieu_id == this.filters.filter_lieu
              ) &&
              (!this.filters.filter_jour ||
                  item.jour_semaine == this.filters.filter_jour
                  ) &&
       
          (!this.filters.filter_groupe ||
            item.groupes.some((x) =>
              x.nom.toLowerCase().includes(
                this.filters.filter_groupe?.toLowerCase() ?? ''
              )
            )) && 
            (!this.filters.filter_prof ||
              item.prof_principal_id == 
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
      this.action = $localize`Ajouter un professeur au cours`;
      const indexToUpdate = this.liste_prof.find(cc => cc.person.id === +this.current_prof_id);
        if(this.editCours.id>0){
          await this.coursservice.AddCoursProf(this.editCours.id, indexToUpdate.person.id);
        }   
        this.editCours.professeursCours.push(indexToUpdate.person);
        
        this.current_prof_id = null;
        this.MAJListeProf();
    
        
    }
    
    async RemoveProf(item) {
      this.action = $localize`Supprimer un professeur de la liste`;    
      let errorService = ErrorService.instance;
      try {
      
      if(this.editCours.id>0){
          await this.coursservice.DeleteCoursProf(this.editCours.id,item.id);
        }   
        this.editCours.professeursCours = this.editCours.professeursCours.filter(e => e.id !== item.id);
        if(this.editCours.prof_principal_id == item.id){
          this.editCours.prof_principal_id = null;
        }
        this.MAJListeProf();
          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);

        } catch(err ) { 
          let o = errorService.CreateError(this.action, err.toString());
          errorService.emitChange(o);
        };
     
        
    }
    MAJListeProf() {
      this.prof_dispo = this.liste_prof;
      this.editCours.professeursCours.forEach((element: PersonneLight_VM) => {
        let element_to_remove = this.liste_prof.find(e => e.person.id == element.id);
        if (element_to_remove) {
          this.prof_dispo = this.prof_dispo.filter(e => e.person.id !== element_to_remove.person.id);
        }
      });
    }

}

export class FilterCours {
   public editing = {
    nom: false,
    prof:false,
    jour: false,
    lieu: false,
    groupe: false,
  };
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
