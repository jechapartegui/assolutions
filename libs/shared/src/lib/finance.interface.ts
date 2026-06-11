export interface ClasseComptable {
  id: number;
  project_id: number | null;
  parent_id: number | null;

  pays: string | null;
  lang: string;

  code: string;
  libelle: string;
  recette: boolean;
  actif: boolean;
  ordre: number;
}

export interface CreateClasseComptableDto {
  project_id?: number | null;
  parent_id?: number | null;

  pays?: string | null;
  lang?: string;

  code: string;
  libelle: string;
  recette: boolean;
  actif?: boolean;
  ordre?: number;
}

export interface UpdateClasseComptableDto {
  project_id?: number | null;
  parent_id?: number | null;

  pays?: string | null;
  lang?: string;

  code?: string;
  libelle?: string;
  recette?: boolean;
  actif?: boolean;
  ordre?: number;
}

export interface BudgetScenario {
  id: number;
  project_id: number;
  saison_id: number;
  nom: string;
  scenario_defaut: boolean;
  info: string | null;
}

export interface CreateBudgetScenarioDto {
  saison_id: number;
  nom: string;
  scenario_defaut?: boolean;
  info?: string | null;
}

export interface UpdateBudgetScenarioDto {
  saison_id?: number;
  nom?: string;
  scenario_defaut?: boolean;
  info?: string | null;
}

export interface BudgetLigne {
  id: number;
  budget_scenario_id: number;
  classe_comptable_id: number;
  montant_budget: number;
  info: string | null;
}

export interface CreateBudgetLigneDto {
  budget_scenario_id: number;
  classe_comptable_id: number;
  montant_budget: number;
  info?: string | null;
}

export interface UpdateBudgetLigneDto {
  classe_comptable_id?: number;
  montant_budget?: number;
  info?: string | null;
}