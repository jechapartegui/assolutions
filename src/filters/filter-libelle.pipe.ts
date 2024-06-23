import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterLibelle'
})
export class FilterLibellePipe implements PipeTransform {

  transform(items: any[], filter: string): any {
    if (!items || !filter || filter.length == 0) {
      return items;
    }

    function check(item) {
      return item.libelle.toLowerCase().includes(filter.toString().toLowerCase());
    }

    return items.filter(check);
  }

}
