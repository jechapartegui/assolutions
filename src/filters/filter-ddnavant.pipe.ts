import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterDDNAvant'
})
export class FilterDDNAvantPipe implements PipeTransform {

  transform(items: any[], filter: Date): any {
    if (!items || !filter ) {
      return items;
    }

    function check(item) {
      return item.DDN<=filter;
    }

    return items.filter(check);
  }

}
