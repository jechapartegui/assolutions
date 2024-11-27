import { Pipe, PipeTransform, Injectable } from '@angular/core';
import { Stock } from 'src/class/stock';

@Pipe({
  name: 'multifiltersStock',
})
@Injectable({
  providedIn: 'root', // Permet de l'utiliser comme un service global
})
export class MultifiltersStockPipe implements PipeTransform {
  transform(items: Stock[], filters: { [key: string]: any }): Stock[] {
    if (!items) return [];
    if (!filters) return items;

    return items.filter(item => {
      return Object.keys(filters).every(key => {
        const filterValue = filters[key];
        if (!filterValue) return true;

        switch (key) {
          case 'filter_libelle':
            return item.Libelle.toLowerCase().includes(filterValue.toString().toLowerCase());
          case 'filter_date_avant':
            return item.Date <= filterValue;
          case 'filter_date_apres':
            return item.Date >= filterValue;
          case 'filter_lieu':
            return item.LieuStockageLibelle.toLowerCase().includes(filterValue.toString().toLowerCase());
          // case 'filter_type_equipement':
          //   return item.TypeStock?.categorie === filterValue;
          // case 'filter_equipement':
          //   return item.TypeStock?.libelle === filterValue;
          default:
            return true;
        }
      });
    });
  }
}
