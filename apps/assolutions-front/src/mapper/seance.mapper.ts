import { Injectable } from '@angular/core';
import {
  Cours_VM,
  Groupe,
  KeyValuePair,
  Saison,
  Seance,
  Seance_VM,
  CreateSeanceDto,
  UpdateSeanceDto,
  StatutSeance,
  calculerHeureFin as calculerHeureFinUtil,
} from '@shared/index';
import { SeanceFilterVm } from '../vm/seance-filter.vm';
import { SeancePageData, SeanceReferencesVm } from '../vm/seance-page.vm';

@Injectable({ providedIn: 'root' })
export class SeanceMapper {
  buildReferencesVm(
    listeCours: Cours_VM[],
    listeGroupe: Groupe[],
    listeLieu: KeyValuePair[],
    listeProf: KeyValuePair[],
    listeSaison: Saison[],
  ): SeanceReferencesVm {
    return {
      listeCours,
      listeGroupe,
      listeLieu,
      listeProf,
      listeSaison,
      liste_lieu_filter: [...listeLieu]
        .map((x) => x.value)
        .filter((x): x is string => !!x)
        .sort((a, b) => a.localeCompare(b, 'fr')),
      liste_prof_filter: [...listeProf].sort((a, b) =>
        a.value.localeCompare(b.value, 'fr')
      ),
      liste_groupe_filter: [...listeGroupe].sort((a, b) =>
        (a.nom ?? '').localeCompare(b.nom ?? '', 'fr')
      ),
      listeStatuts: [
        StatutSeance.prévue,
        StatutSeance.réalisée,
        StatutSeance.annulée,
      ],
    };
  }

  buildPageData(
    refs: SeanceReferencesVm,
    list: Seance_VM[],
    activeSaison: Saison | null,
  ): SeancePageData {
    // Certaines anciennes séances contiennent encore une heure_fin persistée
    // incohérente. L'éditeur travaille directement sur l'objet de la liste :
    // on la recalcule donc dès l'entrée dans la page, avant même toute édition.
    for (const seance of list) {
      seance.heure_fin = calculerHeureFinUtil(seance.heure_debut, seance.duree_seance);
    }

    return {
      refs,
      list: this.sortByDate([...list], 'ASC'),
      activeSaison,
    };
  }

  createDefaultFilter(): SeanceFilterVm {
    return new SeanceFilterVm();
  }

  calculerHeureFin(heureDebut: string, duree: number): string {
    return calculerHeureFinUtil(heureDebut, duree);
  }

  toSeance(vm: Seance_VM): CreateSeanceDto {
    const ageMinimum = vm.age_minimum ?? null;
    const ageMaximum = vm.age_maximum ?? null;

    return {
      seance_id: vm.id ?? 0,
      saison_id: vm.saison_id,
      cours: vm.cours || null,
      label: vm.nom ?? null,
      type_seance: vm.type_seance,
      date_seance: this.toIsoDate(vm.date_seance),
      heure_debut: vm.heure_debut,
      duree_seance: vm.duree_seance,
      // Toujours dérivée de l'heure de début et de la durée : aucune ancienne
      // valeur incohérente ne doit repartir vers le backend.
      heure_fin: calculerHeureFinUtil(vm.heure_debut, vm.duree_seance),
      lieu_id: vm.lieu_id,
      statut: vm.statut,
      age_minimum: ageMinimum,
      age_maximum: ageMaximum,
      place_maximum: vm.place_maximum ?? null,
      essai_possible: !!vm.essai_possible,
      nb_essai_possible: vm.nb_essai_possible ?? null,
      info_seance: vm.info_seance ?? null,
      convocation_nominative: !!vm.convocation_nominative,
      afficher_present: !!vm.afficher_present,
      appointment: vm.rdv ?? null,
      // Une borne renseignée est une limite effective. Les booléens sont
      // conservés pour compatibilité DB mais ne peuvent plus contredire la valeur.
      est_limite_age_minimum: ageMinimum !== null,
      est_limite_age_maximum: ageMaximum !== null,
      est_place_maximum: !!vm.est_place_maximum,
    };
  }

  toUpdateSeanceDto(vm: Seance_VM): UpdateSeanceDto {
    return this.toSeance(vm);
  }

  toSeanceVm(raw: Seance): Seance_VM {
    const vm = new Seance_VM();
    vm.id = raw.seance_id ?? raw.id ?? 0;
    vm.nom = raw.label ?? '';
    vm.saison_id = raw.saison_id ?? 0;
    vm.cours = raw.cours ?? 0;
    vm.type_seance = raw.type_seance as any;
    vm.date_seance = raw.date_seance ? new Date(raw.date_seance) : new Date();
    vm.heure_debut = raw.heure_debut ?? '11:00';
    vm.duree_seance = raw.duree_seance ?? 0;
    // L'heure de fin est une information calculée. Ne jamais réutiliser une
    // ancienne valeur persistée qui peut être incohérente avec début + durée.
    vm.heure_fin = calculerHeureFinUtil(vm.heure_debut, vm.duree_seance);
    vm.lieu_id = raw.lieu_id ?? 0;
    vm.statut = (raw.statut as any) ?? 'prévue';
    vm.age_minimum = raw.age_minimum ?? null;
    vm.age_maximum = raw.age_maximum ?? null;
    vm.place_maximum = raw.place_maximum ?? null;
    vm.essai_possible = !!raw.essai_possible;
    vm.nb_essai_possible = raw.nb_essai_possible ?? null;
    vm.info_seance = raw.info_seance ?? '';
    vm.convocation_nominative = !!raw.convocation_nominative;
    vm.afficher_present = !!raw.afficher_present;
    vm.rdv = raw.appointment ?? '';
    vm.est_limite_age_minimum = vm.age_minimum !== null;
    vm.est_limite_age_maximum = vm.age_maximum !== null;
    vm.est_place_maximum = !!raw.est_place_maximum;
    vm.seanceProfesseurs = [];
    vm.groupes = [];
    return vm;
  }

  private toIsoDate(value: Date | string): string {
    if (typeof value === 'string') {
      return value.slice(0, 10);
    }
    return new Date(
      Date.UTC(value.getFullYear(), value.getMonth(), value.getDate())
    ).toISOString().slice(0, 10);
  }

  sortByDate(list: Seance_VM[], sens: 'ASC' | 'DESC'): Seance_VM[] {
    return [...list].sort((a, b) => {
      const da = this.toDateTime(a).getTime();
      const db = this.toDateTime(b).getTime();
      return sens === 'ASC' ? da - db : db - da;
    });
  }

  sortByNom(list: Seance_VM[], sens: 'ASC' | 'DESC'): Seance_VM[] {
    return [...list].sort((a, b) => {
      const cmp = (a.nom ?? '').localeCompare(b.nom ?? '', 'fr');
      return sens === 'ASC' ? cmp : -cmp;
    });
  }

  sortByCours(list: Seance_VM[], sens: 'ASC' | 'DESC'): Seance_VM[] {
    return [...list].sort((a, b) => {
      const cmp = (a.cours_nom ?? '').localeCompare(b.cours_nom ?? '', 'fr');
      return sens === 'ASC' ? cmp : -cmp;
    });
  }

  sortByLieu(list: Seance_VM[], sens: 'ASC' | 'DESC'): Seance_VM[] {
    return [...list].sort((a, b) => {
      const cmp = (a.lieu_nom ?? '').localeCompare(b.lieu_nom ?? '', 'fr');
      return sens === 'ASC' ? cmp : -cmp;
    });
  }

  private toDateTime(seance: Seance_VM): Date {
    const d = new Date(seance.date_seance);
    const [h, m] = (seance.heure_debut ?? '00:00').split(':').map(Number);
    d.setHours(h || 0, m || 0, 0, 0);
    return d;
  }
}