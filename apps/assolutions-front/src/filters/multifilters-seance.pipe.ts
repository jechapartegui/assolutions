
import { Pipe, PipeTransform } from '@angular/core';
import { FilterSeance } from '../app/seance/seance.component';
import { SeanceVM } from '@shared/src';

@Pipe({
  name: 'multifiltersSeance',
  pure: false, // Le pipe sera recalculé à chaque cycle de détection
})
export class MultifiltersSeancePipe implements PipeTransform {
  transform(items: SeanceVM[], filters: FilterSeance): SeanceVM[] {
    if (!items) return [];
    if (!filters) return items;

    return items.filter((item) => {
      
      const dateAvant = filters.filter_date_avant ? new Date(filters.filter_date_avant) : null;
      const dateApres = filters.filter_date_apres ? new Date(filters.filter_date_apres) : null;
      const dateSeance = new Date(item.date_seance);
      return (
        (!filters.filter_nom ||
          item.libelle.toLowerCase().includes(
            filters.filter_nom.toLowerCase()
          )) &&
          (!filters.filter_lieu ||
            item.lieu_nom.toLowerCase().includes(
              filters.filter_lieu.toLowerCase()
            )) &&
            (!filters.filter_date_avant || (dateAvant && dateSeance >= dateAvant)) &&
            (!filters.filter_date_apres || (dateApres && dateSeance <= dateApres)) &&       
        (!filters.filter_groupe ||
          item.groupes.some((x) =>
            x.nom.toLowerCase().includes(
              filters.filter_groupe?.toLowerCase() ?? ''
            )
          )) && 
          (!filters.filter_prof ||
            item.seanceProfesseurs.some((x) =>
             (x.nom).toLowerCase().includes(
                filters.filter_prof?.toLowerCase() ?? ''
              )
            )) &&
        (filters.filter_statut === null ||
          item.statut === filters.filter_statut)
      );
    });
  }
}

