import { Pipe, PipeTransform, Injectable } from '@angular/core';
import { FilterAdherent } from '../app/adherent/adherent.component';
import { ProfesseurVM } from '@shared/src';

@Pipe({
  name: 'multifiltersProf',
})
@Injectable({
  providedIn: 'root', // Permet de l'utiliser comme un service global
})
export class MultifiltersProfPipe implements PipeTransform {
  transform(items: ProfesseurVM[], filters: FilterAdherent): ProfesseurVM[] {
    if (!items) return [];
    if (!filters) return items;
    return items.filter((item) => {
        return (
          (!filters.filter_nom ||
            item.nom.toLowerCase().includes(
              filters.filter_nom.toLowerCase()
            ))   
          )
      });
  }
  
}


