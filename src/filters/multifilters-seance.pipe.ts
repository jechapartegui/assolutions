
import { Pipe, PipeTransform } from '@angular/core';
import { FilterSeance } from 'src/app/seance/seance.component';
import { Seance } from 'src/class/seance';

@Pipe({
  name: 'multifiltersSeance',
  pure: false, // Le pipe sera recalculé à chaque cycle de détection
})
export class MultifiltersSeancePipe implements PipeTransform {
  transform(items: Seance[], filters: FilterSeance): Seance[] {
    if (!items) return [];
    if (!filters) return items;

    return items.filter((item) => {
      return (
        (!filters.filter_nom ||
          item.libelle.toLowerCase().includes(
            filters.filter_nom.toLowerCase()
          )) &&
          (!filters.filter_lieu ||
            item.Lieu.toLowerCase().includes(
              filters.filter_lieu.toLowerCase()
            )) &&
        (!filters.filter_date_avant ||
          new Date(item.date_seance) <= filters.filter_date_avant) &&
        (!filters.filter_date_apres || new Date(item.date_seance) >= filters.filter_date_apres) &&
        (!filters.filter_groupe ||
          item.Groupes.some((x) =>
            x.nom.toLowerCase().includes(
              filters.filter_groupe?.toLowerCase() ?? ''
            )
          )) && 
          (!filters.filter_prof ||
            item.professeurs.some((x) =>
             (x.value).toLowerCase().includes(
                filters.filter_prof?.toLowerCase() ?? ''
              )
            )) &&
        (filters.filter_statut === null ||
          item.Statut === filters.filter_statut)
      );
    });
  }
}

