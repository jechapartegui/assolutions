import { Injectable } from '@angular/core';
import { GlobalService } from './global.services';
import { environment } from '../environments/environment.prod';
import { CompteBancaire_VM } from '@shared/index';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class CompteBancaireService {
  url = environment.maseance;
constructor(private global: GlobalService) {}


public get(id: number): Promise<CompteBancaire_VM> {
 this.url = environment.maseance + 'api/admin/bank/get/' + id;
    //  this.url = this.url + "login.php";
   

    return this.global.GET(this.url)
      .then((response: any) => {
        return response;
      })
      .catch((error: HttpErrorResponse) => {
        console.error('Erreur brute', error);
        const message = error?.message || 'Erreur inconnue';
        console.error(message);        // Gestion de l'erreur
        return Promise.reject(message);
      });
  }
public getAll(): Promise<CompteBancaire_VM[]> {

 this.url = environment.maseance + 'api/admin/bank/getall/';
    //  this.url = this.url + "login.php";
   

    return this.global.GET(this.url)
      .then((response: any) => {
        return response;
      })
      .catch((error: HttpErrorResponse) => {
        console.error('Erreur brute', error);
        const message = error?.message || 'Erreur inconnue';
        console.error(message);        // Gestion de l'erreur
        return Promise.reject(message);
      });
  }



public add(vm: Partial<CompteBancaire_VM>): Promise<number> {
  this.url = environment.maseance + 'api/admin/bank/add';

  return this.global.PUT(this.url, vm)
    .then((response: number) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}


public update(vm: Partial<CompteBancaire_VM>): Promise<boolean> {
this.url = environment.maseance + 'api/admin/bank/update';
  return this.global.PUT(this.url, vm)
    .then((response: boolean) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public delete(id:number) {
  this.url = environment.maseance + 'api/admin/bank/delete/';
 const body = {
      id: id
    };

    return this.global.POST(this.url, body)
    .then(() => {
      return;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
}
