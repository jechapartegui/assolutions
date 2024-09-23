import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterInscriptionSaison'
})
export class filterInscriptionSaison implements PipeTransform {

  transform(items: any[], filter: boolean): any {
    if (!items || filter == null) {
      return items;
    }

    function check(item) {
      if (filter == false) {
        return true;
      } else {
        return item.Inscrit == true;

      }
    }

    return items.filter(check);
  }

}
