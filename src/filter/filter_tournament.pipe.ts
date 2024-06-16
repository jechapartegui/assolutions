import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterTournament',
})
export class FilterTournamentPipe implements PipeTransform {
  transform(items: any[], filter: number): any {
    if (!items || !filter || filter == 0) {
      return items;
    }

    function check(item) {
      return item.competition_id==filter;
    }

    return items.filter(check);
  }

}
