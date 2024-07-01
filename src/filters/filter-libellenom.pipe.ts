import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterLibelleNom'
})
export class FilterLibelleNomPipe implements PipeTransform {

  transform(items: any[], filter: string): any {
    if (!items || !filter || filter.length == 0) {
      return items;
    }

    function check(item) {
      let lib:string = "";
      if(item.prenom && item.prenom.length>0){
        lib = item.prenom;
    }
    if(item.nom && item.nom.length>0){
        if(lib && lib.length>0){
          lib = lib + " " + item.nom;
        } else {
          lib = item.nom;
        }
    }
    if(item.surnom && item.surnom.length>0){
        if(lib && lib.length>0){
          lib = lib + " " + item.surnom;
        } else {
          lib = item.surnom;
        }
    }
      return lib.toLowerCase().includes(filter.toString().toLowerCase());
    }

    return items.filter(check);
  }

}
