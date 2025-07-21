
import { Pipe, PipeTransform } from '@angular/core';
import { FilterSaison } from '../app/saison/saison.component';
import { Saison_VM } from '@shared/src';
@Pipe({
  name: 'multifiltersSaison',
  pure: false, // Le pipe sera recalculé à chaque cycle de détection
})
export class MultifiltersSaisonPipe implements PipeTransform {
  transform(items: Saison_VM[], filters: FilterSaison): Saison_VM[] {
    if (!items) return [];
    if (!filters) return items;

    return items.filter((item) => {
      return (
        (!filters.filter_nom ||
          item.nom.toLowerCase().includes(
            filters.filter_nom.toLowerCase()
          )) &&
         
        (!filters.filter_date_debut_avant ||
          new Date(item.date_debut) <= filters.filter_date_debut_avant) &&
        (!filters.filter_date_debut_apres || new Date(item.date_debut) >= filters.filter_date_debut_apres) &&

        (!filters.filter_date_fin_avant ||
          new Date(item.date_fin) <= filters.filter_date_fin_avant) &&
        (!filters.filter_date_fin_apres || new Date(item.date_fin) >= filters.filter_date_fin_apres) &&
               (filters.filter_active === null ||
          item.active === filters.filter_active)
      );
    });
  }
}

