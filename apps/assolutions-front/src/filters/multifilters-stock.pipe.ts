import { Pipe, PipeTransform, Injectable } from '@angular/core';
import { FilterStock } from '../app/stock/stock.component';
import { Stock_VM } from '@shared/index';

@Pipe({
  standalone: false,
  name: 'multifiltersStock',
})
@Injectable({
  providedIn: 'root', // Permet de l'utiliser comme un service global
})
export class MultifiltersStockPipe implements PipeTransform {
  transform(items: Stock_VM[], filters: FilterStock): Stock_VM[] {
    if (!items) return [];
    if (!filters) return items;
    return items.filter((item) => {
      return (
        (!filters.filter_libelle ||
          item.libelle.toLowerCase().includes(
            filters.filter_libelle.toLowerCase()
          )) &&
         
      (filters.filter_lieu === null ||
          item.lieu_stockage === filters.filter_lieu)
      );
    });
  }
  
}


