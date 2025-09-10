import { Injectable } from '@angular/core';
import { GlobalService } from './global.services';
import { environment } from '../environments/environment.prod';
import { Operation_VM } from '@shared/lib/operation.interface';

@Injectable({ providedIn: 'root' })
export class OperationService {
private base = environment.maseance + 'api/admin/op';
constructor(private http: GlobalService) {}


public get(id: number): Promise<Operation_VM> {
return this.http.GET(`${this.base}/get/${id}`);
}


public byAccount(compteId: number): Promise<Operation_VM[]> {
return this.http.GET(`${this.base}/by-account/${compteId}`);
}


public byFlow(flowId: number): Promise<Operation_VM[]> {
return this.http.GET(`${this.base}/by-flow/${flowId}`);
}


public add(payload: Partial<Operation_VM>): Promise<number> {
return this.http.PUT(`${this.base}/add`, payload);
}


public update(payload: Partial<Operation_VM> & { id: number }): Promise<boolean> {
return this.http.PUT(`${this.base}/update`, payload);
}


public delete(id: number): Promise<boolean> {
return this.http.DELETE(`${this.base}/delete/${id}`);
}
}

