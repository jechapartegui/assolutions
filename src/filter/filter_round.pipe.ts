import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterRound'
})
export class FilterRoundPipe implements PipeTransform {

  transform(items: any[], filter: number): any {
    if (!items || !filter || filter == 0) {
      return items;
    }

    function check(item) {
      return item.round_id==filter;
    }

    return items.filter(check);
  }

}
