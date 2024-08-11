import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterActif'
})
export class FilterActifPipe implements PipeTransform {

  transform(items: any[], filter: number): any {
    if (!items || filter == null) {
      return items;
    }

    function check(item) {
      return item.actif == filter;
    }

    return items.filter(check);
  }

}
