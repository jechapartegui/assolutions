import { Component, OnInit } from '@angular/core';
import { ErrorService } from '../../services/error.service';
import { AppStore } from '../app.store';
import { SeanceStore } from '../../store/seance.store';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-seance',
  templateUrl: './seance.component.html',
  styleUrls: ['./seance.component.css'],
  standalone: false,
})
export class SeanceComponent implements OnInit {
  constructor(
    public readonly store: AppStore,
    public readonly seanceStore: SeanceStore,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  get vm() {
    return this.seanceStore.vm();
  }

  get isAdmin(): boolean {
    return this.store.mode?.() === 'ADMIN';
  }

  get saisonId(): number {
    return Number(
      this.store.saison_consultation_id() ?? this.store.saison_active_id(),
    );
  }

  get hasRefreshAvailable(): boolean {
    return !!this.vm.refreshAvailable;
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
          $localize`Charger les séances`,
          $localize`Accès impossible, vous n'êtes pas connecté`,
        ),
      );
      this.router.navigate(['/login']);
      return;
    }

    try {
      await this.seanceStore.init(this.saisonId);

      this.route.queryParams.subscribe(async (params) => {
        if (params['id']) {
          await this.seanceStore.openSeance(+params['id'], this.saisonId);
        }
      });
    } catch (err: any) {
      errorService.emitChange(
        errorService.CreateError(
          $localize`Charger les séances`,
          err?.message ?? $localize`Erreur inconnue`,
        ),
      );
    }
  }

  async onRefreshNow(): Promise<void> {
    const errorService = ErrorService.instance;

    try {
      await this.seanceStore.refreshNow(this.saisonId);
    } catch (err: any) {
      errorService.emitChange(
        errorService.CreateError(
          $localize`Actualiser les séances`,
          err?.message ?? $localize`Erreur inconnue`,
        ),
      );
    }
  }

  onApplyRefresh(): void {
    this.seanceStore.applyRefresh();
  }

  async onOpen(id: number): Promise<void> {
    await this.seanceStore.openSeance(id, this.saisonId);
  }

  onCreate(serie = false): void {
    this.seanceStore.createEmpty(this.saisonId, serie);
  }

  onBackToList(): void {
    this.seanceStore.closeEditor();
  }
}
