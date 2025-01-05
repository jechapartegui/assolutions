import { Pipe, PipeTransform, Injectable } from '@angular/core';
import { FilterStock } from 'src/app/stock/stock.component';
import { Stock } from 'src/class/stock';

@Pipe({
  name: 'multifiltersStock',
})
@Injectable({
  providedIn: 'root', // Permet de l'utiliser comme un service global
})
export class MultifiltersStockPipe implements PipeTransform {
  transform(items: Stock[], filters: FilterStock): Stock[] {
    if (!items) return [];
    if (!filters) return items;
    return items.filter((item) => {
      return (
        (!filters.filter_libelle ||
          item.Libelle.toLowerCase().includes(
            filters.filter_libelle.toLowerCase()
          )) &&
         
      (filters.filter_lieu === null ||
          item.LieuStockage === filters.filter_lieu)
      );
    });
  }
  
}
function extractTextBetweenParentheses(input: string): string | null {
  const match = input.match(/\((.*?)\)/);
  return match ? match[1] : null;
}


