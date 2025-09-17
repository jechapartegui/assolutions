import { Injectable } from '@angular/core';
import { GlobalService } from './global.services';
import { environment } from '../environments/environment.prod';
import { Operation_VM } from '@shared/lib/operation.interface';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class OperationService {
  url = environment.maseance;
constructor(private global: GlobalService) {}


public get(id: number): Promise<Operation_VM> {
 this.url = environment.maseance + 'api/admin/op/get/' + id;
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
public getAllByAccount(compte_id:number): Promise<Operation_VM[]> {

 this.url = environment.maseance + 'api/admin/op/by-account/' + compte_id.toString();
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

public getAllByFF(ff_id:number): Promise<Operation_VM[]> {

 this.url = environment.maseance + 'api/admin/op/by-flow/' + ff_id.toString();
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


public add(vm: Partial<Operation_VM>): Promise<Operation_VM> {
  this.url = environment.maseance + 'api/admin/op/add';

  return this.global.PUT(this.url, vm)
    .then((response: Operation_VM) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}


public update(vm: Partial<Operation_VM>): Promise<Operation_VM> {
this.url = environment.maseance + 'api/admin/op/update';
  return this.global.PUT(this.url, vm)
    .then((response: Operation_VM) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public Delete(id:number) {
  this.url = environment.maseance + 'api/admin/op/delete/';
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
