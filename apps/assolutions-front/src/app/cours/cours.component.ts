import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ErrorService } from '../../services/error.service';
import { AppStore } from '../app.store';
import { CoursStore } from '../../store/cours.store';

@Component({
  selector: 'app-cours',
  templateUrl: './cours.component.html',
  styleUrls: ['./cours.component.css'],
  standalone: false,
})
export class CoursComponent implements OnInit {
  constructor(
    public readonly store: AppStore,
    public readonly coursStore: CoursStore,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  get vm() {
    return this.coursStore.vm();
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
          $localize`Charger les cours`,
          $localize`Accès impossible, vous n'êtes pas connecté`,
        ),
      );
      this.router.navigate(['/login']);
      return;
    }

    try {
      await this.coursStore.init(this.saisonId);
      this.route.queryParams.subscribe(async (params) => {
        if (params['id']) {
          await this.coursStore.openCours(+params['id'], this.saisonId);
        }
      });
    } catch (err: any) {
      errorService.emitChange(
        errorService.CreateError(
          $localize`Charger les cours`,
          err?.message ?? $localize`Erreur inconnue`,
        ),
      );
    }
  }

  async onRefreshNow(): Promise<void> {
    const errorService = ErrorService.instance;

    try {
      await this.coursStore.refreshNow(this.saisonId);
    } catch (err: any) {
      errorService.emitChange(
        errorService.CreateError(
          $localize`Actualiser les cours`,
          err?.message ?? $localize`Erreur inconnue`,
        ),
      );
    }
  }

  onApplyRefresh(): void {
    this.coursStore.applyRefresh();
  }

  async onOpen(id: number): Promise<void> {
    await this.coursStore.openCours(id, this.saisonId);
  }

  onCreate(): void {
    this.coursStore.createEmpty(this.saisonId);
  }

  onBackToList(): void {
    this.coursStore.closeEditor();
  }
}
