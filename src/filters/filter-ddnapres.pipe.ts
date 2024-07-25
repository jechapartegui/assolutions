import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterDDNApres'
})
export class FilterDDNApresPipe implements PipeTransform {

  transform(items: any[], filter: Date): any {
    if (!items || !filter ) {
      return items;
    }

    function check(item) {
      return item.DDN>=filter;
    }

    return items.filter(check);
  }

}
