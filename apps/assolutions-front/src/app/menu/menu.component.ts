import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AdherentMenu } from '../../class/adherent';
import { cours } from '../../class/cours';
import { StatutPresence } from '../../class/inscription';
import { KeyValuePairAny } from '../../class/keyvaluepair';
import { professeur } from '../../class/professeur';
import { StatutSeance } from '../../class/seance';
import { CoursService } from '../../services/cours.service';
import { ErrorService } from '../../services/error.service';
import { GlobalService } from '../../services/global.services';
import { InscriptionSeanceService } from '../../services/inscription-seance.service';
import { ProfesseurService } from '../../services/professeur.service';
import { StaticClass } from '../global';
import { MaSeanceNestService } from '../../services/ma-seance.nest.service';
import { AdherentSeance, MesSeances } from '@shared/compte/src/lib/seance.interface';
import { inscription_seance } from '@shared/compte/src/lib/inscription_seance.interface';
import { LieuNestService } from '../../services/lieu.nest.service';
import { lieu } from '@shared/compte/src';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css'],
})
export class MenuComponent implements OnInit {

  action: string;
  Riders: AdherentMenu[];
  listeprof: professeur[];
  listelieu: lieu[];
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
    private ma_seance_serv:MaSeanceNestService,
    private lieuserv: LieuNestService,
    private coursservice: CoursService,
    public inscriptionserv: InscriptionSeanceService
  ) {}

  async ngOnInit(): Promise<void> {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger le menu`;
    this.loading = true;
  
    if (!GlobalService.is_logged_in) {
      const o = errorService.CreateError(
        this.action,
        $localize`Accès impossible, vous n'êtes pas connecté`
      );
      this.loading = false;
      errorService.emitChange(o);
      this.router.navigate(['/login']);
      return;
    }
  
    try {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const nextMonth = new Date(today);
      nextMonth.setMonth(today.getMonth() + 1);
  
      this.Riders = [];
  
      // Partie adhérent
      if (GlobalService.projet.adherent) {
        this.action = $localize`Récupérer les adhérents`;
        const seancesAdh = await this.GetMySeance();
        const ridersAdh = seancesAdh.map((x) => {
          const rider = new AdherentMenu(x);
          rider.profil = "ADH";
          rider.filters.filter_date_avant = yesterday;
          rider.filters.filter_date_apres = nextMonth;
          return rider;
        });
        this.Riders.push(...ridersAdh);
      }
  
      // Partie prof
      if (GlobalService.projet.prof) {
        this.action = $localize`Récupérer les professeurs`;
        const seancesProf = await this.GetProfSeance();
        const ridersProf = seancesProf.map((x) => {
          const rider = new AdherentMenu(x);
          rider.profil = "PROF";
          rider.filters.filter_date_avant = yesterday;
          rider.filters.filter_date_apres = nextMonth;
          return rider;
        });
        this.Riders.push(...ridersProf);
      }
  
      // Tri final
      this.Riders.sort((a, b) => a.ID - b.ID);
  
      // Chargement des autres données
        this.action = $localize`Récupérer la liste des professeurs`;
      const profs = await this.prof_serv.GetProf();
      if (profs.length === 0) {
        throw errorService.CreateError(this.action,
          $localize`Il faut au moins un professeur pour créer un cours`
        );
      }
      this.listeprof = profs;
      this.liste_prof_filter = profs.map(
        (x) => new KeyValuePairAny(x.id, `${x.prenom} ${x.nom}`)
      );
  
      this.action = $localize`Récupérer la liste des lieux`;
      const lieux = await this.lieuserv.GetAll();
      if (lieux.length === 0) {
        throw errorService.CreateError(this.action,
          $localize`Il faut au moins un lieu pour créer un cours`
        );
      }
      this.listelieu = lieux;
      this.liste_lieu_filter = lieux.map((x) => x.nom);
  
      this.listeCours = await this.coursservice.GetCours();

      this.Riders.forEach((rider) => {
        rider.InscriptionSeances.forEach((seance) => {
          seance.lieu = this.trouverLieu(seance.lieuId);
          seance.cours = this.trouverCours(seance);
        })
        //trier
      });
  
    } catch (err: any) {
      const o = err instanceof HttpErrorResponse
        ? errorService.CreateError(this.action, err.message)
        : err instanceof Error
          ? errorService.CreateError(this.action, err.message)
          : err;
  
      errorService.emitChange(o);
      if(GlobalService.menu === 'ADMIN'){
        
      if (o.message.includes('professeur')) {
        this.router.navigate(['/adherent']);
      } else if (o.message.includes('lieu') && GlobalService.menu === 'ADMIN') {
        this.router.navigate(['/lieu']);
      }
    } else {
      this.router.navigate(['/login']);
    }
    } finally {
      this.loading = false;
    }
  }

  getLibelleProfil(profil: string): string {
    return profil === 'ADH'
      ? $localize`Adhérent`
      : $localize`Professeur`;
  }
  
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  }

  async GetMySeance(): Promise<AdherentSeance[]> {
    this.action = $localize`Se connecter`;
    const errorService = ErrorService.instance;
  
    try {
      const retour = await this.ma_seance_serv.Get();
      return retour;
    } catch (error: any) {
      const o = errorService.CreateError(this.action, error);
      errorService.emitChange(o);
      return []; // ou `throw error` selon ta logique
    }
  }

  async GetProfSeance(): Promise<AdherentSeance[]> {
    this.action = $localize`Se connecter`;
    const errorService = ErrorService.instance;
  
    try {
      const retour = await this.ma_seance_serv.Prof();
      return retour;
    } catch (error: any) {
      const o = errorService.CreateError(this.action, error);
      errorService.emitChange(o);
      return []; // ou `throw error` selon ta logique
    }
  }

  trouverLieu(lieuId: number): string {
    if (this.listelieu) {
      const lieunom = this.listelieu.find((lieu) => +lieu.id === lieuId);
      if(lieunom) {
        return lieunom.nom;
      } else  {
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
      (x) => x.ID == rider.ID
    ).InscriptionSeances;
    switch (champ) {
      case 'nom':
        rider.sort_nom = sens;
        rider.sort_date = 'NO';
        rider.sort_lieu = 'NO';
        rider.sort_cours = 'NO';
        liste_seance_VM.sort((a, b) => {
          const nomA = a.nom.toUpperCase(); // Ignore la casse lors du tri
          const nomB = b.nom.toUpperCase();
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
          const nomA = a.cours;
          const nomB = b.cours;
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
          const lieuA =a.lieu;           
          const lieuB =b.lieu;   

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
          let dateA = a.date;
          let dateB = b.date;

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
  trouverCours(_s:MesSeances) : string{
    if(_s.typeSeance == "ENTRAINEMENT"){
      return this.listeCours.find(x => x.id == _s.coursId).nom || $localize`Cours non trouvé`;
    } else if(_s.typeSeance == "MATCH"){
      return $localize`Match`;
    } else if(_s.typeSeance == "SORTIE"){
      return $localize`Sortie`;
    } else {
return $localize`Evénement`;
    }
  }

  MAJInscription(libelle : string, rider_id:number, seance: MesSeances, statut: boolean) {
    const errorService = ErrorService.instance;
    let oldstatut = seance.statutInscription;
    if (statut == null && oldstatut != null) {
      this.action =
      libelle +
        $localize` ne prévoit plus d'être présent à la séance ` +
        seance.nom;
      this.inscriptionserv
        .Delete(seance.inscription_id)
        .then((ok) => {
          if (ok) {
            seance.statutInscription = null;
            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
          } else {
            let o = errorService.UnknownError(this.action);
            errorService.emitChange(o);
          }
        })
        .catch((err: HttpErrorResponse) => {
          seance.statutInscription = oldstatut;
          let o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
          return;
        });
      return;
    } else {
      const uneInscription: inscription_seance = {
        id: 0,
        rider_id: rider_id,
        seance_id: seance.id,
        date_inscription: new Date(),
        statut_inscription: statut ? StatutPresence.Présent : StatutPresence.Absent,
        statut_seance: null
      };
      if (statut) {
        seance.statutInscription = StatutPresence.Présent;
        this.action = 
        libelle +
        $localize` prévoit d'être présent à la séance ` +
        seance.nom;
      } else {
        seance.statutInscription = StatutPresence.Absent;
        this.action =
        libelle +
        $localize` ne prévoit plus d'être présent à la séance ` +
        seance.nom;
      }
      if (seance.inscription_id == 0) {

        this.inscriptionserv
          .Add(uneInscription)
          .then((id) => {
            seance.inscription_id = id;
            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
          })
          .catch((err: HttpErrorResponse) => {
            seance.statutInscription = oldstatut;
            let o = errorService.CreateError(this.action, err.message);
            errorService.emitChange(o);
            return;
          });
      } else {
        const update: inscription_seance = {
          id: seance.inscription_id,
          rider_id: rider_id,
          seance_id: seance.id,
          date_inscription: new Date(),
          statut_inscription: statut ? StatutPresence.Présent : StatutPresence.Absent,
          statut_seance: null
        };
        this.inscriptionserv
          .Update(update)
          .then((retour) => {
            if (retour) {
              let o = errorService.OKMessage(this.action);
              errorService.emitChange(o);
            } else {
              let o = errorService.UnknownError(this.action);
              errorService.emitChange(o);
            }
          })
          .catch((err: HttpErrorResponse) => {
            seance.statutInscription = oldstatut;
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
  AfficherProfil(_t17: AdherentMenu) {
    for (const r of this.Riders) {
      if (r.ID == _t17.ID && r.profil == _t17.profil) {
        r.afficher = !r.afficher;
      } else {
        r.afficher = false;
      }
    }
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