
import { Pipe, PipeTransform } from '@angular/core';
import { FilterAdherent } from '../app/adherent/adherent.component';
import { Adherent_VM } from '@shared/lib/member.interface';

@Pipe({
  standalone: false,
  name: 'multifiltersAdherent',
  pure: false, // Le pipe sera recalculé à chaque cycle de détection
})
export class MultifiltersAdherentPipe implements PipeTransform {
  transform(items: Adherent_VM[], filters: FilterAdherent, saison_id: number): Adherent_VM[] {
    if (!items) return [];
    if (!filters) return items;

    return items.filter((item) => {
      return (
        (!filters.filter_nom ||
          item.libelle.toLowerCase().includes(
            filters.filter_nom.toLowerCase()
          )) &&
        (!filters.filter_date_avant ||
          new Date(item.date_naissance) <= filters.filter_date_avant) &&
        (!filters.filter_date_apres || new Date(item.date_naissance) >= filters.filter_date_apres) &&
        (!filters.filter_groupe ||
          item.inscriptionsSaison[0].groupes.some((x) =>
            x.nom.toLowerCase().includes(
              filters.filter_groupe?.toLowerCase() ?? ''
            )
          )) &&
        (filters.filter_inscrit === null ||
          item.inscriptionsSaison.some( x => x.saison_id == saison_id)) &&
        (filters.filter_sexe === null || item.sexe === filters.filter_sexe)
      );
    });
  }
}

