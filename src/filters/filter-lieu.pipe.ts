import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterLieu'
})
export class FilterLieuPipe implements PipeTransform {

  transform(items: any[], filter: number): any {
    if (!items || !filter || filter == 0) {
      return items;
    }

    function check(item) {
      return item.LieuId == filter;
    }

    return items.filter(check);
  }

}