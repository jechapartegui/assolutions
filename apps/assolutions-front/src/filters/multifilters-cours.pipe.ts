
import { Pipe, PipeTransform } from '@angular/core';
import { FilterCours } from '../app/cours/cours.component';
import { CoursVM } from '@shared/src';
@Pipe({
  name: 'multifiltersCours',
  pure: false, // Le pipe sera recalculé à chaque cycle de détection
})
export class MultifiltersCoursPipe implements PipeTransform {
  transform(items: CoursVM[], filters: FilterCours): CoursVM[] {
    if (!items) return [];
    if (!filters) return items;

    return items.filter((item) => {
      return (
        (!filters.filter_nom ||
          item.nom.toLowerCase().includes(
            filters.filter_nom.toLowerCase()
          )) &&
          (!filters.filter_lieu ||
            item.lieu_id == filters.filter_lieu
            ) &&
            (!filters.filter_jour ||
                item.jour_semaine == filters.filter_jour
                ) &&
     
        (!filters.filter_groupe ||
          item.groupes.some((x) =>
            x.nom.toLowerCase().includes(
              filters.filter_groupe?.toLowerCase() ?? ''
            )
          )) && 
          (!filters.filter_prof ||
            item.prof_principal_id == 
                filters.filter_prof
              ))
              
        });
  }
}

