import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterProf'
})
export class FilterProfPipe implements PipeTransform {

  transform(items: any[], filter: number): any {
    if (!items || !filter || filter == 0) {
      return items;
    }

    function check(item) {
      return item.ProfPrincipalId == filter;
    }

    return items.filter(check);
  }

}
