import { Injectable } from '@angular/core';
import { GlobalService } from './global.services';
import { environment } from '../environments/environment.prod';
import { FluxFinancier_VM } from '@shared/index';
import { HttpErrorResponse } from '@angular/common/http';


@Injectable({ providedIn: 'root' })
export class ComptabiliteService {
  url = environment.maseance;
constructor(private global: GlobalService) {}


public get(id: number): Promise<FluxFinancier_VM> {
 this.url = environment.maseance + 'api/admin/flow/get/' + id;
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
public getAll(): Promise<FluxFinancier_VM[]> {

 this.url = environment.maseance + 'api/admin/flow/getall/';
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

public getAllSeason(saison_id:number): Promise<FluxFinancier_VM[]> {

 this.url = environment.maseance + 'api/admin/flow/getall_season/' + saison_id;
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


public add(vm: Partial<FluxFinancier_VM>): Promise<FluxFinancier_VM> {
  this.url = environment.maseance + 'api/admin/flow/add';

  return this.global.PUT(this.url, vm)
    .then((response: FluxFinancier_VM) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}


public update(vm: Partial<FluxFinancier_VM>): Promise<FluxFinancier_VM> {
this.url = environment.maseance + 'api/admin/flow/update';
  return this.global.PUT(this.url, vm)
    .then((response: FluxFinancier_VM) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public Delete(id:number) {
  this.url = environment.maseance + 'api/admin/flow/delete/';
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
