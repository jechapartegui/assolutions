import { Injectable } from '@angular/core';
import { Lieu, Lieu_VM } from '@shared/index';
import { Adresse } from '@shared/lib/adresse.interface';
import { LieuPageVm, LieuSortField, SortDirection } from '../vm/lieu-page.vm';

type CreateLieuDto = Lieu;
type UpdateLieuDto = Partial<Lieu>;

@Injectable({ providedIn: 'root' })
export class LieuMapper {
  createInitialVm(): LieuPageVm {
    return {
      list: [],
      filteredList: [],
      loading: false,
      refreshing: false,
      refreshAvailable: false,
      filterNom: '',
      selectedSort: 'nom',
      selectedSortSens: 'ASC',
      editLieu: null,
      readonly: true,
      isValid: false,
      selectedIds: [],
      action: '',
      lastLoadedAt: null,
    };
  }

  toLieuVm(raw: Lieu): Lieu_VM {
    const vm = {} as Lieu_VM;
    vm.id = raw.id;
    vm.nom = raw.nom;
    vm.adresse = this.ParseAdresse(raw.adresse);
    vm.public = raw.public;
    return vm;
  }

  toCreateDto(vm: Lieu_VM, projectId: number): CreateLieuDto {
    return {
      ...(vm as any),
      id: undefined,
      project_id: projectId,
      nom: vm.nom ?? '',
      adresse: this.JSONAdresse(vm),
    } as CreateLieuDto;
  }

  toUpdateDto(vm: Lieu_VM, projectId: number): UpdateLieuDto {
    return {
      ...(vm as any),
      project_id: projectId,
      nom: vm.nom ?? '',
      adresse: this.JSONAdresse(vm),
    } as UpdateLieuDto;
  }

 createEmptyLieu(): Lieu_VM {
  const vm = {} as Lieu_VM;

  vm.id = 0;
  vm.nom = '';
  vm.adresse = new Adresse();

  return vm;
}

  applyFilterAndSort(
    list: Lieu_VM[],
    filterNom: string,
    sortField: LieuSortField,
    sortSens: SortDirection,
  ): Lieu_VM[] {
    const q = this.normalize(filterNom);

    let result = q
      ? list.filter((x) => this.normalize(x.nom).includes(q))
      : [...list];

    result = result.sort((a, b) => {
      let cmp = 0;

      if (sortField === 'adresse') {
        cmp = this.normalize(this.JSONAdresse(a)).localeCompare(
          this.normalize(this.JSONAdresse(b)),
          'fr',
        );
      } else {
        cmp = this.normalize(a.nom).localeCompare(this.normalize(b.nom), 'fr');
      }

      return sortSens === 'ASC' ? cmp : -cmp;
    });

    return result;
  }

  JSONAdresse(lieu: Lieu_VM ): string {
   return JSON.stringify(lieu.adresse);
  }

  clone(vm: Lieu_VM): Lieu_VM {
    return this.toLieuVm(JSON.parse(JSON.stringify(vm)));
  }

   ParseAdresse(adresseRaw:string): Adresse {
  // Cas 1: string JSON {"..."} -> parse
  if (adresseRaw?.trim()?.startsWith('{')) {
    try {
      const obj = JSON.parse(adresseRaw);
      return Object.assign(new Adresse(), obj);
    } catch {
      // si le JSON est invalide, on retombe sur un fallback
      return new Adresse();
    }
  }

  // Cas 2: texte libre -> tu peux choisir comment tu le ranges
  const adr = new Adresse();
  // Exemple minimal : tu stockes tout dans une propriété "raw" si tu en as une
  // (sinon remplace par la/les propriétés existantes)
  (adr as any).raw = adresseRaw;
  return adr;
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