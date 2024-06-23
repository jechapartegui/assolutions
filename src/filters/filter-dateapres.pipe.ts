import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterDateApres'
})
export class FilterDateApresPipe implements PipeTransform {

  transform(items: any[], filter: Date): any {
    if (!items || !filter ) {
      return items;
    }

    function check(item) {
      return item.date_seance>=filter;
    }

    return items.filter(check);
  }

}
