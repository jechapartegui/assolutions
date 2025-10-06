import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FilterAdherent } from '../adherent/adherent.component';
import { AdherentService } from '../../services/adherent.service';
import { ErrorService } from '../../services/error.service';
import { GlobalService } from '../../services/global.services';
import { ProfesseurService } from '../../services/professeur.service';
import { SaisonService } from '../../services/saison.service';
import { ContratLight_VM, Professeur_VM, ProfSaisonVM } from '@shared/lib/prof.interface';
import { Adherent_VM } from '@shared/lib/member.interface';
import { Saison_VM } from '@shared/lib/saison.interface';
import { AppStore } from '../app.store';

@Component({
  standalone: false,
  selector: 'app-professeur',
  templateUrl: './professeur.component.html',
  styleUrls: ['./professeur.component.css']
})
export class ProfesseurComponent implements OnInit {
ReinitFiltre() {
this.filters = new FilterAdherent();
}
ExportExcel() {
throw new Error('Method not implemented.');
}
  public action: string;
  public ListeProf: Professeur_VM[];
  public loading:boolean=false;
  @Input() public id: number;
  public thisProf: Professeur_VM = null;
  public thisAdherent: Adherent_VM = null;
  public inscrits: number = null;
  public afficher_filtre: boolean = false;
    public histo_prof: string;
    @ViewChild('scrollableContent', { static: false })
    scrollableContent!: ElementRef;
    showScrollToTop: boolean = false;
  public liste_saison: Saison_VM[] = [];
  public active_saison: Saison_VM;
  public liste_adherents_VM: Adherent_VM[] = [];
  public sort_nom = "NO";
  public sort_date = "NO";
  public sort_sexe = "NO";
  public filters:FilterAdherent = new FilterAdherent();
  public selected_filter:string;
  public newContrat:ContratLight_VM;
  public creer:boolean;
  public contratError: string | null = null;
  public login_adherent: string = "";
  public existing_login: boolean;

  public modal: boolean = false;
  public libelle_inscription = $localize`Inscrire`;
  public libelle_inscription_avec_paiement = $localize`Saisir inscription et paiement`;
  public libelle_retirer_inscription = $localize`Retirer l'inscription`;

  constructor(public store:AppStore, private prof_serv: ProfesseurService, private router: Router, public GlobalService: GlobalService, private saisonserv: SaisonService, private ridersService: AdherentService, private route: ActivatedRoute) {

  }

  ngOnInit(): void {

    const errorService = ErrorService.instance;
    this.action = $localize`Charger les professeurs`;
    this.loading = true;
    if (this.store.isLoggedIn) {
      if ((this.store.appli() === "APPLI")) {
        this.router.navigate(['/menu']);
        this.loading = false;
        return;
      }
      // Chargez la liste des cours

      this.saisonserv.GetAll().then((sa) => {
        if (sa.length == 0) {
          let o = errorService.CreateError($localize`Récupérer les saisons`, $localize`Il faut au moins une saison pour créer un cours`);
          errorService.emitChange(o);
          if (this.store.appli() === "ADMIN") {
            this.router.navigate(['/saison']);
            this.loading = false;

          } else {
            this.router.navigate(['/menu']);
            this.store.updateSelectedMenu("MENU");
            this.loading = false;
          }
          return;
        }
        this.liste_saison = sa;
        this.active_saison = this.liste_saison.filter(x => x.active == true)[0];
          this.inscrits = this.active_saison.id;
          this.afficher_filtre = false;
          this.UpdateListeProf();       
        let o = errorService.OKMessage(this.action);
        errorService.emitChange(o);
      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError($localize`récupérer les saisons`, err.message);
        errorService.emitChange(o);
        this.router.navigate(['/menu']);
            this.store.updateSelectedMenu("MENU");
        return;
      })
    } else {
      let o = errorService.CreateError(this.action, $localize`Accès impossible, vous n'êtes pas connecté`);
      errorService.emitChange(o);
      this.router.navigate(['/login']);
    }
  }

  UpdateListeProf() {
    const errorService = ErrorService.instance;
    this.action = $localize`Récupérer les professeurs`;
    this.prof_serv.GetProfAll().then((cpt) => {
      this.ListeProf = cpt;      
        this.action = $localize`Récupérer les adhérents`;
        this.ridersService.GetAdherentAdhesion(this.store.saison_active().id).then((adhs) => {
          this.liste_adherents_VM = adhs;
          this.loading = false;
        }).catch((error: HttpErrorResponse) => {
          let n = errorService.CreateError(this.action, error);
          errorService.emitChange(n);
          this.loading = false;
        });
          }).catch((error: HttpErrorResponse) => {
          let n = errorService.CreateError(this.action, error);
          errorService.emitChange(n);
          this.loading = false;
        });
    
  }
  calculateAge(dateNaissance: Date): number {
    const today = new Date();
    const birthDate = new Date(dateNaissance);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  Creer() {
    if (this.thisAdherent) {
      this.thisProf = new Professeur_VM();
      this.thisProf.person  = this.thisAdherent;
      this.creer = true;
      this.id = this.thisAdherent.id;

    }
  }
  Read(prof: Professeur_VM) {
    this.id = prof.person.id;
    this.ChargerProf();
  }
  Register() {
    this.newContrat = {
      type_contrat: '',
      type_remuneration: '',
      saison_id: this.store.saison_active().id,
      date_debut: this.store.saison_active().date_debut,
      date_fin: null
    };
  }
  RemoveRegister(adh: Professeur_VM, saison_id: number) {
       let pss: ProfSaisonVM = {
      saison_id: saison_id,
      prof_id: adh.person.id
    }
    const errorService = ErrorService.instance;
    this.action = $localize`Supprimer un professeur sur une saison`;

    this.prof_serv.DeleteSaison(pss).then((retour) => {
      if (retour) {
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
  isRegistred(adh: Professeur_VM): boolean {
    if(adh.contrats && adh.contrats.length>0){
    return adh.contrats.filter(x => x.saison_id == this.active_saison.id).length > 0;
  } 
  return false;
  }

  nom_saison(id: number): string {
    return this.liste_saison.filter(x => x.id == id)[0].nom;
  }

 

SaveContrat() {
  this.contratError = null;

  // Validations simples
  if (!this.thisProf?.person.id || this.thisProf.person.id < 1) {
    this.contratError = $localize`Sauvegarde d’abord le professeur.`;
    return;
  }
  if (!this.newContrat.saison_id) {
    this.contratError = $localize`Choisis une saison.`;
    return;
  } 
  if (!this.newContrat.date_debut) {
    this.contratError = $localize`La date de début est requise.`;
    return;
  }
     const errorService = ErrorService.instance;
if(this.thisProf.contrats && this.thisProf.contrats.filter(x => x.saison_id == this.newContrat.saison_id).length>0){
        this.action = $localize`Mettre à jour un contrat`;
this.prof_serv.UpdateContrat(this.newContrat, this.thisProf.person.id).then((created:boolean) => {
    // Ajout optimiste à l’écran (adapte selon ce que renvoie l’API)
    if(created) {
      let o = errorService.OKMessage(this.action);
      errorService.emitChange(o);
    this.newContrat = null;
    } else {
      let o = errorService.UnknownError(this.action);
      errorService.emitChange(o);
    }
    // reset form
  }).catch(err => {
    console.error(err);
    this.contratError = $localize`Impossible d’ajouter le contrat.`;
  });
} else {
    this.action = $localize`Ajouter un contrat`;
  this.prof_serv.AddContrat(this.newContrat, this.thisProf.person.id).then((created:boolean) => {
    // Ajout optimiste à l’écran (adapte selon ce que renvoie l’API)
    if(created) {
      let o = errorService.OKMessage(this.action);
      errorService.emitChange(o);
    this.thisProf.contrats = this.thisProf.contrats || [];
    this.thisProf.contrats.push(this.newContrat);
    this.newContrat = null;
    } else {
      let o = errorService.UnknownError(this.action);
      errorService.emitChange(o);
    }
    // reset form
  }).catch(err => {
    console.error(err);
    this.contratError = $localize`Impossible d’ajouter le contrat.`;
  });
}
}



  ChargerProf() {
    this.thisProf = null;
    const errorService = ErrorService.instance;
    this.action = $localize`Récupérer le professeur`;
    
      this.prof_serv.Get(this.id).then((pf) => {
        console.log(pf);
        this.thisProf = pf;
        this.loading = false;
       
      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        this.router.navigate(['/menu']);
            this.store.updateSelectedMenu("MENU");
        this.loading = false;
        return;
      })

  }

  Delete(pf: Professeur_VM) {
    const errorService = ErrorService.instance;
    this.action = $localize`Supprimer le professeur`;
    let confirm = window.confirm($localize`Voulez-vous supprimer le professeur ?`);
    if (confirm) {
      this.prof_serv.Delete(pf.person.id).then((retour) => {
        if (retour) {
          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
          this.UpdateListeProf();
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

  Save() {
    const errorService = ErrorService.instance;
    this.action = $localize`Sauvegarder l'adhérent`;
    if (this.creer) {
      this.prof_serv.Add(this.thisProf).then((retour) => {
        if(retour){
          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
        } else {let o = errorService.UnknownError(this.action);
          errorService.emitChange(o);
        }
      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      })
    } else {
      this.prof_serv.Update(this.thisProf).then(() => {
          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      })
    }

  }


  Retour(): void {

    let confirm = window.confirm($localize`Vous perdrez les modifications réalisées non sauvegardées, voulez-vous continuer ?`);
    if (confirm) {     
        this.UpdateListeProf();
      } 
    }

  Sort(sens: "NO" | "ASC" | "DESC", champ: string) {
    switch (champ) {
      case "nom":
        this.sort_nom = sens;
        this.sort_date = "NO";
        this.sort_sexe = "NO";
        this.liste_adherents_VM.sort((a, b) => {
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
      case "sexe":
        this.sort_sexe = sens;
        this.sort_date = "NO";
        this.sort_nom = "NO";
        this.liste_adherents_VM.sort((a, b) => {
          const lieuA = a.sexe;
          const lieuB = b.sexe;


          let comparaison = 0;
          if (lieuA > lieuB) {
            comparaison = 1;
          } else if (lieuA < lieuB) {
            comparaison = -1;
          }

          return this.sort_sexe === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
        });
        break;
      case "date":
        this.sort_sexe = "NO";
        this.sort_date = sens;
        this.sort_nom = "NO";
        this.liste_adherents_VM.sort((a, b) => {
          let dateA = a.date_naissance;
          let dateB = b.date_naissance;

          let comparaison = 0;
          if (dateA > dateB) {
            comparaison = 1;
          } else if (dateA < dateB) {
            comparaison = -1;
          }

          return this.sort_date === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
        });
        break;

    }


  }


  isRegistredSaison(saison_id: number) {
    return true;
  }
  VoirFactures(){}
  
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

