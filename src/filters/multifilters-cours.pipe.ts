
import { Pipe, PipeTransform } from '@angular/core';
import { Cours } from 'src/class/cours';
import { FilterCours } from 'src/app/cours/cours.component';

@Pipe({
  name: 'multifiltersCours',
  pure: false, // Le pipe sera recalculé à chaque cycle de détection
})
export class MultifiltersCoursPipe implements PipeTransform {
  transform(items: Cours[], filters: FilterCours): Cours[] {
    if (!items) return [];
    if (!filters) return items;

    return items.filter((item) => {
      return (
        (!filters.filter_nom ||
          item.Nom.toLowerCase().includes(
            filters.filter_nom.toLowerCase()
          )) &&
          (!filters.filter_lieu ||
            item.LieuId == filters.filter_lieu
            ) &&
            (!filters.filter_jour ||
                item.JourSemaine == filters.filter_jour
                ) &&
     
        (!filters.filter_groupe ||
          item.Groupes.some((x) =>
            x.nom.toLowerCase().includes(
              filters.filter_groupe?.toLowerCase() ?? ''
            )
          )) && 
          (!filters.filter_prof ||
            item.ProfPrincipalId == 
                filters.filter_prof
              ))
              
        });
  }
}

