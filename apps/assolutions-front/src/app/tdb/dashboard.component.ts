import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ErrorService } from '../../services/error.service';
import { GlobalService } from '../../services/global.services';
import { MaSeanceNestService } from '../../services/ma-seance.nest.service';
import { ProfesseurService } from '../../services/professeur.service';
import { LieuNestService } from '../../services/lieu.nest.service';
import { CoursService } from '../../services/cours.service';
import { AdherentService } from '../../services/adherent.service';
import { MultifiltersMenuPipe } from '../../filters/multifilters-menu.pipe';
import { AppStore } from '../app.store';

import {
  AdherentSeance_VM,
  MesSeances_VM,
  Seance_VM,
  StatutSeance,
  calculerHeureFin,
} from '@shared/lib/seance.interface';
import { Professeur_VM } from '@shared/lib/prof.interface';
import { Lieu_VM } from '@shared/lib/lieu.interface';
import { Cours_VM } from '@shared/lib/cours.interface';
import { KeyValuePair } from '@shared/lib/autres.interface';
import { AdherentMenu } from '../../class/adherent-menu';

@Component({
  standalone: false,
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['../menu/menu.component.css'], // on réutilise le CSS du Menu
})
export class DashboardComponent implements OnInit {
  action: string;
  loading = false;

  Riders: AdherentMenu[] = [];
  listeprof: Professeur_VM[] = [];
  listelieu: Lieu_VM[] = [];
  listeCours: Cours_VM[] = [];

  public liste_prof_filter: KeyValuePair[] = [];
  public liste_lieu_filter: string[] = [];

  @ViewChild('scrollableContent', { static: false }) scrollableContent!: ElementRef;
  showScrollToTop = false;

  constructor(
    public cdr: ChangeDetectorRef,
    public GlobalService: GlobalService,
    public store: AppStore,
    private router: Router,
    private prof_serv: ProfesseurService,
    private lieuserv: LieuNestService,
    private coursservice: CoursService,
    private ma_seance_serv: MaSeanceNestService,
    private riderservice: AdherentService,
    private multifilters: MultifiltersMenuPipe
  ) {}

  async ngOnInit(): Promise<void> {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger le tableau de bord`;
    this.loading = true;

    try {
      if (!this.store.isLoggedIn) {
        const o = errorService.CreateError(this.action, $localize`Accès impossible, vous n'êtes pas connecté`);
        errorService.emitChange(o);
        this.store.logout();
        this.router.navigate(['/login']);
        return;
      }

      const today = new Date();
      const start = new Date(this.store.saison_active().date_debut);
      start.setMonth(today.getMonth() - 12); // par défaut : 2 mois en arrière
      const end = new Date(today);

      // Adhérents
      if (this.store.selectedProject().adherent || this.store.selectedProject().essai) {
        const seancesAdh = await this.GetMySeances();
        const ridersAdh = seancesAdh.map((x) => {
          const r = new AdherentMenu(x);
          r.profil = 'ADH';
          r.filters.filter_date_avant = start;
          r.filters.filter_date_apres = end;
          this.sortByDateHeure(r.MesSeances);
          return r;
        });
        this.Riders.push(...ridersAdh);
      }

      // Profs
      if (this.store.selectedProject().prof) {
        const seancesProf = await this.GetProfSeances();
        const ridersProf = seancesProf.map((x) => {
          const r = new AdherentMenu(x);
          r.profil = 'PROF';
          r.filters.filter_date_avant = start;
          r.filters.filter_date_apres = end;
          this.sortByDateHeure(r.MesSeances);
          return r;
        });
        this.Riders.push(...ridersProf);
      }

      // tri final par id
      this.Riders.sort((a, b) => a.id - b.id);

      // listes annexes
      const profs = await this.prof_serv.GetProf();
      this.listeprof = profs;
      this.liste_prof_filter = profs.map((p) => ({
        key: p.person.id,
        value: `${p.person.prenom} ${p.person.nom}`,
      }));

      const lieux = await this.lieuserv.GetAll();
      this.listelieu = lieux;
      this.liste_lieu_filter = lieux.map((l) => l.nom);

      this.listeCours = await this.coursservice.GetAll(this.store.saison_active().id);

      // enrichissements riders (photo + libellés cours/lieu)
      this.Riders.forEach((r) => {
        this.riderservice.GetPhoto(r.id).then((profil) => {
          r.photo = profil && profil.length > 0 ? profil : undefined;
        });

        r.MesSeances.forEach((ms) => {
          if (ms.seance.lieu_id && ms.seance.lieu_id > 0) {
            ms.seance.lieu_nom = this.trouverLieu(ms.seance.lieu_id);
          }
          if (ms.seance.cours && ms.seance.cours > 0) {
            ms.seance.cours_nom = this.trouverCours(ms.seance);
          }
        });
      });
    } catch (err: any) {
      const errorService = ErrorService.instance;
      const o =
        err instanceof HttpErrorResponse
          ? errorService.CreateError(this.action, err.message)
          : err instanceof Error
          ? errorService.CreateError(this.action, err.message)
          : err;
      errorService.emitChange(o);
      if (this.store.mode() !== 'ADMIN') {
        this.store.logout();
        this.router.navigate(['/login']);
      }
    } finally {
      this.loading = false;
    }
  }

  private sortByDateHeure(list: MesSeances_VM[]) {
    list.sort((a, b) => {
      const dateA = new Date(a.seance.date_seance);
      const [hA, mA] = a.seance.heure_debut.split(':').map(Number);
      dateA.setHours(hA, mA, 0, 0);

      const dateB = new Date(b.seance.date_seance);
      const [hB, mB] = b.seance.heure_debut.split(':').map(Number);
      dateB.setHours(hB, mB, 0, 0);

      return dateA.getTime() - dateB.getTime();
    });
  }

  // --- Récupération données (identiques à Menu)
  private async GetMySeances(): Promise<AdherentSeance_VM[]> {
    const errorService = ErrorService.instance;
    try {
      return await this.ma_seance_serv.Get();
    } catch (e: any) {
      errorService.emitChange(errorService.CreateError($localize`Se connecter`, e));
      return [];
    }
  }

  private async GetProfSeances(): Promise<AdherentSeance_VM[]> {
    const errorService = ErrorService.instance;
    try {
      return await this.ma_seance_serv.Prof();
    } catch (e: any) {
      errorService.emitChange(errorService.CreateError($localize`Se connecter`, e));
      return [];
    }
  }

  // --- Helpers UI similaires au Menu
  getLibelleProfil(p: string) {
    return p === 'ADH' ? $localize`Adhérent` : $localize`Professeur`;
  }

  calculerHeureFin(heure: string, duree: number): string {
    return calculerHeureFin(heure, duree);
  }

  trouverLieu(lieuId: number): string {
    const l = this.listelieu.find((x) => +x.id === +lieuId);
    return l ? l.nom : $localize`Lieu non trouvé`;
  }

  trouverCours(s: Seance_VM): string {
    if (s.type_seance === 'ENTRAINEMENT') {
      const c = this.listeCours.find((x) => x.id === s.cours);
      return c?.nom ?? $localize`Cours non trouvé`;
    } else {
      return s.nom
    }
  }

  getadresse(id: number): string {
    const ad = this.listelieu.find((x) => x.id == id);
    return ad ? `${ad.nom} ${ad.adresse.Street} ${ad.adresse.PostCode} ${ad.adresse.City}` : '';
  }

  copierDansPressePapier(txt: string) {
    const errorService = ErrorService.instance;
    navigator.clipboard
      .writeText(txt)
      .then(() => errorService.emitChange(errorService.OKMessage($localize`Adresse copiée :` + txt)))
      .catch(() => {});
  }

  GotoSeance(id: number) {
    this.router.navigate(['/seance'], { queryParams: { id } });
  }
  Voir(id: number) {
    this.router.navigate(['/adherent'], { queryParams: { id } });
  }
  VoirMaSeance(seance: any) {
    this.router.navigate(['/ma-seance'], { queryParams: { id: seance.seance_id } });
  }

  AfficherProfil(r: AdherentMenu) {
    for (const x of this.Riders) x.afficher = x.id === r.id && x.profil === r.profil ? !x.afficher : false;
  }


  buildGroups(rider: AdherentMenu) {

      const filtered = this.multifilters.transform(rider.MesSeances, rider.filters);
    const map = new Map<
      string,
      {
        cours: string;
        items: MesSeances_VM[];
        declare_present: number;
        declare_absent: number;
        declare_aucun: number;
        reel_present: number;
        reel_absent: number;
      }
    >();

    for (const ms of filtered) {
      const key = ms.seance.cours_nom ?? this.trouverCours(ms.seance);
      if (!map.has(key)) {
        map.set(key, {
          cours: key,
          items: [],
          declare_present: 0,
          declare_absent: 0,
          declare_aucun: 0,
          reel_present: 0,
          reel_absent: 0,
        });
      }
      const g = map.get(key)!;
      g.items.push(ms);

      // Déclaré (inscription)
      if (ms.statutInscription === 'présent' || ms.statutInscription === 'essai') g.declare_present++;
      else if (ms.statutInscription === 'absent') g.declare_absent++;
      else g.declare_aucun++;

      // Réel
      console.log('ms', ms);
      if (ms.statutPrésence === 'présent') g.reel_present++;
      else if (ms.statutPrésence === 'absent') g.reel_absent++;
    }

    // sortie triée par nom de cours
    return Array.from(map.values()).sort((a, b) => a.cours.localeCompare(b.cours));
  }
}
