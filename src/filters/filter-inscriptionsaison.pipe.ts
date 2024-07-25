import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterInscriptionSaison'
})
export class filterInscriptionSaison implements PipeTransform {

  transform(items: any[], filter: number): any {
    if (!items || !filter || filter == 0) {
      return items;
    }
    return items.filter(item => item.Adhesions.some(adhesion => adhesion.saison_id === filter));
  }

}
