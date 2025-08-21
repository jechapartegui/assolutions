import { Pipe, PipeTransform, Injectable } from '@angular/core';
import { FilterAdherent } from '../app/adherent/adherent.component';
import { Professeur_VM } from '@shared/lib/prof.interface';

@Pipe({
  standalone: false,
  name: 'multifiltersProf',
})
@Injectable({
  providedIn: 'root', // Permet de l'utiliser comme un service global
})
export class MultifiltersProfPipe implements PipeTransform {
  transform(items: Professeur_VM[], filters: FilterAdherent): Professeur_VM[] {
    if (!items) return [];
    if (!filters) return items;
    return items.filter((item) => {
        return (
          (!filters.filter_nom ||
            item.person.nom.toLowerCase().includes(
              filters.filter_nom.toLowerCase()
            ))   
          )
      });
  }
  
}


