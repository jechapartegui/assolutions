import { Injectable } from '@angular/core';
import { environment } from '../environments/environment.prod';
import { GlobalService } from './global.services';
import { Stock_VM } from '@shared/lib/stock.interface';

@Injectable({ providedIn: 'root' })
export class StockService {
private base = environment.maseance + 'api/admin/stock';
constructor(private http: GlobalService) {}


public get(id: number): Promise<Stock_VM> {
return this.http.GET(`${this.base}/get/${id}`);
}


public getAll(): Promise<Stock_VM[]> {
return this.http.GET(`${this.base}/getall/`);
}


public add(payload: Partial<Stock_VM>): Promise<number> {
return this.http.PUT(`${this.base}/add`, payload);
}


public update(payload: Partial<Stock_VM> & { id: number }): Promise<boolean> {
return this.http.PUT(`${this.base}/update`, payload);
}


public delete(id: number): Promise<boolean> {
return this.http.DELETE(`${this.base}/delete/${id}`);
}
}