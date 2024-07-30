import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterLieuMenu'
})
export class FilterLieuMenuPipe implements PipeTransform {

  transform(items: any[], filter: number): any {
    if (!items || !filter || filter == 0) {
      return items;
    }

    function check(item) {
      return item.thisSeance.lieu_id == filter;
    }

    return items.filter(check);
  }

}