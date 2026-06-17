import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  calculerHeureFin as calculerHeureFinUtil,
  MesSeances_VM,
} from '@shared/index';

import { AdherentMenu } from '../../class/adherent-menu';
import { ErrorService } from '../../services/error.service';
import { MenuStore } from '../../store/menu.store';
import { AppStore } from '../app.store';

type DeclarationKind = 'present' | 'absent' | 'none' | 'essai' | 'convoque';
type RealPresenceKind = 'present' | 'absent' | 'none';

type DashboardStats = {
  total: number;
  prevues: number;
  realisees: number;
  annulees: number;
  passees: number;
  futures: number;

  declarePresent: number;
  declareAbsent: number;
  declareEssai: number;
  declareConvoque: number;
  declareNone: number;

  realPresent: number;
  realAbsent: number;
  realNone: number;

  todoDeclaration: number;
  tauxDeclaration: number;
  tauxPresenceReelle: number;
};

type DashboardGroup = DashboardStats & {
  key: string;
  label: string;
  typeLabel: string;
  items: MesSeances_VM[];
  nextItem: MesSeances_VM | null;
  lastItem: MesSeances_VM | null;
};

type DashboardBreakdown = {
  label: string;
  count: number;
  percent: number;
};

type DashboardVm = {
  stats: DashboardStats;
  groups: DashboardGroup[];
  byType: DashboardBreakdown[];
  byStatus: DashboardBreakdown[];
  byDeclaration: DashboardBreakdown[];
  byLieu: DashboardBreakdown[];
  todoItems: MesSeances_VM[];
  upcomingItems: MesSeances_VM[];
  recentItems: MesSeances_VM[];
  allItems: MesSeances_VM[];
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

  private dashboardCache = new WeakMap<
    AdherentMenu,
    { signature: string; dashboard: DashboardVm }
  >();

  private readonly boundOnContentScroll = this.onContentScroll.bind(this);

  constructor(
    public readonly store: AppStore,
    public readonly cdr: ChangeDetectorRef,
    private readonly router: Router,
    public readonly menuStore: MenuStore,
  ) {}

  get Riders(): AdherentMenu[] {
    return this.menuStore.vm().riders ?? [];
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

      if (this.Riders.length && !this.hasOpenedRider()) {
        this.Riders[0].afficher = true;
      }
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
    this.scrollableContent?.nativeElement.removeEventListener(
      'scroll',
      this.boundOnContentScroll,
    );
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
    this.dashboardCache = new WeakMap<
      AdherentMenu,
      { signature: string; dashboard: DashboardVm }
    >();

    if (this.Riders.length && !this.hasOpenedRider()) {
      this.Riders[0].afficher = true;
    }

    this.cdr.detectChanges();
    setTimeout(() => this.bindScrollContainer());
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

  getDashboard(rider: AdherentMenu): DashboardVm {
    const signature = this.getDashboardSignature(rider);
    const cached = this.dashboardCache.get(rider);

    if (cached?.signature === signature) {
      return cached.dashboard;
    }

    const allItems = [...(rider.MesSeances ?? [])].sort((a, b) =>
      this.compareSeanceDate(a, b),
    );

    const stats = this.createEmptyStats();
    const groupsByCours = new Map<string, DashboardGroup>();
    const byTypeMap = new Map<string, number>();
    const byStatusMap = new Map<string, number>();
    const byDeclarationMap = new Map<string, number>();
    const byLieuMap = new Map<string, number>();

    const todoItems: MesSeances_VM[] = [];
    const upcomingItems: MesSeances_VM[] = [];
    const recentItems: MesSeances_VM[] = [];

    const now = Date.now();

    for (const ms of allItems) {
      this.incrementStats(stats, ms);

      const typeLabel = this.getSeanceTypeLabel(ms);
      const statusLabel = this.getSeanceStatusLabel(ms);
      const declarationLabel = this.getDeclarationLabel(ms);
      const lieuLabel = this.getLieuLabel(ms);

      this.incrementMap(byTypeMap, typeLabel);
      this.incrementMap(byStatusMap, statusLabel);
      this.incrementMap(byDeclarationMap, declarationLabel);
      this.incrementMap(byLieuMap, lieuLabel);

      const coursKey = this.getCoursLabel(ms);
      const group = groupsByCours.get(coursKey) ?? this.createEmptyGroup(coursKey, typeLabel);
      group.items.push(ms);
      this.incrementStats(group, ms);
      groupsByCours.set(coursKey, group);

      const ts = this.getSeanceTimestamp(ms);
      const statut = this.getSeanceStatus(ms);

      if (this.isTodoDeclaration(ms)) {
        todoItems.push(ms);
      }

      if (ts >= now && statut !== 'annulée') {
        upcomingItems.push(ms);
      }

      if (ts < now && statut !== 'annulée') {
        recentItems.push(ms);
      }
    }

    this.finalizeStats(stats);

    const groups = Array.from(groupsByCours.values())
      .map((g) => {
        g.items = [...g.items].sort((a, b) => this.compareSeanceDate(a, b));
        g.nextItem = this.findNextItem(g.items);
        g.lastItem = this.findLastItem(g.items);
        this.finalizeStats(g);
        return g;
      })
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

    const dashboard: DashboardVm = {
      stats,
      groups,
      byType: this.mapToBreakdown(byTypeMap, stats.total),
      byStatus: this.mapToBreakdown(byStatusMap, stats.total),
      byDeclaration: this.mapToBreakdown(byDeclarationMap, stats.total),
      byLieu: this.mapToBreakdown(byLieuMap, stats.total),
      todoItems: todoItems.sort((a, b) => this.compareSeanceDate(a, b)),
      upcomingItems: upcomingItems.sort((a, b) => this.compareSeanceDate(a, b)).slice(0, 8),
      recentItems: recentItems.sort((a, b) => this.compareSeanceDate(b, a)).slice(0, 8),
      allItems,
    };

    this.dashboardCache.set(rider, { signature, dashboard });
    return dashboard;
  }

  private createEmptyStats(): DashboardStats {
    return {
      total: 0,
      prevues: 0,
      realisees: 0,
      annulees: 0,
      passees: 0,
      futures: 0,

      declarePresent: 0,
      declareAbsent: 0,
      declareEssai: 0,
      declareConvoque: 0,
      declareNone: 0,

      realPresent: 0,
      realAbsent: 0,
      realNone: 0,

      todoDeclaration: 0,
      tauxDeclaration: 0,
      tauxPresenceReelle: 0,
    };
  }

  private createEmptyGroup(label: string, typeLabel: string): DashboardGroup {
    return {
      ...this.createEmptyStats(),
      key: label,
      label,
      typeLabel,
      items: [],
      nextItem: null,
      lastItem: null,
    };
  }

  private incrementStats(stats: DashboardStats, ms: MesSeances_VM): void {
    stats.total++;

    const statut = this.getSeanceStatus(ms);
    const ts = this.getSeanceTimestamp(ms);
    const now = Date.now();

    if (statut === 'prévue') stats.prevues++;
    if (statut === 'réalisée') stats.realisees++;
    if (statut === 'annulée') stats.annulees++;

    if (ts < now) stats.passees++;
    if (ts >= now) stats.futures++;

    const declaration = this.getDeclarationKind(ms);

    if (declaration === 'present') stats.declarePresent++;
    else if (declaration === 'absent') stats.declareAbsent++;
    else if (declaration === 'essai') stats.declareEssai++;
    else if (declaration === 'convoque') stats.declareConvoque++;
    else stats.declareNone++;

    const real = this.getRealPresenceKind(ms);

    if (real === 'present') stats.realPresent++;
    else if (real === 'absent') stats.realAbsent++;
    else stats.realNone++;

    if (this.isTodoDeclaration(ms)) {
      stats.todoDeclaration++;
    }
  }

  private finalizeStats(stats: DashboardStats): void {
    const declared =
      stats.declarePresent +
      stats.declareAbsent +
      stats.declareEssai +
      stats.declareConvoque;

    stats.tauxDeclaration = stats.total > 0 ? Math.round((declared / stats.total) * 100) : 0;

    const realTotal = stats.realPresent + stats.realAbsent;
    stats.tauxPresenceReelle =
      realTotal > 0 ? Math.round((stats.realPresent / realTotal) * 100) : 0;
  }

  private getDashboardSignature(rider: AdherentMenu): string {
    return JSON.stringify({
      id: rider.id,
      profil: rider.profil,
      seances: (rider.MesSeances ?? []).map((ms) => {
        const s: any = ms.seance ?? {};
        return [
          s.id,
          s.nom,
          s.cours_nom,
          s.type_seance,
          s.statut,
          s.date_seance,
          s.heure_debut,
          s.duree_seance,
          s.lieu_id,
          s.lieu_nom,
          ms.statutInscription,
          (ms as any).statutPrésence,
          (ms as any).statutPresence,
          (ms as any).statut_presence,
        ].join('|');
      }),
    });
  }

  private incrementMap(map: Map<string, number>, key: string): void {
    map.set(key, (map.get(key) ?? 0) + 1);
  }

  private mapToBreakdown(map: Map<string, number>, total: number): DashboardBreakdown[] {
    return Array.from(map.entries())
      .map(([label, count]) => ({
        label,
        count,
        percent: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'fr'));
  }

  private findNextItem(items: MesSeances_VM[]): MesSeances_VM | null {
    const now = Date.now();
    return (
      items
        .filter((ms) => this.getSeanceTimestamp(ms) >= now && this.getSeanceStatus(ms) !== 'annulée')
        .sort((a, b) => this.compareSeanceDate(a, b))[0] ?? null
    );
  }

  private findLastItem(items: MesSeances_VM[]): MesSeances_VM | null {
    const now = Date.now();
    return (
      items
        .filter((ms) => this.getSeanceTimestamp(ms) < now && this.getSeanceStatus(ms) !== 'annulée')
        .sort((a, b) => this.compareSeanceDate(b, a))[0] ?? null
    );
  }

  isTodoDeclaration(ms: MesSeances_VM): boolean {
    const statut = this.getSeanceStatus(ms);
    const ts = this.getSeanceTimestamp(ms);

    if (statut === 'annulée' || statut === 'réalisée') {
      return false;
    }

    if (ts < Date.now()) {
      return false;
    }

    const declaration = this.getDeclarationKind(ms);
    return declaration === 'none' || declaration === 'convoque';
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
    this.router.navigate(['/ma-seance'], {
      queryParams: { id: seance?.id ?? seance?.seance_id },
    });
  }

  getCoursLabel(ms: MesSeances_VM): string {
    const seance: any = ms.seance ?? {};
    return seance.cours_nom || seance.nom || $localize`Cours non renseigné`;
  }

  getSeanceName(ms: MesSeances_VM): string {
    const seance: any = ms.seance ?? {};
    return seance.nom || seance.cours_nom || $localize`Séance`;
  }

  getLieuLabel(ms: MesSeances_VM): string {
    const seance: any = ms.seance ?? {};
    return seance.lieu_nom || $localize`Lieu non renseigné`;
  }

  getSeanceTypeLabel(ms: MesSeances_VM): string {
    const type = ((ms.seance as any)?.type_seance ?? '').toString();

    switch (type) {
      case 'ENTRAINEMENT':
        return $localize`Cours`;
      case 'MATCH':
        return $localize`Match`;
      case 'EVENEMENT':
        return $localize`Événement`;
      case 'SORTIE':
        return $localize`Sortie`;
      default:
        return type || $localize`Type non renseigné`;
    }
  }

  getSeanceTypeIcon(ms: MesSeances_VM): string {
    const type = ((ms.seance as any)?.type_seance ?? '').toString();

    switch (type) {
      case 'ENTRAINEMENT':
        return 'fas fa-dumbbell';
      case 'MATCH':
        return 'fas fa-futbol';
      case 'EVENEMENT':
        return 'fas fa-star';
      case 'SORTIE':
        return 'fas fa-hiking';
      default:
        return 'fas fa-calendar';
    }
  }

  getSeanceStatus(ms: MesSeances_VM): string {
    return ((ms.seance as any)?.statut ?? '').toString() || 'prévue';
  }

  getSeanceStatusLabel(ms: MesSeances_VM): string {
    const statut = this.getSeanceStatus(ms);

    if (statut === 'prévue') return $localize`Prévue`;
    if (statut === 'réalisée') return $localize`Réalisée`;
    if (statut === 'annulée') return $localize`Annulée`;

    return statut || $localize`Non renseigné`;
  }

  getDeclarationKind(ms: MesSeances_VM): DeclarationKind {
    const statut = (ms.statutInscription ?? '').toString();

    if (statut === 'présent') return 'present';
    if (statut === 'absent') return 'absent';
    if (statut === 'essai') return 'essai';
    if (statut === 'convoqué') return 'convoque';

    return 'none';
  }

  getDeclarationLabel(ms: MesSeances_VM): string {
    const declaration = this.getDeclarationKind(ms);

    if (declaration === 'present') return $localize`Présence déclarée`;
    if (declaration === 'absent') return $localize`Absence déclarée`;
    if (declaration === 'essai') return $localize`Essai`;
    if (declaration === 'convoque') return $localize`Convoqué`;

    return $localize`Non déclaré`;
  }

  getDeclarationIcon(ms: MesSeances_VM): string {
    const declaration = this.getDeclarationKind(ms);

    if (declaration === 'present' || declaration === 'essai') return 'fas fa-thumbs-up has-text-success';
    if (declaration === 'absent') return 'fas fa-thumbs-down has-text-danger';
    if (declaration === 'convoque') return 'fas fa-bell has-text-warning';

    return 'fas fa-question has-text-info';
  }

  getRealPresenceKind(ms: MesSeances_VM): RealPresenceKind {
    const statut =
      (ms as any).statutPrésence ??
      (ms as any).statutPresence ??
      (ms as any).statut_presence ??
      (ms as any).presence ??
      null;

    if (statut === 'présent' || statut === true) return 'present';
    if (statut === 'absent' || statut === false) return 'absent';

    return 'none';
  }

  getRealPresenceLabel(ms: MesSeances_VM): string {
    const real = this.getRealPresenceKind(ms);

    if (real === 'present') return $localize`Présent`;
    if (real === 'absent') return $localize`Absent`;

    return $localize`Non renseigné`;
  }

  getRealPresenceIcon(ms: MesSeances_VM): string {
    const real = this.getRealPresenceKind(ms);

    if (real === 'present') return 'fas fa-thumbs-up has-text-success';
    if (real === 'absent') return 'fas fa-thumbs-down has-text-danger';

    return 'fas fa-minus has-text-grey';
  }

  percent(value: number): string {
    return `${Number.isFinite(value) ? value : 0} %`;
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