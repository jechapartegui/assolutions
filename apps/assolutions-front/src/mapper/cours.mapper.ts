import { Injectable } from '@angular/core';
import {
  Cours,
  Cours_VM,
  Groupe,
  KeyValuePair,
  Saison,
} from '@shared/index';

import { CoursFilterVm } from '../vm/cours-filter.vm';
import { CoursPageData, CoursReferencesVm } from '../vm/cours-page.vm';

type CreateCoursDto = Cours;
type UpdateCoursDto = Partial<Cours>;

@Injectable({ providedIn: 'root' })
export class CoursMapper {
  buildReferencesVm(
    listeCours: Cours_VM[],
    listeGroupe: Groupe[],
    listeLieu: KeyValuePair[],
    listeProf: KeyValuePair[],
    listeSaison: Saison[],
  ): CoursReferencesVm {
    return {
      listeCours,
      listeGroupe,
      listeLieu,
      listeProf,
      listeSaison,
      liste_lieu_filter: [...listeLieu].sort((a, b) =>
        (a.value ?? '').localeCompare(b.value ?? '', 'fr')
      ),
      liste_prof_filter: [...listeProf].sort((a, b) =>
        (a.value ?? '').localeCompare(b.value ?? '', 'fr')
      ),
      liste_groupe_filter: [...listeGroupe].sort((a, b) =>
        (a.nom ?? '').localeCompare(b.nom ?? '', 'fr')
      ),
      liste_jour_filter: [
        'lundi',
        'mardi',
        'mercredi',
        'jeudi',
        'vendredi',
        'samedi',
        'dimanche',
      ],
    };
  }

  buildPageData(
    refs: CoursReferencesVm,
    list: Cours_VM[],
    activeSaison: Saison | null,
  ): CoursPageData {
    return {
      refs,
      list: this.sortByNom([...list], 'ASC'),
      activeSaison,
    };
  }

  createDefaultFilter(): CoursFilterVm {
    return new CoursFilterVm();
  }

  toCreateDto(vm: Cours_VM, projectId: number): CreateCoursDto {
    return {
      id: vm.id && vm.id > 0 ? vm.id : undefined,
      project_id: projectId,
      nom: vm.nom ?? '',
      jour_semaine: vm.jour_semaine ?? 'lundi',
      heure: vm.heure ?? '11:00',
      duree: vm.duree ?? 0,
      prof_principal_id: vm.prof_principal_id ?? 0,
      lieu_id: vm.lieu_id ?? 0,
      age_minimum: vm.est_limite_age_minimum ? (vm.age_minimum ?? null) : null,
      age_maximum: vm.est_limite_age_maximum ? (vm.age_maximum ?? null) : null,
      saison_id: vm.saison_id ?? 0,
      place_maximum: vm.est_place_maximum ? (vm.place_maximum ?? null) : null,
      convocation_nominative: !!vm.convocation_nominative,
      afficher_present: !!vm.afficher_present,
      essai_possible: !!vm.essai_possible,
      appointment: vm.rdv ?? null,
    };
  }

  toUpdateDto(vm: Cours_VM, projectId: number): UpdateCoursDto {
    return this.toCreateDto(vm, projectId);
  }

  toCoursVm(raw: Cours): Cours_VM {
    const vm = new Cours_VM();

    vm.id = raw.id ?? 0;
    vm.nom = raw.nom ?? '';
    vm.jour_semaine = raw.jour_semaine ?? 'lundi';
    vm.heure = raw.heure ?? '11:00';
    vm.duree = raw.duree ?? 0;
    vm.prof_principal_id = raw.prof_principal_id ?? 0;
    vm.lieu_id = raw.lieu_id ?? 0;
    vm.saison_id = raw.saison_id ?? 0;

    vm.age_minimum = raw.age_minimum ?? undefined;
    vm.age_maximum = raw.age_maximum ?? undefined;
    vm.place_maximum = raw.place_maximum ?? undefined;

    vm.convocation_nominative = !!raw.convocation_nominative;
    vm.afficher_present = !!raw.afficher_present;
    vm.essai_possible = !!raw.essai_possible;

    vm.est_limite_age_minimum = raw.age_minimum != null;
    vm.est_limite_age_maximum = raw.age_maximum != null;
    vm.est_place_maximum = raw.place_maximum != null;

    vm.rdv = raw.appointment ?? '';

    vm.professeursCours = [];
    vm.groupes = [];
    vm.lieu = {} as any;

    return vm;
  }

  sortByNom(list: Cours_VM[], sens: 'ASC' | 'DESC'): Cours_VM[] {
    return [...list].sort((a, b) => {
      const cmp = this.normalize(a.nom).localeCompare(this.normalize(b.nom), 'fr');
      return sens === 'ASC' ? cmp : -cmp;
    });
  }

  sortByJour(list: Cours_VM[], sens: 'ASC' | 'DESC'): Cours_VM[] {
    const order: Record<string, number> = {
      lundi: 1,
      mardi: 2,
      mercredi: 3,
      jeudi: 4,
      vendredi: 5,
      samedi: 6,
      dimanche: 7,
    };

    return [...list].sort((a, b) => {
      const cmp =
        (order[(a.jour_semaine ?? '').toLowerCase()] ?? 999) -
        (order[(b.jour_semaine ?? '').toLowerCase()] ?? 999);
      return sens === 'ASC' ? cmp : -cmp;
    });
  }

  sortByLieu(list: Cours_VM[], sens: 'ASC' | 'DESC'): Cours_VM[] {
    return [...list].sort((a, b) => {
      const cmp = this.normalize(a.lieu?.nom).localeCompare(
        this.normalize(b.lieu?.nom),
        'fr'
      );
      return sens === 'ASC' ? cmp : -cmp;
    });
  }

  private normalize(value?: string): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}