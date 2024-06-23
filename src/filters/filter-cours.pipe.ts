import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterCours'
})
export class FilterCoursPipe implements PipeTransform {

  transform(items: any[], filter: number): any {
    if (!items || !filter || filter == 0) {
      return items;
    }

    function check(item) {
      return item.cours=filter;
    }

    return items.filter(check);
  }

}
