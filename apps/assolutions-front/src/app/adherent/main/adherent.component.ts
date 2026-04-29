import {
  AfterViewInit,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
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
  
    get isAdmin(): boolean {
    return this.store.mode?.() === 'ADMIN';
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
            $localize`Charger les adhérents`,
            $localize`Accès impossible, vous n'êtes pas connecté`
          )
        );
        this.router.navigate(['/login']);
        return;
      }
  
      try {
        const saisonId = this.store.saison_active_id();
        await this.adherentStore.init(saisonId);
        this.route.queryParams.subscribe(async (params) => {
          if (params['id']) {
            await this.adherentStore.openAdherent(+params['id'], saisonId);
          }
        });
      } catch (err: any) {
        errorService.emitChange(
          errorService.CreateError(
            $localize`Charger les adhérents`,
            err?.message ?? $localize`Erreur inconnue`
          )
        );
      }
    }
  
    async onRefreshNow(): Promise<void> {
      const errorService = ErrorService.instance;
  
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
      this.adherentStore.applyRefresh();
    }
  
    async onOpen(id: number): Promise<void> {
      const saisonId = this.vm.activeSaison?.id ?? this.store.saison_active_id();
      await this.adherentStore.openAdherent(id, saisonId);
    }
  
    onCreate(): void {
      const saisonId = this.vm.activeSaison?.id ?? this.store.saison_active_id();
      this.adherentStore.createEmpty();
    }
  
    onBackToList(): void {
      this.adherentStore.closeDetail();
      const saisonId = this.vm.activeSaison?.id ?? this.store.saison_active_id();
      void this.adherentStore.refreshNow(saisonId);
    }
  }