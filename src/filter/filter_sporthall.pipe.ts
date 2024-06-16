import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterSporthall',
})
export class FilterSporthallPipe implements PipeTransform {
  transform(items: any[], filter: number): any {
    if (!items || !filter ) {
      return items;
    }

    function check(item) {
      return item.sporthall_id==filter;
    }

    return items.filter(check);
  }

}
