import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterDateAvant'
})
export class FilterDateAvantPipe implements PipeTransform {

  transform(items: any[], filter: Date): any {
    if (!items || !filter ) {
      return items;
    }

    function check(item) {
      return item.date_seance<=filter;
    }

    return items.filter(check);
  }

}
