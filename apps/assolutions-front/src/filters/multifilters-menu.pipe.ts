import { Pipe, PipeTransform, Injectable } from '@angular/core';
import { FilterMenu } from '../app/menu/menu.component';
import { MesSeances } from '@shared/compte/src/lib/seance.interface';

@Pipe({
  name: 'multifiltersMenu',
  pure: false // Le pipe sera recalculé lorsque les filtres changent
})
@Injectable({
  providedIn: 'root', // Permet de l'utiliser comme un service global
})
export class MultifiltersMenuPipe implements PipeTransform {
  transform(items: MesSeances[], filters: FilterMenu): MesSeances[] {
    if (!items) return [];
    if (!filters) return items;

    return items.filter((item) => {
      const dateAvant = filters.filter_date_avant ? new Date(filters.filter_date_avant) : null;
      const dateApres = filters.filter_date_apres ? new Date(filters.filter_date_apres) : null;
      const dateSeance = new Date(item.date);
    
      return (
        (!filters.filter_nom ||
          item.nom.toLowerCase().includes(
            filters.filter_nom.toLowerCase()
          )) &&
        (!filters.filter_lieu ||
          item.lieu.toLowerCase().includes(
            filters.filter_lieu.toLowerCase()
          )) &&
        (!filters.filter_date_avant || (dateAvant && dateSeance >= dateAvant)) &&
        (!filters.filter_date_apres || (dateApres && dateSeance <= dateApres)) &&       
        (!filters.filter_prof ||
          item.professeur.some((x) =>
            (x[1]).toLowerCase().includes(
              filters.filter_prof?.toLowerCase() ?? ''
            )
          )) &&
        (filters.filter_statut === null ||
          item.statut === filters.filter_statut)
      );
    });
    
  }
}
