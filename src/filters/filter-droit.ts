import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterDroit'
})
export class FilterDroitPipe implements PipeTransform {

  transform(items: any[], filter: number): any {
    if (!items || filter == null) {
      return items;
    }

    function check(item) {
      return item.droit == filter;
    }

    return items.filter(check);
  }

}
