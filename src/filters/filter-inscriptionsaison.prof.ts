import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterInscriptionSaisonProf'
})
export class filterInscriptionSaisonProf implements PipeTransform {

  transform(items: any[], filter: number): any {
    if (!items || !filter || filter == 0) {
      return items;
    }
    return items.filter(item => item.saisons.some(s => s.saison_id === filter));
  }

}
