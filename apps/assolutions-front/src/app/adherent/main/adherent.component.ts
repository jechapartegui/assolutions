import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ErrorService } from '../../../services/error.service';
import { AppStore } from '../../app.store';
import { MultifiltersAdherentPipe } from '../../../filters/multifilters-adherent.pipe';
import { AdherentStore } from '../../../store/adherent.store';

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
          $localize`Accès impossible, vous n'êtes pas connecté`
        )
      );
      this.router.navigate(['/login']);
      return;
    }

    this.route.queryParams.subscribe(async (params) => {
      try {
        const saisonId = this.store.saison_active_id();
        const context = params['context'];
        const action = params['action'];
        const rawId = params['id'];
        const id = rawId ? Number(rawId) : 0;
        console.log('AdherentComponent ngOnInit', { context, action, id, saisonId });
        if (context === 'MON_COMPTE' ) {
          await this.loadMonCompteMode(action, id, saisonId);
          return;
        }

        if (!this.store.isProf()) {
          this.router.navigate(['/mon-compte']);
          return;
        }

        await this.adherentStore.init(saisonId);

        if (id > 0) {
          await this.adherentStore.openAdherent(id, saisonId);
        }
      } catch (err: any) {
        errorService.emitChange(
          errorService.CreateError(
            $localize`Charger les adhérents`,
            err?.message ?? $localize`Erreur inconnue`
          )
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
      this.router.navigate(['/login']);
      return;
    }

    await this.adherentStore.openMonCompteAdherent(id, saisonId);
  }

  async onRefreshNow(): Promise<void> {
    const errorService = ErrorService.instance;

    if (this.isMonCompteContext) {
      return;
    }

    try {
      const saisonId = this.vm?.activeSaison?.id ?? this.store.saison_active_id();
      await this.adherentStore.refreshNow(saisonId);
    } catch (err: any) {
      errorService.emitChange(
        errorService.CreateError(
          $localize`Actualiser les adhérents`,
          err?.message ?? $localize`Erreur inconnue`
        )
      );
    }
  }

  onApplyRefresh(): void {
    if (this.isMonCompteContext) {
      return;
    }

    this.adherentStore.applyRefresh();
  }

  async onOpen(id: number): Promise<void> {
    const saisonId = this.vm.activeSaison?.id ?? this.store.saison_active_id();
    await this.adherentStore.openAdherent(id, saisonId);
  }

  onCreate(): void {
    this.adherentStore.createEmpty();
  }

  onEditorBack(): void {
    this.adherentStore.closeDetail();

    if (this.isMonCompteContext || !this.store.isProf()) {
      this.router.navigate(['/mon-compte']);
      return;
    }

    const saisonId = this.vm.activeSaison?.id ?? this.store.saison_active_id();
    void this.adherentStore.refreshNow(saisonId);
  }


    onBackToList(): void {
      this.adherentStore.closeDetail();
      const saisonId = this.vm.activeSaison?.id ?? this.store.saison_active_id();
      void this.adherentStore.refreshNow(saisonId);
    }
  }

  