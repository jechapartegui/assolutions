import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filternomseanceMenu'
})
export class FilterNomSeanceMenuPipe implements PipeTransform {

  transform(items: any[], filter: string): any {
    if (!items || !filter || filter.length == 0) {
      return items;
    }

    function check(item) {
      return item.thisSeance.libelle.toLowerCase().includes(filter.toString().toLowerCase());
    }

    return items.filter(check);
  }

}
