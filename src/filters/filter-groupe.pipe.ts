import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterGroupe'
})
export class FilterGroupePipe implements PipeTransform {

  transform(items: any[], filter: number): any {
    if (!items || !filter || filter == 0) {
      return items;
    }

    function check(item) {
      return item.Groupes.find(x => x.id == filter);
    }

    return items.filter(check);
  }

}
