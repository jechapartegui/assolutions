import { Injectable } from '@angular/core';
import { Saison, CreateSaisonDto, UpdateSaisonDto } from '@shared/lib/saison.interface';
import { SaisonPageVm, SaisonSortField, Saison_VM, SortDirection } from '../vm/saison-page.vm';

@Injectable({ providedIn: 'root' })
export class SaisonMapper {
  createInitialVm(): SaisonPageVm {
    return {
      list: [],
      filteredList: [],
      editSaison: null,

      loading: false,
      refreshing: false,
      action: '',

      readonly: true,
      isValid: false,

      filterNom: '',
      selectedSort: 'date_debut',
      selectedSortSens: 'ASC',

      selectedIds: [],

      refreshAvailable: false,
      lastLoadedAt: null,
    };
  }

  toSaisonVm(raw: Saison): Saison_VM {
    return {
      id: Number(raw.id),
      project_id: Number(raw.project_id),
      nom: raw.nom ?? '',
      active: !!raw.active,
      date_debut: raw.date_debut ?? '',
      date_fin: raw.date_fin ?? '',
      saison_precedente: raw.saison_precedente ?? undefined,
      tarif_avant_groupes: !!raw.tarif_avant_groupes,
    };
  }

  createEmptySaison(): Saison_VM {
    return {
      id: 0,
      project_id: 0,
      nom: '',
      active: false,
      date_debut: '',
      date_fin: '',
      saison_precedente: undefined,
      tarif_avant_groupes: false,
    };
  }

  toCreateDto(vm: Saison_VM): CreateSaisonDto {
    return {
      nom: vm.nom ?? '',
      active: false,
      date_debut: vm.date_debut,
      date_fin: vm.date_fin,
      saison_precedente: vm.saison_precedente || undefined,
      tarif_avant_groupes: !!vm.tarif_avant_groupes,
    };
  }

  toUpdateDto(vm: Saison_VM): UpdateSaisonDto {
    return {
      nom: vm.nom ?? '',
      date_debut: vm.date_debut,
      date_fin: vm.date_fin,
      saison_precedente: vm.saison_precedente || undefined,
      tarif_avant_groupes: !!vm.tarif_avant_groupes,
    };
  }

  toActiveDto(active: boolean): UpdateSaisonDto {
    return { active };
  }

  clone(vm: Saison_VM): Saison_VM {
    return JSON.parse(JSON.stringify(vm)) as Saison_VM;
  }

  applyFilterAndSort(
    list: Saison_VM[],
    filterNom: string,
    sortField: SaisonSortField,
    sortSens: SortDirection,
  ): Saison_VM[] {
    const q = this.normalize(filterNom);

    let result = q
      ? list.filter((x) => this.normalize(x.nom).includes(q))
      : [...list];

    if (sortField === 'date_debut') {
      result = this.sortBySaisonPrecedenteOrId(result);
    } else {
      result = result.sort((a, b) => {
        let cmp = 0;

        if (sortField === 'nom') {
          cmp = this.normalize(a.nom).localeCompare(this.normalize(b.nom), 'fr');
        }

        if (sortField === 'date_fin') {
          cmp = String(a.date_fin ?? '').localeCompare(String(b.date_fin ?? ''));
        }

        if (sortField === 'active') {
          cmp = Number(!!a.active) - Number(!!b.active);
        }

        return sortSens === 'ASC' ? cmp : -cmp;
      });
    }

    return sortSens === 'ASC' ? result : [...result].reverse();
  }

  sortBySaisonPrecedenteOrId(list: Saison_VM[]): Saison_VM[] {
    if (!list?.length) return [];

    const fallback = () => [...list].sort((a, b) => a.id - b.id);

    const byId = new Map<number, Saison_VM>();
    for (const saison of list) {
      byId.set(Number(saison.id), saison);
    }

    const firstCandidates = list.filter((saison) => {
      const previousId = Number(saison.saison_precedente);
      return !Number.isFinite(previousId) || previousId <= 0 || !byId.has(previousId);
    });

    if (firstCandidates.length !== 1) return fallback();

    const nextByPreviousId = new Map<number, Saison_VM>();

    for (const saison of list) {
      const previousId = Number(saison.saison_precedente);

      if (Number.isFinite(previousId) && previousId > 0 && byId.has(previousId)) {
        if (nextByPreviousId.has(previousId)) return fallback();
        nextByPreviousId.set(previousId, saison);
      }
    }

    const sorted: Saison_VM[] = [];
    const visited = new Set<number>();
    let current: Saison_VM | undefined = firstCandidates[0];

    while (current) {
      if (visited.has(current.id)) return fallback();

      sorted.push(current);
      visited.add(current.id);
      current = nextByPreviousId.get(current.id);
    }

    return sorted.length === list.length ? sorted : fallback();
  }

  getPreviousLabel(saison: Saison_VM | null | undefined, list: Saison_VM[]): string {
    if (!saison?.saison_precedente) return 'Aucune';

    const previous = list.find((x) => x.id === saison.saison_precedente);
    return previous?.nom ?? `Saison #${saison.saison_precedente}`;
  }

  private normalize(value: string | null | undefined): string {
    return (value ?? '')
      .toString()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .trim()
      .toLowerCase();
  }
}
