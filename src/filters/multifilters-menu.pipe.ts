import { Pipe, PipeTransform, Injectable } from '@angular/core';
import { FilterAdherent } from 'src/app/adherent/adherent.component';
import { InscriptionSeance } from 'src/class/inscription';
import { Professeur } from 'src/class/professeur';

@Pipe({
  name: 'multifiltersMenu',
})
@Injectable({
  providedIn: 'root', // Permet de l'utiliser comme un service global
})
export class MultifiltersMenuPipe implements PipeTransform {
  transform(items: InscriptionSeance[], filters: FilterInscriptionSeance): InscriptionSeance[] {
    if (!items) return [];
    if (!filters) return items;
    return items.filter((item) => {
        return (
          (!filters.filter_nom ||
            item.Libelle.toLowerCase().includes(
              filters.filter_nom.toLowerCase()
            )) &&          (!filters.filter_sexe ||
                item.Sexe == filters.filter_sexe
                ) &&
          (!filters.filter_date_avant ||
            new Date(item.DDN) <= filters.filter_date_avant) &&
          (!filters.filter_date_apres || new Date(item.DDN) >= filters.filter_date_apres)
          )
      });
  }
  
}


