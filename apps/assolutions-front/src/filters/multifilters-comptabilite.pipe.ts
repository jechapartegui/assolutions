
import { Pipe, PipeTransform } from '@angular/core';
import { FluxFinancier_VM } from '@shared/index';
import { filterFF } from '../app/comptabilite/comptabilite.component';

@Pipe({
  standalone: false,
  name: 'multifiltersFF',
  pure: false, // Le pipe sera recalculé à chaque cycle de détection
})
export class MultifiltersFFPipe implements PipeTransform {
  transform(items: FluxFinancier_VM[], filters: filterFF): FluxFinancier_VM[] {
    if (!items) return [];
    if (!filters) return items;

    return items.filter((item) => {
      return (
        (!filters.filter_libelle_ff ||
          item.libelle.toLowerCase().includes(
            filters.filter_libelle_ff.toLowerCase()
          )) &&
        (!filters.filter_date_debut_ff ||
          new Date(item.date) <= filters.filter_date_debut_ff) &&
        (!filters.filter_date_fin_ff || new Date(item.date) >= filters.filter_date_fin_ff)
       
      );
    });
  }
}

