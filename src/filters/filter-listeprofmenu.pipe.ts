import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterListProfMenu'
})
export class FilterListProfMenuPipe implements PipeTransform {

  transform(items: any[], filter: number): any {
    if (!items || !filter || filter == 0) {
      return items;
    }

    function check(item) {
      if(item.thisSeance.professeurs.find(x=> x.key == filter)){
        return true;
      } else {
        return false;
      }
    }

    return items.filter(check);
  }

}