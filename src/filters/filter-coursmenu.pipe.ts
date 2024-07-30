import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterCoursMenu'
})
export class FilterCoursMenuPipe implements PipeTransform {

  transform(items: any[], filter: number): any {
    if (!items || !filter || filter == 0) {
      return items;
    }

    function check(item) {
      return item.thisSeance.cours=filter;
    }

    return items.filter(check);
  }

}
