import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { MultifiltersAdherentPipe } from '../../../filters/multifilters-adherent.pipe';
import { ErrorService } from '../../../services/error.service';
import { AdherentStore } from '../../../store/adherent.store';
import { AppStore } from '../../app.store';

@Component({
  standalone: false,
  selector: 'app-adherent',
  templateUrl: './adherent.component.html',
  styleUrls: ['./adherent.component.css'],
  providers: [MultifiltersAdherentPipe],
})
export class AdherentComponent implements OnInit {
  constructor(
    public readonly store: AppStore,
    public readonly adherentStore: AdherentStore,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  get vm() {
    return this.adherentStore.vm();
  }

  get context(): string {
    return this.route.snapshot.queryParamMap.get('context') ?? '';
  }

  get returnUrl(): string {
    return this.route.snapshot.queryParamMap.get('returnUrl') ?? '';
  }

  get isMonCompteContext(): boolean {
    return this.context === 'MON_COMPTE';
  }

  get isAdmin(): boolean {
    return this.store.mode?.() === 'ADMIN';
  }

  get canShowAdherentList(): boolean {
    return (
      this.store.isLoggedIn() &&
      this.store.hasProjet() &&
      this.store.isProf() &&
      !this.isMonCompteContext
    );
  }

  get hasRefreshAvailable(): boolean {
    return !this.isMonCompteContext && !!this.vm.refreshAvailable;
  }

  get pendingCountLabel(): string {
    const count = this.vm.pendingCount ?? 0;
    if (count <= 0) return '';
    return count === 1 ? '1 nouveauté' : `${count} nouveautés`;
  }

  async ngOnInit(): Promise<void> {
    const errorService = ErrorService.instance;

    if (!this.store.isLoggedIn()) {
      errorService.emitChange(
        errorService.CreateError(
          $localize`Charger les adhérents`,
          $localize`Accès impossible, vous n'êtes pas connecté`,
        ),
      );
      await this.router.navigate(['/login']);
      return;
    }

    this.route.queryParams.subscribe(async (params) => {
      try {
        const saisonId = this.resolveConsultedSeasonId(params['saisonId']);
        const context = params['context'];
        const action = params['action'];
        const rawId = params['id'];
        const id = rawId ? Number(rawId) : 0;

        if (context === 'MON_COMPTE') {
          await this.loadMonCompteMode(action, id, this.activeSeasonId());
          return;
        }

        if (!this.store.isProf()) {
          await this.router.navigate(['/mon-compte']);
          return;
        }

        await this.adherentStore.init(saisonId);
        if (id > 0) await this.adherentStore.openAdherent(id, saisonId);
      } catch (err: any) {
        errorService.emitChange(
          errorService.CreateError(
            $localize`Charger les adhérents`,
            err?.message ?? $localize`Erreur inconnue`,
          ),
        );
      }
    });
  }

  private async loadMonCompteMode(
    action: string | undefined,
    id: number,
    saisonId: number,
  ): Promise<void> {
    if (action === 'CREATE') {
      await this.adherentStore.initMonCompteCreate(saisonId);
      return;
    }

    if (!id || id <= 0) {
      await this.router.navigate(['/login']);
      return;
    }

    await this.adherentStore.openMonCompteAdherent(id, saisonId);
  }

  async onRefreshNow(): Promise<void> {
    if (this.isMonCompteContext) return;
    try {
      await this.adherentStore.refreshNow(this.consultedSeasonId());
    } catch (err: any) {
      ErrorService.instance.emitChange(
        ErrorService.instance.CreateError(
          $localize`Actualiser les adhérents`,
          err?.message ?? $localize`Erreur inconnue`,
        ),
      );
    }
  }

  onApplyRefresh(): void {
    if (!this.isMonCompteContext) this.adherentStore.applyRefresh();
  }

  async onOpen(id: number): Promise<void> {
    await this.adherentStore.openAdherent(id, this.consultedSeasonId());
  }

  onCreate(): void {
    this.adherentStore.createEmpty();
  }

  async onEditorBack(): Promise<void> {
    this.adherentStore.closeDetail();

    if (this.returnUrl) {
      await this.router.navigateByUrl(this.returnUrl);
      return;
    }

    if (this.isMonCompteContext || !this.store.isProf()) {
      await this.router.navigate(['/mon-compte']);
      return;
    }

    await this.adherentStore.refreshNow(this.consultedSeasonId());
  }

  async onBackToList(): Promise<void> {
    this.adherentStore.closeDetail();
    if (this.returnUrl) {
      await this.router.navigateByUrl(this.returnUrl);
      return;
    }
    await this.adherentStore.refreshNow(this.consultedSeasonId());
  }

  private resolveConsultedSeasonId(raw?: string | number | null): number {
    const requested = Number(raw);
    if (Number.isInteger(requested) && requested > 0) {
      this.store.setConsultationSaison(
        requested === this.activeSeasonId() ? null : requested,
      );
      return requested;
    }
    return this.consultedSeasonId();
  }

  private consultedSeasonId(): number {
    return Number(this.store.saison_consultation_id() ?? this.activeSeasonId());
  }

  private activeSeasonId(): number {
    return Number(this.store.saison_active_id() ?? 0);
  }
}
