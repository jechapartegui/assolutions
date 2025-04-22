import { Pipe, PipeTransform, Injectable } from '@angular/core';
import { FilterCompte } from 'src/app/compte/compte.component';
import { compte } from 'src/class/compte';

@Pipe({
  name: 'multifiltersCompte',
})
@Injectable({
  providedIn: 'root', // Permet de l'utiliser comme un service global
})
export class MultifiltersComptePipe implements PipeTransform {
  transform(items: compte[], filters: FilterCompte): compte[] {
    if (!items) return [];
    if (!filters) return items;
    return items.filter((item) => {
      return (
        (!filters.filter_email ||
          item.login.toLowerCase().includes(
            filters.filter_email.toLowerCase()
          )) 
      );
    });
  }
  
}


