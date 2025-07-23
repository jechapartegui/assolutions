import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  standalone: false,
  name: 'filterLibelleNom'
})
export class FilterLibelleNomPipe implements PipeTransform {

  transform(items: any[], filter: string): any {
    if (!items || !filter || filter.length == 0) {
      return items;
    }

    function check(item) {
      let lib:string = "";
      if(item.Prenom && item.Prenom.length>0){
        lib = item.Prenom;
    }
    if(item.Nom && item.Nom.length>0){
        if(lib && lib.length>0){
          lib = lib + " " + item.Nom;
        } else {
          lib = item.Nom;
        }
    }
    if(item.Surnom && item.Surnom.length>0){
        if(lib && lib.length>0){
          lib = lib + " " + item.Surnom;
        } else {
          lib = item.Surnom;
        }
    }
      return lib.toLowerCase().includes(filter.toString().toLowerCase());
    }

    return items.filter(check);
  }

}
