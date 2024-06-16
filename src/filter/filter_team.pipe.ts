import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterTeam'
})
export class FilterTeamPipe implements PipeTransform {

  transform(items: any[], filter: number): any {
    if (!items || !filter || filter == 0) {
      return items;
    }

    function check(item) {
      return item.team_away_id==filter || item.team_home_id==filter;
    }

    return items.filter(check);
  }

}
