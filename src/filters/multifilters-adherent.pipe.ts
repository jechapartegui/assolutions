import { Pipe, PipeTransform, Injectable } from '@angular/core';
import { Adherent } from 'src/class/adherent';
import { Stock } from 'src/class/stock';

@Pipe({
  name: 'multifiltersAdherent',
})
@Injectable({
  providedIn: 'root', // Permet de l'utiliser comme un service global
})
export class MultifiltersAdherentPipe implements PipeTransform {
  transform(items: Adherent[], filters: { [key: string]: any }): Adherent[] {
    console.log(filters)
    if (!items) return [];
    if (!filters) return items;

    return items.filter((item) => {
      return Object.keys(filters).every((key) => {
        const filterValue = filters[key];
        if (!filterValue) return true;
        console.log(key);
        console.log(filterValue);
        switch (key) {
          case 'filter_nom':
            return item.Libelle.toLowerCase().includes(
              filterValue.toString().toLowerCase()
            );
          case 'filter_date_avant':
            return item.DDN <= filterValue;
          case 'filter_date_apres':
            return item.DDN >= filterValue;
          case 'filter_groupe':
            return item.Groupes.find((x) =>
              x.nom.toLowerCase().includes(filterValue.toString().toLowerCase())
            );
          case 'filter_inscrit':
            return item.Inscrit == filterValue;
          case 'filter_sexe':
            return item.Sexe == filterValue;
          // case 'filter_equipement':
          //   return item.TypeStock?.libelle === filterValue;
          default:
            return true;
        }
      });
    });
  }
}
