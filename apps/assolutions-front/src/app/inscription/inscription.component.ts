import {
  Component,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  Groupe,
  TarifInscription,
} from '@shared/index';

import { ErrorService } from '../../services/error.service';
import { TarifInscriptionStore } from '../../store/tarif-inscription.store';
import { AppStore } from '../app.store';

@Component({
  standalone: false,
  selector: 'app-inscription',
  templateUrl: './inscription.component.html',
  styleUrls: ['./inscription.component.css'],
})
export class InscriptionComponent implements OnInit {
  private readonly priceFormatter =
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    });

  constructor(
    public readonly tarifStore:
      TarifInscriptionStore,
    public readonly appStore: AppStore,
    private readonly router: Router,
  ) {}

  get vm() {
    return this.tarifStore.vm();
  }

  async ngOnInit(): Promise<void> {
    const errorService = ErrorService.instance;

    if (!this.appStore.isLoggedIn()) {
      errorService.emitChange(
        errorService.CreateError(
          $localize`Charger les tarifs d'inscription`,
          $localize`Accès impossible, vous n'êtes pas connecté`,
        ),
      );

      this.router.navigate(['/login']);
      return;
    }

    if (!this.appStore.isProf()) {
      this.router.navigate(['/menu']);
      return;
    }

    const saisonId = this.resolveSaisonId();

    if (!saisonId) {
      errorService.emitChange(
        errorService.CreateError(
          $localize`Charger les tarifs d'inscription`,
          $localize`Aucune saison n'est sélectionnée`,
        ),
      );
      return;
    }

    try {
      await this.tarifStore.init(saisonId);
    } catch (error) {
      errorService.emitChange(
        errorService.CreateError(
          $localize`Chargement des tarifs d'inscription`,
          error,
        ),
      );
    }
  }

  displayedTarifs(): TarifInscription[] {
    return this.tarifStore.displayedTarifs();
  }

  selectedTarif(): TarifInscription | null {
    return this.tarifStore.selectedTarif();
  }

  displayedTarif(): TarifInscription | null {
    return this.vm.editTarif
      ? null
      : this.selectedTarif();
  }

  formatPrice(
    tarifOrCentimes:
      TarifInscription | number,
  ): string {
    const centimes =
      typeof tarifOrCentimes === 'number'
        ? tarifOrCentimes
        : tarifOrCentimes.prix_centimes;

    return this.priceFormatter.format(
      Number(centimes ?? 0) / 100,
    );
  }

  priceInputValue(
    tarif: TarifInscription,
  ): number {
    return Number(tarif.prix_centimes ?? 0) / 100;
  }

  getGroups(
    tarif: TarifInscription,
  ): Groupe[] {
    const ids = new Set(
      (tarif.groupe_ids ?? []).map(Number),
    );

    return this.vm.groupes.filter(
      (groupe) => ids.has(Number(groupe.id)),
    );
  }

  getGroupSummary(
    tarif: TarifInscription,
  ): string {
    const groupes = this.getGroups(tarif);

    if (groupes.length === 0) {
      return 'Tarif général';
    }

    if (groupes.length === 1) {
      return groupes[0].nom;
    }

    return `${groupes.length} groupes`;
  }

  getValidityLabel(
    tarif: TarifInscription,
  ): string {
    const start =
      tarif.date_debut_validite;
    const end =
      tarif.date_fin_validite;

    if (!start && !end) {
      return 'Toujours disponible';
    }

    if (start && end) {
      return `Du ${this.formatDate(start)} au ${this.formatDate(end)}`;
    }

    if (start) {
      return `À partir du ${this.formatDate(start)}`;
    }

    return `Jusqu'au ${this.formatDate(end!)}`;
  }

  getPaymentLabel(
    tarif: TarifInscription,
  ): string {
    const max = Number(
      tarif.paiement_plusieurs_fois ?? 1,
    );

    return max <= 1
      ? 'Paiement comptant'
      : `Paiement jusqu'à ${max} fois`;
  }

  getAgeCriteriaLabel(
    tarif: TarifInscription,
  ): string | null {
    const min = tarif.age_min;
    const max = tarif.age_max;

    if (min == null && max == null) {
      return null;
    }

    if (min != null && max != null) {
      return `De ${min} à ${max} ans`;
    }

    if (min != null) {
      return `${min} ans minimum`;
    }

    return `${max} ans maximum`;
  }

  getBirthYearCriteriaLabel(
    tarif: TarifInscription,
  ): string | null {
    const debut =
      tarif.naissance_avant;
    const fin =
      tarif.naissance_apres;

    if (debut == null && fin == null) {
      return null;
    }

    if (debut != null && fin != null) {
      return `Né(e) entre ${debut} et ${fin}`;
    }

    if (debut != null) {
      return `Né(e) au plus tôt en ${debut}`;
    }

    return `Né(e) au plus tard en ${fin}`;
  }

  hasEligibilityCriteria(
    tarif: TarifInscription,
  ): boolean {
    return (
      tarif.age_min != null
      || tarif.age_max != null
      || tarif.naissance_avant != null
      || tarif.naissance_apres != null
      || tarif.limit_nb != null
    );
  }

  getAvailabilityStatus(
    tarif: TarifInscription,
  ): 'ACTIVE' | 'FUTURE' | 'EXPIRED' | 'INACTIVE' {
    if (!tarif.actif) {
      return 'INACTIVE';
    }

    const today =
      new Date().toISOString().slice(0, 10);

    if (
      tarif.date_debut_validite
      && today < tarif.date_debut_validite
    ) {
      return 'FUTURE';
    }

    if (
      tarif.date_fin_validite
      && today > tarif.date_fin_validite
    ) {
      return 'EXPIRED';
    }

    return 'ACTIVE';
  }

  getAvailabilityLabel(
    tarif: TarifInscription,
  ): string {
    const status =
      this.getAvailabilityStatus(tarif);

    switch (status) {
      case 'ACTIVE':
        return 'Disponible';
      case 'FUTURE':
        return 'À venir';
      case 'EXPIRED':
        return 'Terminé';
      default:
        return 'Inactif';
    }
  }

  getAvailabilityClass(
    tarif: TarifInscription,
  ): string {
    const status =
      this.getAvailabilityStatus(tarif);

    switch (status) {
      case 'ACTIVE':
        return 'is-success is-light';
      case 'FUTURE':
        return 'is-info is-light';
      case 'EXPIRED':
        return 'is-warning is-light';
      default:
        return 'is-light';
    }
  }

  async saveTarif(): Promise<void> {
    const errorService = ErrorService.instance;

    try {
      await this.tarifStore.saveEdit();

      errorService.emitChange(
        errorService.OKMessage(
          $localize`Sauvegarde du tarif d'inscription`,
        ),
      );
    } catch (error) {
      errorService.emitChange(
        errorService.CreateError(
          $localize`Sauvegarde du tarif d'inscription`,
          error,
        ),
      );
    }
  }

  async deleteTarif(
    tarif: TarifInscription,
  ): Promise<void> {
    const confirmed = window.confirm(
      $localize`Supprimer le tarif "${tarif.nom}" ?`,
    );

    if (!confirmed) {
      return;
    }

    const errorService = ErrorService.instance;

    try {
      await this.tarifStore.deleteTarif(tarif);

      errorService.emitChange(
        errorService.OKMessage(
          $localize`Suppression du tarif d'inscription`,
        ),
      );
    } catch (error) {
      errorService.emitChange(
        errorService.CreateError(
          $localize`Suppression du tarif d'inscription`,
          error,
        ),
      );
    }
  }

  trackById(
    _index: number,
    item: { id: number },
  ): number {
    return item.id;
  }

  private resolveSaisonId(): number {
    const stored = Number(
      localStorage.getItem(
        'assolutions.consultationSaisonId',
      ),
    );

    if (
      Number.isInteger(stored)
      && stored > 0
    ) {
      return stored;
    }

    return Number(
      this.appStore.saison_active_id(),
    );
  }

  private formatDate(value: string): string {
    const [year, month, day] =
      value.slice(0, 10).split('-');

    return year && month && day
      ? `${day}/${month}/${year}`
      : value;
  }
}
