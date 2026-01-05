import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CoursService } from '../../services/cours.service';
import { ErrorService } from '../../services/error.service';
import { GlobalService } from '../../services/global.services';
import { InscriptionSeanceService } from '../../services/inscription-seance.service';
import { ProfesseurService } from '../../services/professeur.service';
import { StaticClass } from '../global';
import { MaSeanceNestService } from '../../services/ma-seance.nest.service';
import { AdherentSeance_VM, MesSeances_VM, Seance_VM, StatutSeance, calculerHeureFin } from '@shared/lib/seance.interface';
import { LieuNestService } from '../../services/lieu.nest.service';
import { KeyValuePair } from '@shared/lib/autres.interface';
import { AdherentService } from '../../services/adherent.service';
import { AdherentMenu } from '../../class/adherent-menu';
import { InscriptionSeance_VM, InscriptionStatus_VM, SeanceStatus_VM } from '@shared/lib/inscription_seance.interface';
import { Professeur_VM } from '@shared/lib/prof.interface';
import { Lieu_VM } from '@shared/lib/lieu.interface';
import { Cours_VM } from '@shared/lib/cours.interface';
import { MultifiltersMenuPipe } from '../../filters/multifilters-menu.pipe';
import { AppStore } from '../app.store';

@Component({
  standalone: false,
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css'],
})
export class MenuComponent implements OnInit {

  action: string;
  Riders: AdherentMenu[];
  listeprof: Professeur_VM[];
  listelieu: Lieu_VM[];


    public loading: boolean = false;
    @ViewChild('scrollableContent', { static: false })
    scrollableContent!: ElementRef;
    showScrollToTop: boolean = false;
  denseMode = false;

  public liste_prof_filter: KeyValuePair[];
  public liste_lieu_filter: string[];
  public anniversaire: string[];
  listeCours: Cours_VM[] = [];

  public g: StaticClass;
  constructor(
    public cdr: ChangeDetectorRef,
    public GlobalService: GlobalService,
    private prof_serv: ProfesseurService,
    public store:AppStore,
    private router: Router,
    private ma_seance_serv:MaSeanceNestService,
    private lieuserv: LieuNestService,
    private coursservice: CoursService,
    public inscriptionserv: InscriptionSeanceService,
    public riderservice:AdherentService,
  private multifiltersPipe: MultifiltersMenuPipe // 👈 injecte le pipe
  ) {}

  async ngOnInit(): Promise<void> {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger le menu`;
    console.log("Charger le menu");
    if(this.store.mode() == "ADMIN"){
      this.router.navigate(['/menu-admin']);
      return;
    }
    this.loading = true;
    
  
    try {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const nextMonth = new Date(today);
      nextMonth.setMonth(today.getMonth() + 1);
  
      this.Riders = [];
      this.riderservice.Anniversaire(this.store.saison_active().id).then((anniv) => {  
        this.anniversaire = anniv
      });
      // Partie adhérent
      if (this.store.selectedProject().adherent || this.store.selectedProject().essai) {
        this.action = $localize`Récupérer les adhérents`;
        const seancesAdh = await this.GetMySeance();
        const ridersAdh = seancesAdh.map((x) => {
          const rider = new AdherentMenu(x);
          rider.profil = 'ADH';
          rider.filters.filter_date_avant = yesterday;
          rider.filters.filter_date_apres = nextMonth;
         rider.MesSeances.sort((a, b) => {
  const dateA = new Date(a.seance.date_seance);
  const [hA, mA] = a.seance.heure_debut.split(':').map(Number);
  dateA.setHours(hA, mA, 0, 0);

  const dateB = new Date(b.seance.date_seance);
  const [hB, mB] = b.seance.heure_debut.split(':').map(Number);
  dateB.setHours(hB, mB, 0, 0);

  return dateA.getTime() - dateB.getTime();
});

          return rider;
        });
        this.Riders.push(...ridersAdh);
      }
  
      // Partie prof
      if (this.store.selectedProject().prof) {
        this.action = $localize`Récupérer les professeurs`;
        const seancesProf = await this.GetProfSeance();
        const ridersProf = seancesProf.map((x) => {
          const rider = new AdherentMenu(x);
          rider.profil = "PROF";
          rider.filters.filter_date_avant = yesterday;
          rider.filters.filter_date_apres = nextMonth;
            rider.MesSeances.sort((a, b) => {
  const dateA = new Date(a.seance.date_seance);
  const [hA, mA] = a.seance.heure_debut.split(':').map(Number);
  dateA.setHours(hA, mA, 0, 0);

  const dateB = new Date(b.seance.date_seance);
  const [hB, mB] = b.seance.heure_debut.split(':').map(Number);
  dateB.setHours(hB, mB, 0, 0);

  return dateA.getTime() - dateB.getTime();
});
          return rider;
        });
        this.Riders.push(...ridersProf);
      }
  
      // Tri final
      this.Riders.sort((a, b) => a.id - b.id);
  
      // Chargement des autres données
        this.action = $localize`Récupérer la liste des professeurs`;
      const profs = await this.prof_serv.GetProf();
      if (profs.length === 0) {
        throw errorService.CreateError(this.action,
          $localize`Il faut au moins un professeur pour créer un cours`
        );
      }
      this.listeprof = profs;
     this.liste_prof_filter = profs.map((x) => {
  return { key: x.person.id, value: `${x.person.prenom} ${x.person.nom}` };
});
  
      this.action = $localize`Récupérer la liste des lieux`;
      const lieux = await this.lieuserv.GetAll();
      if (lieux.length === 0) {
        throw errorService.CreateError(this.action,
          $localize`Il faut au moins un lieu pour créer un cours`
        );
      }
      this.listelieu = lieux;
      this.liste_lieu_filter = lieux.map((x) => x.nom);
  
      this.listeCours = await this.coursservice.GetAll(this.store.saison_active().id);

      this.Riders.forEach((rider) => {
        this.riderservice.GetPhoto(rider.id).then((profil) => {
          if(profil && profil.length > 0) {
            
          rider.photo = profil;}
          else {
            rider.photo = undefined;
          }
        });
        rider.MesSeances.forEach((ms) => {
          if(ms.seance.lieu_id && ms.seance.lieu_id >0) ms.seance.lieu_nom = this.trouverLieu(ms.seance.lieu_id);
          
          if(ms.seance.cours && ms.seance.cours >0) ms.seance.cours_nom = this.trouverCours(ms.seance);
        })
        //trier
        this.updateDenseMode();
  window.addEventListener('resize', this.updateDenseMode);
      });
  
    } catch (err: any) {
      const o = err instanceof HttpErrorResponse
        ? errorService.CreateError(this.action, err.message)
        : err instanceof Error
          ? errorService.CreateError(this.action, err.message)
          : err;
  
      errorService.emitChange(o);
      if(this.store.mode() === 'ADMIN'){
        
      if (o.message.includes('professeur')) {
        this.router.navigate(['/adherent']);
      } else if (o.message.includes('lieu') && this.store.mode() === 'ADMIN') {
        this.router.navigate(['/lieu']);
        this.store.updateSelectedMenu("LIEU");
      }
    } else {
     this.store.clearSession();
      this.router.navigate(['/login']);
    }
    } finally {
      this.loading = false;
    }
  }
  ngOnDestroy() {
  window.removeEventListener('resize', this.updateDenseMode);
}

updateDenseMode = () => {
  // dense si largeur < 480px (à ajuster)
  this.denseMode = window.innerWidth < 480;
};

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

  async GetMySeance(): Promise<AdherentSeance_VM[]> {
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

  async GetProfSeance(): Promise<AdherentSeance_VM[]> {
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
copierDansPressePapier(texte: string): void {
    const errorService = ErrorService.instance;
  navigator.clipboard.writeText(texte).then(() => {    
    // Optionnel : Afficher un message, toast ou console.log
          const o = errorService.OKMessage($localize`Adresse copiée :` + texte);
      errorService.emitChange(o);
    console.log( $localize`Adresse copiée :`, texte);
  }).catch(err => {
    console.error( $localize`Erreur de copie`, err);
  });
}
  getadresse(id:number) : string {
    let ad = this.listelieu.find(x => x.id == id) 
    return ad!.nom + " " + ad!.adresse.Street + " " + ad!.adresse.PostCode + " " + ad!.adresse.City
  }
    calculerHeureFin(heure: string, duree: number): string {
  return calculerHeureFin(heure, duree);
}
  nbSeanceInscrit(seance: MesSeances_VM[]): {OK:number, KO:number, aucun:number} {
    let OK = 0;
    let KO = 0;
    let aucun = 0;
    seance.forEach((s) => { 
      if(s.seance.statut == StatutSeance.prévue){
      if(s.statutInscription == null || s.statutInscription == undefined){ 
        aucun++;
      }
      else if (s.statutInscription == "présent") {
        OK++;
      } 
      else if (s.statutInscription == "essai") {
        OK++;
      } 
      else if (s.statutInscription == "absent") {
        KO++;
      } else {
        aucun++;
      }
      }
     
    });

    return {OK, KO, aucun};
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
      (x) => x.id == rider.id
    ).MesSeances;
    switch (champ) {
      case 'nom':
        rider.sort_nom = sens;
        rider.sort_date = 'NO';
        rider.sort_lieu = 'NO';
        rider.sort_cours = 'NO';
        liste_seance_VM.sort((a, b) => {
          const nomA = a.seance.nom.toUpperCase(); // Ignore la casse lors du tri
          const nomB = b.seance.nom.toUpperCase();
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
          const nomA = a.seance.cours_nom;
          const nomB = b.seance.cours_nom;
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
          const lieuA =a.seance.lieu_nom;           
          const lieuB =b.seance.lieu_nom;   

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
          let dateA = a.seance.date_seance;
          let dateB = b.seance.date_seance;

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

  private refreshRider(rider: AdherentMenu): void {
  // On force Angular à détecter le changement en réaffectant une nouvelle référence
  rider.MesSeances = [...rider.MesSeances];
}

  MAJInscription(messeance : MesSeances_VM, adherentmen : AdherentMenu, statut: boolean, afficher_message: boolean = true) {
    const errorService = ErrorService.instance;
    let i :InscriptionSeance_VM = new InscriptionSeance_VM();
    let oldstatut = messeance.statutInscription || null;
    messeance.statutInscription = statut ? InscriptionStatus_VM.PRESENT : (statut == false) ? InscriptionStatus_VM.ABSENT : null;
        this.refreshRider(adherentmen);
        this.cdr.detectChanges();
    i.date_inscription = new Date();
    i.rider_id = adherentmen.id;
    i.seance_id = messeance.seance.id;
    i.statut_inscription = statut ? InscriptionStatus_VM.PRESENT : InscriptionStatus_VM.ABSENT; 
    i.statut_seance = messeance.statutPrésence == "absent" ?  SeanceStatus_VM.ABSENT : (messeance.statutPrésence == "présent") ? SeanceStatus_VM.PRESENT : null;
    let statut_text = statut ? $localize`présent` : (statut == false) ? $localize`Absent` : $localize`Indéfini`; 
    this.action = $localize`Nouveau statut d'inscription de ` + adherentmen.libelle + ` : ` + statut_text + ` pour la séance ` + messeance.seance.nom;

    this.inscriptionserv.MAJ(i).then((res) =>{
      if(res){  
        let o = errorService.OKMessage(this.action);
        afficher_message ? errorService.emitChange(o) : null;
      } else {
        let o = errorService.UnknownError(this.action);
        afficher_message ? errorService.emitChange(o) : null;
        messeance.statutInscription = oldstatut;
        this.refreshRider(adherentmen);
        this.cdr.detectChanges();
      }

    }).catch((err) => {
      let o = errorService.CreateError(this.action, err.message);
      errorService.emitChange(o);
      messeance.statutInscription = oldstatut;
      this.refreshRider(adherentmen);
    })
    this.cdr.detectChanges();
  }

  async MAJInscriptionAffichee(rider: AdherentMenu, statut: boolean) {
     const errorService = ErrorService.instance;
    const seancesAffichees = this.multifiltersPipe.transform(rider.MesSeances, rider.filters);

  for (const ms of seancesAffichees) {
    await this.MAJInscription(ms, rider, statut, false);
  }
     this.action = $localize`Mettre à jour l'inscription : ` + rider.libelle + " " + (statut ? $localize`Présent` : $localize`Absent`);
            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);


  }
  GotoSeance(id : number){
    this.router.navigate(['/seance'], { queryParams: { id: id } });
  }

  Voir(id: number) {
    this.router.navigate(['/adherent'], { queryParams: { id: id } });
  }

  ReinitFiltre(adh: AdherentMenu) {
    adh.filters = new FilterMenu();
  }

  VoirMaSeance(seance: Seance_VM) {
    this.router.navigate(['/ma-seance'], {
      queryParams: { id: seance.id },
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
      if (r.id == _t17.id && r.profil == _t17.profil) {
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

  private _filter_statut: StatutSeance | null = StatutSeance.prévue;
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