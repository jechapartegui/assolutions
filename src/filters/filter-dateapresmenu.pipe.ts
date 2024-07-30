import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterDateApresMenu'
})
export class FilterDateApresMenuPipe implements PipeTransform {

  transform(items: any[], filter: Date): any {
    if (!items || !filter ) {
      return items;
    }

    function check(item) {
      return item.thisSeance.date_seance>=filter;
    }

    return items.filter(check);
  }

}
