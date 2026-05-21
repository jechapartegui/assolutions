import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import {
  calculerHeureFin as calculerHeureFinUtil,
  MesSeances_VM,
} from '@shared/index';

import { AdherentMenu } from '../../class/adherent-menu';
import { MultifiltersMenuPipe } from '../../filters/multifilters-menu.pipe';
import { ErrorService } from '../../services/error.service';
import { MenuStore } from '../../store/menu.store';
import { AppStore } from '../app.store';

type DashboardGroup = {
  cours: string;
  items: MesSeances_VM[];
  declare_present: number;
  declare_absent: number;
  declare_aucun: number;
  reel_present: number;
  reel_absent: number;
};

@Component({
  standalone: false,
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['../menu/menu.component.css'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  @ViewChild('scrollableContent', { static: false })
  scrollableContent?: ElementRef<HTMLElement>;

  public loading = false;
  public action = '';
  public showScrollToTop = false;

  private groupCache = new WeakMap<AdherentMenu, { signature: string; groups: DashboardGroup[] }>();
  private readonly boundOnContentScroll = this.onContentScroll.bind(this);

  constructor(
    public readonly store: AppStore,
    public readonly cdr: ChangeDetectorRef,
    private readonly router: Router,
    public readonly menuStore: MenuStore,
    private readonly multifilters: MultifiltersMenuPipe,
  ) {}

  get Riders(): AdherentMenu[] {
    return this.menuStore.vm().riders;
  }

  get listelieu(): any[] {
    return this.menuStore.vm().listelieu ?? [];
  }

  get refreshAvailable(): boolean {
    return this.menuStore.vm().refreshAvailable;
  }

  async ngOnInit(): Promise<void> {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger le tableau de bord`;

    if (this.store.mode() === 'ADMIN') {
      this.router.navigate(['/menu-admin']);
      return;
    }

    this.loading = true;

    try {
      const selectedProject = this.store.selectedProject();

      if (!selectedProject) {
        errorService.emitChange(
          errorService.CreateError(this.action, $localize`Aucun projet sélectionné`)
        );
        return;
      }

      await this.menuStore.init(
        selectedProject.id,
        this.store.saison_active_id(),
        selectedProject.rights as any,
      );
    } catch (err: any) {
      errorService.emitChange(
        errorService.CreateError(
          this.action,
          $localize`chargement du tableau de bord : ` + (err?.message ?? err)
        )
      );
    } finally {
      this.loading = false;
      window.addEventListener('resize', this.markForCheck);
      setTimeout(() => this.bindScrollContainer());
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.markForCheck);
    this.scrollableContent?.nativeElement.removeEventListener('scroll', this.boundOnContentScroll);
  }

  private readonly markForCheck = (): void => {
    this.cdr.markForCheck();
  };

  private bindScrollContainer(): void {
    const el = this.scrollableContent?.nativeElement;
    if (!el) return;

    el.removeEventListener('scroll', this.boundOnContentScroll);
    el.addEventListener('scroll', this.boundOnContentScroll);
    this.onContentScroll();
  }

  onContentScroll(): void {
    const el = this.scrollableContent?.nativeElement;
    this.showScrollToTop = !!el && (el.scrollTop || 0) > 200;
  }

  scrollToTop(): void {
    this.scrollableContent?.nativeElement.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  applyRefresh(): void {
    this.menuStore.applyRefresh();
    this.groupCache = new WeakMap<AdherentMenu, { signature: string; groups: DashboardGroup[] }>();
  }

  hasOpenedRider(): boolean {
    return this.Riders.some((x) => !!x.afficher);
  }

  AfficherProfil(rider: AdherentMenu): void {
    for (const r of this.Riders) {
      r.afficher = r.id === rider.id && r.profil === rider.profil ? !r.afficher : false;
    }

    this.cdr.detectChanges();
    setTimeout(() => this.bindScrollContainer());
  }

  getLibelleProfil(profil: string): string {
    if (profil === 'ADH') return $localize`Adhérent`;
    if (profil === 'PROF') return $localize`Professeur`;
    return profil;
  }

  getInitiales(personne: AdherentMenu): string {
    const prenom = (personne.prenom ?? '').trim();
    const nom = (personne.nom ?? '').trim();
    const surnom = (personne.surnom ?? '').trim();

    const value = `${prenom.charAt(0) || surnom.charAt(0) || ''}${nom.charAt(0) || ''}`
      .trim()
      .toUpperCase();

    return value || '?';
  }

  calculerHeureFin(heureDebut: string, duree: number): string {
    return calculerHeureFinUtil(heureDebut, duree);
  }

  getadresse(lieuId: number): string {
    const lieu = this.listelieu.find((x: any) => +x.id === +lieuId);
    if (!lieu) return '';

    if (typeof lieu.adresse === 'string') {
      return lieu.adresse;
    }

    const adresse = lieu.adresse ?? {};
    return [
      adresse.adresse1,
      adresse.adresse2,
      adresse.adresse3,
      adresse.Street,
      adresse.code_postal,
      adresse.PostCode,
      adresse.ville,
      adresse.City,
    ]
      .filter((x) => !!x)
      .join(' ');
  }

  copierDansPressePapier(texte: string): void {
    if (!texte) return;

    navigator.clipboard?.writeText(texte).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = texte;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      try {
        document.execCommand('copy');
      } finally {
        document.body.removeChild(textarea);
      }
    });
  }

  GotoSeance(seanceId: number): void {
    this.router.navigate(['/seance-edit'], { queryParams: { id: seanceId } });
  }

  Voir(personneId: number): void {
    this.router.navigate(['/adherent-edit'], { queryParams: { id: personneId } });
  }

  VoirMaSeance(seance: any): void {
    this.router.navigate(['/ma-seance'], { queryParams: { id: seance?.id ?? seance?.seance_id } });
  }

  buildGroups(rider: AdherentMenu): DashboardGroup[] {
    const signature = this.getGroupSignature(rider);
    const cached = this.groupCache.get(rider);

    if (cached?.signature === signature) {
      return cached.groups;
    }

    const filtered = this.multifilters.transform(rider.MesSeances ?? [], rider.filters) ?? [];
    const map = new Map<string, DashboardGroup>();

    for (const ms of filtered) {
      if (ms.seance?.statut && ms.seance.statut !== 'réalisée') {
        continue;
      }

      const cours = this.getCoursLabel(ms);
      const group = map.get(cours) ?? {
        cours,
        items: [],
        declare_present: 0,
        declare_absent: 0,
        declare_aucun: 0,
        reel_present: 0,
        reel_absent: 0,
      };

      group.items.push(ms);
      this.countDeclaration(group, ms);
      this.countPresenceReelle(group, ms);

      map.set(cours, group);
    }

    const groups = Array.from(map.values())
      .map((g) => ({
        ...g,
        items: g.items.sort((a, b) => this.compareSeanceDate(a, b)),
      }))
      .sort((a, b) => a.cours.localeCompare(b.cours, 'fr'));

    this.groupCache.set(rider, { signature, groups });
    return groups;
  }

  private getGroupSignature(rider: AdherentMenu): string {
    const filters = rider.filters as any;

    return JSON.stringify({
      ids: (rider.MesSeances ?? []).map((ms) => [
        ms.seance?.id,
        ms.statutInscription,
        (ms as any).statutPrésence ?? (ms as any).statutPresence ?? (ms as any).statut_presence,
      ]),
      filters: {
        nom: filters?.filter_nom ?? null,
        dateAvant: filters?.filter_date_avant ?? null,
        dateApres: filters?.filter_date_apres ?? null,
        statut: filters?.filter_statut ?? null,
        lieu: filters?.filter_lieu ?? null,
        prof: filters?.filter_prof ?? null,
        groupe: filters?.filter_groupe ?? null,
      },
    });
  }

  private getCoursLabel(ms: MesSeances_VM): string {
    const seance: any = ms.seance ?? {};
    return seance.cours_nom || seance.nom || $localize`Cours non renseigné`;
  }

  private countDeclaration(group: DashboardGroup, ms: MesSeances_VM): void {
    const statut = ms.statutInscription;

    if (statut === 'présent' || statut === 'essai') {
      group.declare_present++;
      return;
    }

    if (statut === 'absent') {
      group.declare_absent++;
      return;
    }

    group.declare_aucun++;
  }

  private countPresenceReelle(group: DashboardGroup, ms: MesSeances_VM): void {
    const statut =
      (ms as any).statutPrésence ??
      (ms as any).statutPresence ??
      (ms as any).statut_presence ??
      (ms as any).presence ??
      null;

    if (statut === 'présent' || statut === true) {
      group.reel_present++;
      return;
    }

    if (statut === 'absent' || statut === false) {
      group.reel_absent++;
    }
  }

  private compareSeanceDate(a: MesSeances_VM, b: MesSeances_VM): number {
    return this.getSeanceTimestamp(a) - this.getSeanceTimestamp(b);
  }

  private getSeanceTimestamp(ms: MesSeances_VM): number {
    const seance: any = ms.seance ?? {};
    const date = new Date(seance.date_seance ?? seance.date ?? 0);
    const [h, m] = `${seance.heure_debut ?? '00:00'}`.split(':').map(Number);

    date.setHours(h || 0, m || 0, 0, 0);
    return date.getTime();
  }
}
