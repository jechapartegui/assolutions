import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FilterAdherent } from '../adherent/adherent.component';
import { Adherent } from '../../class/adherent';
import { Professeur, professeur, prof_saison } from '../../class/professeur';
import { Saison } from '../../class/saison';
import { AdherentService } from '../../services/adherent.service';
import { ErrorService } from '../../services/error.service';
import { GlobalService } from '../../services/global.services';
import { ProfesseurService } from '../../services/professeur.service';
import { SaisonService } from '../../services/saison.service';

@Component({
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
  public ListeProf: Professeur[];
  public loading:boolean=false;
  @Input() public context: "LECTURE" | "LISTE" | "ECRITURE" = "LISTE";
  @Input() public id: number;
  public thisProf: Professeur = null;
  public thisAdherent: Adherent = null;
  public inscrits: number = null;
  public afficher_filtre: boolean = false;
    public histo_prof: string;
    @ViewChild('scrollableContent', { static: false })
    scrollableContent!: ElementRef;
    showScrollToTop: boolean = false;
  public liste_saison: Saison[] = [];
  public active_saison: Saison;
  public liste_adherents_VM: Adherent[] = [];
  public sort_nom = "NO";
  public sort_date = "NO";
  public sort_sexe = "NO";
  public filters:FilterAdherent = new FilterAdherent();
  public selected_filter:string;
  
  public creer:boolean;

  public login_adherent: string = "";
  public existing_login: boolean;

  public modal: boolean = false;
  public libelle_inscription = $localize`Inscrire`;
  public libelle_inscription_avec_paiement = $localize`Saisir inscription et paiement`;
  public libelle_retirer_inscription = $localize`Retirer l'inscription`;

  constructor(private prof_serv: ProfesseurService, private router: Router, public GlobalService: GlobalService, private saisonserv: SaisonService, private ridersService: AdherentService, private route: ActivatedRoute) {

  }

  ngOnInit(): void {

    const errorService = ErrorService.instance;
    this.action = $localize`Charger les professeurs`;
    this.loading = true;
    if (GlobalService.is_logged_in) {
      if ((GlobalService.menu === "APPLI")) {
        this.router.navigate(['/menu']);
        this.loading = false;
        return;
      }
      // Chargez la liste des cours

      this.saisonserv.GetAll().then((sa) => {
        if (sa.length == 0) {
          let o = errorService.CreateError($localize`Récupérer les saisons`, $localize`Il faut au moins une saison pour créer un cours`);
          errorService.emitChange(o);
          if (GlobalService.menu === "ADMIN") {
            this.router.navigate(['/saison']);
            this.loading = false;

          } else {
            this.router.navigate(['/menu']);
            GlobalService.selected_menu = "MENU";
            this.loading = false;
          }
          return;
        }
        this.liste_saison = sa.map(x => new Saison(x));
        this.active_saison = this.liste_saison.filter(x => x.active == true)[0];
        this.route.queryParams.subscribe(params => {
          if ('id' in params) {
            this.id = params['id'];
            this.context = "LECTURE";
          }
          if ('context' in params) {
            this.context = params['context'];

          }
        })
        if (this.context == "ECRITURE" || this.context == "LECTURE") {
          if (this.id == 0) {
            this.context = "LISTE";
            if (this.id > 0) {
              this.ChargerProf();

            }

          }
        }
        if (this.context == "LISTE") {
          this.inscrits = this.active_saison.id;
          this.afficher_filtre = false;
          this.UpdateListeProf();

        }

        let o = errorService.OKMessage(this.action);
        errorService.emitChange(o);
      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError($localize`récupérer les saisons`, err.message);
        errorService.emitChange(o);
        this.router.navigate(['/menu']);
        GlobalService.selected_menu = "MENU";
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
      this.ListeProf = cpt.map(x => new Professeur(x));
     
      this.action = $localize`Récupérer les adhérents`;
      this.ridersService.GetAllActiveSaison().then((adhs) => {
        this.liste_adherents_VM = adhs.map(x => new Adherent(x));
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
  calculateAge(dateNaissance: string): number {
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
      let prof = new professeur();
      this.thisProf = new Professeur(prof);
      this.thisProf.ID = this.thisAdherent.ID;
      this.thisProf.Prenom = this.thisAdherent.Prenom;
      this.thisProf.Nom = this.thisAdherent.Nom;
      this.thisProf.Surnom = this.thisAdherent.Surnom;
      this.thisProf.Adresse = this.thisAdherent.Adresse;
      this.thisProf.Contacts = this.thisAdherent.Contacts;
      this.thisProf.Sexe = this.thisAdherent.Sexe;
      this.thisProf.DDN = this.thisAdherent.DDN;
      this.context = "ECRITURE";
      this.creer = true;
      this.id = this.thisAdherent.ID;

    }
  }
  Edit(prof: Professeur) {
    this.context = "ECRITURE";
    this.id = prof.ID;
    this.creer =false;
    this.ChargerProf();
  }
  Read(prof: Professeur) {
    this.context = "LECTURE";
    this.id = prof.ID;
    this.ChargerProf();
  }
  Register(adh: Professeur, saison_id: number, taux_horaire: number) {
    const errorService = ErrorService.instance;
    this.action = $localize`Déclarer en tant que professeur`;
    let pss: prof_saison = {
      saison_id: saison_id,
      rider_id: adh.ID,
      taux_horaire: taux_horaire
    }

    this.prof_serv.AddSaison(pss).then((retour) => {
      if (retour) {
        adh.saisons.push(pss);
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
  RemoveRegister(adh: Professeur, saison_id: number) {
    let pss: prof_saison = {
      saison_id: saison_id,
      rider_id: adh.ID,
      taux_horaire: 0
    }
    const errorService = ErrorService.instance;
    this.action = $localize`Supprimer un professeur sur une saison`;

    this.prof_serv.DeleteSaison(pss).then((retour) => {
      if (retour) {
        let o = errorService.OKMessage(this.action);
        errorService.emitChange(o);
        this.thisAdherent.Adhesions = this.thisAdherent.Adhesions.filter(x => x.saison_id !== saison_id);
      } else {
        let o = errorService.UnknownError(this.action);
        errorService.emitChange(o);
      }

    }).catch((err: HttpErrorResponse) => {
      let o = errorService.CreateError(this.action, err.message);
      errorService.emitChange(o);
    })
  }
  isRegistred(adh: Professeur): boolean {
    if (adh.saisons.filter(x => x.saison_id == this.active_saison.id).length > 0) {
      return true;
    } else {
      return false;
    }
  }

  getSaison(id: number): string {
    return this.liste_saison.filter(x => x.id == id)[0].nom;
  }

  ChargerProf() {
    this.thisProf = null;
    const errorService = ErrorService.instance;
    this.action = $localize`Récupérer le prof`;
    
      this.prof_serv.Get(this.id).then((pf) => {
        this.thisProf = new Professeur(pf);
        this.loading = false;
       
      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        this.router.navigate(['/menu']);
        GlobalService.selected_menu = "MENU";
        this.loading = false;
        return;
      })

  }

  Delete(pf: Professeur) {
    const errorService = ErrorService.instance;
    this.action = $localize`Supprimer le professeur`;
    let confirm = window.confirm($localize`Voulez-vous supprimer le professeur ?`);
    if (confirm) {
      pf.saisons.forEach((ss) => {
        ss.rider_id = pf.ID;
        this.prof_serv.DeleteSaison(ss);
      })    
      this.prof_serv.Delete(pf.ID).then((retour) => {
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
      this.prof_serv.Add(this.thisProf.datasource).then((retour) => {
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
      this.prof_serv.Update(this.thisProf.datasource).then((retour) => {
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

  }


  Retour(lieu: "LISTE" | "LECTURE"): void {

    let confirm = window.confirm($localize`Vous perdrez les modifications réalisées non sauvegardées, voulez-vous continuer ?`);
    if (confirm) {
      if (lieu == "LISTE") {
        this.context = "LISTE";
        this.UpdateListeProf();
      } else {
        this.context = "LECTURE";
        this.ChargerProf();
      }
    }
  }

  Sort(sens: "NO" | "ASC" | "DESC", champ: string) {
    switch (champ) {
      case "nom":
        this.sort_nom = sens;
        this.sort_date = "NO";
        this.sort_sexe = "NO";
        this.liste_adherents_VM.sort((a, b) => {
          const nomA = a.Libelle.toUpperCase(); // Ignore la casse lors du tri
          const nomB = b.Libelle.toUpperCase();
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
          const lieuA = a.Sexe;
          const lieuB = b.Sexe;


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
          let dateA = a.DDN;
          let dateB = b.DDN;

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
    let u = this.thisProf.saisons.find(x => x.saison_id == saison_id);
    if (u) {
      return true;
    } else {
      return false;
    }
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

