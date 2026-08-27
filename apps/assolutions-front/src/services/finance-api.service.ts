import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';

import {
  ClasseComptable,
  CreateClasseComptableDto,
  UpdateClasseComptableDto,
  BudgetScenario,
  CreateBudgetScenarioDto,
  UpdateBudgetScenarioDto,
  BudgetLigne,
  CreateBudgetLigneDto,
  UpdateBudgetLigneDto,
} from '@shared/lib/finance.interface';

import {
  Operation,
  CreateOperationDto,
  UpdateOperationDto,
} from '@shared/lib/operation.interface';

import { FluxFinancier } from '@shared/lib/flux-financier.interface';
import { AppStore } from '../app/app.store';
import { FluxFinancierApiService } from './flux-financiers-api.service';

export interface BudgetRealiseItem {
  classe_comptable_id: number | null;
  montant_flux: number;
  montant_paye: number;
}

export interface CreateFluxFromOperationResult {
  flux: FluxFinancier;
  operation: Operation;
}

@Injectable({ providedIn: 'root' })
export class FinanceApiService {
  private readonly base = '/finance';

  constructor(
    private api: ApiClientService,
    private store: AppStore,
    private fluxApi: FluxFinancierApiService,
  ) {}

  listClasses(pays = 'FR', lang = 'fr'): Promise<ClasseComptable[]> {
    return this.api.GET<ClasseComptable[]>(
      `${this.base}/classe-comptable?pays=${encodeURIComponent(pays)}&lang=${encodeURIComponent(lang)}`,
    );
  }

  createClasse(dto: CreateClasseComptableDto): Promise<ClasseComptable> {
    return this.api.POST<ClasseComptable>(`${this.base}/classe-comptable`, dto);
  }

  updateClasse(id: number, dto: UpdateClasseComptableDto): Promise<ClasseComptable> {
    return this.api.POST<ClasseComptable>(`${this.base}/classe-comptable/${id}/update`, dto);
  }

  removeClasse(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/classe-comptable/${id}/delete`, {});
  }

  listScenarios(saisonId?: number): Promise<BudgetScenario[]> {
    const url = saisonId
      ? `${this.base}/budget-scenario?saison_id=${saisonId}`
      : `${this.base}/budget-scenario`;

    return this.api.GET<BudgetScenario[]>(url);
  }

  createScenario(dto: CreateBudgetScenarioDto): Promise<BudgetScenario> {
    return this.api.POST<BudgetScenario>(`${this.base}/budget-scenario`, dto);
  }

  updateScenario(id: number, dto: UpdateBudgetScenarioDto): Promise<BudgetScenario> {
    return this.api.POST<BudgetScenario>(`${this.base}/budget-scenario/${id}/update`, dto);
  }

  removeScenario(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/budget-scenario/${id}/delete`, {});
  }

  listLignes(scenarioId?: number): Promise<BudgetLigne[]> {
    const url = scenarioId
      ? `${this.base}/budget-ligne?scenario_id=${scenarioId}`
      : `${this.base}/budget-ligne`;

    return this.api.GET<BudgetLigne[]>(url);
  }

  createLigne(dto: CreateBudgetLigneDto): Promise<BudgetLigne> {
    return this.api.POST<BudgetLigne>(`${this.base}/budget-ligne`, dto);
  }

  updateLigne(id: number, dto: UpdateBudgetLigneDto): Promise<BudgetLigne> {
    return this.api.POST<BudgetLigne>(`${this.base}/budget-ligne/${id}/update`, dto);
  }

  removeLigne(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/budget-ligne/${id}/delete`, {});
  }

  async listOperations(fluxFinancierId?: number): Promise<Operation[]> {
    if (fluxFinancierId) {
      return this.api.GET<Operation[]>(
        `${this.base}/operation?flux_financier_id=${fluxFinancierId}`,
      );
    }

    const operations = await this.api.GET<Operation[]>(`${this.base}/operation`);
    const saisonId = Number(this.store.saison_active_id() ?? 0);

    if (!saisonId) return operations ?? [];

    // L'API historique des opérations n'a pas de filtre saison. On limite donc
    // explicitement les opérations aux flux de la saison de travail courante.
    // En mode ADMIN, cette saison est celle choisie dans menu-admin.
    const flux = await this.fluxApi.list(saisonId, true);
    const fluxIds = new Set((flux ?? []).map((item) => Number(item.id)));

    return (operations ?? []).filter(
      (operation) =>
        operation.flux_financier_id != null &&
        fluxIds.has(Number(operation.flux_financier_id)),
    );
  }

  createOperation(dto: CreateOperationDto): Promise<Operation> {
    return this.api.POST<Operation>(`${this.base}/operation`, dto);
  }

  updateOperation(id: number, dto: UpdateOperationDto): Promise<Operation> {
    return this.api.POST<Operation>(`${this.base}/operation/${id}/update`, dto);
  }

  removeOperation(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/operation/${id}/delete`, {});
  }

  createFluxFromOperation(operationId: number, saisonId: number): Promise<CreateFluxFromOperationResult> {
    return this.api.POST<CreateFluxFromOperationResult>(
      `${this.base}/operation/${operationId}/create-flux`,
      { saison_id: saisonId },
    );
  }

  budgetRealise(saisonId: number): Promise<BudgetRealiseItem[]> {
    return this.api.GET<BudgetRealiseItem[]>(
      `${this.base}/budget-realise?saison_id=${saisonId}`,
    );
  }
}
