import { Pipe, PipeTransform, Injectable } from '@angular/core';
import { FilterMenu } from '../app/menu/menu.component';
import { MesSeances_VM } from '@shared/src/lib/seance.interface';

@Pipe({
  standalone: false,
  name: 'multifiltersMenu',
  pure: false // Le pipe sera recalculé lorsque les filtres changent
})
@Injectable({
  providedIn: 'root', // Permet de l'utiliser comme un service global
})
export class MultifiltersMenuPipe implements PipeTransform {
  transform(items: MesSeances_VM[], filters: FilterMenu): MesSeances_VM[] {
    if (!items) return [];
    if (!filters) return items;

    return items.filter((item) => {
      const dateAvant = filters.filter_date_avant ? new Date(filters.filter_date_avant) : null;
      const dateApres = filters.filter_date_apres ? new Date(filters.filter_date_apres) : null;
      const dateSeance = new Date(item.seance.date_seance);
    
      return (
        (!filters.filter_nom ||
          item.seance.libelle.toLowerCase().includes(
            filters.filter_nom.toLowerCase()
          )) &&
        (!filters.filter_lieu ||
          item.seance.lieu_nom.toLowerCase().includes(
            filters.filter_lieu.toLowerCase()
          )) &&
        (!filters.filter_date_avant || (dateAvant && dateSeance >= dateAvant)) &&
        (!filters.filter_date_apres || (dateApres && dateSeance <= dateApres)) &&       
        (!filters.filter_prof ||
          item.seance.seanceProfesseurs.some((x) =>
            (x[1].person.nom).toLowerCase().includes(
              filters.filter_prof?.toLowerCase() ?? ''
            )
          )) &&
        (filters.filter_statut === null ||
          item.seance.statut === filters.filter_statut)
      );
    });
    
  }
}
