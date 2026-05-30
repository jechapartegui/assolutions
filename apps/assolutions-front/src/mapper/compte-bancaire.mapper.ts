import { Injectable } from '@angular/core';
import {
  CompteBancaire,
  CompteBancaire_VM,
  CreateCompteBancaireDto,
  UpdateCompteBancaireDto,
} from '@shared/lib/compte-bancaire.interface';
import {
  CompteBancairePageVm,
  CompteBancaireSortField,
  SortDirection,
} from '../vm/compte-bancaire.page.vm';

@Injectable({ providedIn: 'root' })
export class CompteBancaireMapper {
  createInitialVm(): CompteBancairePageVm {
    return {
      list: [],
      filteredList: [],
      editCompteBancaire: null,

      loading: false,
      refreshing: false,
      action: '',

      readonly: true,
      isValid: false,

      filterNom: '',
      selectedSort: 'nom',
      selectedSortSens: 'ASC',

      selectedIds: [],

      refreshAvailable: false,
      lastLoadedAt: null,
    };
  }

  toVm(raw: CompteBancaire): CompteBancaire_VM {
    const vm = new CompteBancaire_VM();

    vm.id = raw.id ?? 0;
    vm.project_id = raw.project_id ?? 0;
    vm.nom = raw.nom ?? '';
    vm.type = raw.type ?? '';
    vm.info = raw.info ?? '';
    vm.actif = raw.actif ?? true;
    vm.iban = raw.iban ?? '';
    vm.carte_titulaire_id = raw.carte_titulaire ?? undefined;
    vm.carte = this.parseCarte(raw.carte_json);

    return vm;
  }

  createEmpty(): CompteBancaire_VM {
    const vm = new CompteBancaire_VM();

    vm.id = 0;
    vm.project_id = 0;
    vm.nom = '';
    vm.type = 'BANQUE';
    vm.info = '';
    vm.actif = true;
    vm.iban = '';
    vm.carte = null;
    vm.carte_titulaire_id = undefined;

    return vm;
  }

  toCreateDto(vm: CompteBancaire_VM): CreateCompteBancaireDto {
    return {
      nom: vm.nom ?? '',
      type: vm.type ?? '',
      info: vm.info ?? null,
      actif: vm.actif ?? true,
      iban: this.emptyToNull(vm.iban),
      carte_json: this.stringifyCarte(vm.carte),
      carte_titulaire: vm.carte_titulaire_id ?? null,
    };
  }

  toUpdateDto(vm: CompteBancaire_VM): UpdateCompteBancaireDto {
    return this.toCreateDto(vm);
  }

  clone(vm: CompteBancaire_VM): CompteBancaire_VM {
    return JSON.parse(JSON.stringify(vm)) as CompteBancaire_VM;
  }

  applyFilterAndSort(
    list: CompteBancaire_VM[],
    filterNom: string,
    sortField: CompteBancaireSortField,
    sortSens: SortDirection,
  ): CompteBancaire_VM[] {
    const q = this.normalize(filterNom);

    const filtered = q
      ? list.filter((x) =>
          this.normalize(`${x.nom} ${x.type} ${x.info ?? ''} ${x.iban ?? ''}`).includes(q),
        )
      : [...list];

    return filtered.sort((a, b) => {
      let cmp = 0;

      if (sortField === 'nom') {
        cmp = this.normalize(a.nom).localeCompare(this.normalize(b.nom), 'fr');
      }

      if (sortField === 'type') {
        cmp = this.normalize(a.type).localeCompare(this.normalize(b.type), 'fr');
      }

      if (sortField === 'actif') {
        cmp = Number(!!a.actif) - Number(!!b.actif);
      }

      return sortSens === 'ASC' ? cmp : -cmp;
    });
  }

  carteToText(value: Record<string, unknown> | null | undefined): string {
    if (!value) return '';

    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return '';
    }
  }

  textToCarte(value: string | null | undefined): Record<string, unknown> | null {
    const text = (value ?? '').trim();
    if (!text) return null;

    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return { raw: text };
    }
  }

  isValid(vm: CompteBancaire_VM): boolean {
    return (
      (vm.nom ?? '').trim().length >= 2 &&
      (vm.type ?? '').trim().length >= 2
    );
  }

  private parseCarte(value: string | null | undefined): Record<string, unknown> | null {
    if (!value) return null;

    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return { raw: value };
    }
  }

  private stringifyCarte(value: Record<string, unknown> | null | undefined): string | null {
    if (!value) return null;

    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }

  private emptyToNull(value: string | null | undefined): string | null {
    const text = (value ?? '').trim();
    return text ? text : null;
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