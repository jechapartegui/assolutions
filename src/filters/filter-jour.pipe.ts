import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterJour'
})
export class FilterJourPipe implements PipeTransform {

  transform(items: any[], filter: number): any {
    if (!items || !filter || filter == 0) {
      return items;
    }

    function check(item) {
      return item.JourSemaine.toLowerCase() == filter.toString().toLowerCase();
    }

    return items.filter(check);
  }

}
