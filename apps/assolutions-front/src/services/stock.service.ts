import { Injectable } from '@angular/core';
import { environment } from '../environments/environment.prod';
import { GlobalService } from './global.services';
import { Stock_VM } from '@shared/lib/stock.interface';
import { AppStore } from '../app/app.store';

@Injectable({ providedIn: 'root' })
export class StockService {
  url = environment.maseance;
constructor(private global: GlobalService,private store:AppStore){}


public get(id: number): Promise<Stock_VM> {
this.url = environment.maseance + `api/admin/stock/get/${id}`;
   return this.global.GET(this.url)
      .then((response: Stock_VM) => {

        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
}


public getAll(): Promise<Stock_VM[]> {
this.url = environment.maseance + `api/admin/stock/getall/`;
   return this.global.GET(this.url)
      .then((response: Stock_VM[]) => {

        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
}


public add(payload: Partial<Stock_VM>): Promise<number> {
this.url = environment.maseance + 'api/admin/stock/add';
    //  this.url = this.url + "login.php";
   

    return this.global.PUT(this.url, payload)
      .then((response: number) => {

        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
}


public update(payload: Partial<Stock_VM> & { id: number }): Promise<boolean> {
this.url = environment.maseance + 'api/admin/stock/update';
    //  this.url = this.url + "login.php";
   

    return this.global.PUT(this.url, payload)
      .then((response: boolean) => {

        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
}


public delete(id: number): Promise<boolean> {
 this.url = environment.maseance +  "api/seance/delete/" ; 
    const body = {
      id: id, 
    };

    return this.global.POST(this.url, body)
      .then((response: boolean) => {
        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }
}