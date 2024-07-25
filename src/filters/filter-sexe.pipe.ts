import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterSexe'
})
export class FilterSexePipe implements PipeTransform {

  transform(items: any[], filter: boolean): any {
    if (!items || filter == null) {
      return items;
    }

    function check(item) {
      return item.Sexe == filter;
    }

    return items.filter(check);
  }

}
