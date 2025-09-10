import { Injectable } from '@angular/core';
import { GlobalService } from './global.services';
import { environment } from '../environments/environment.prod';
import { CompteBancaire_VM } from '@shared/index';

@Injectable({ providedIn: 'root' })
export class CompteBancaireService {
private base = environment.maseance + 'api/admin/bank';
constructor(private http: GlobalService) {}


public get(id: number): Promise<CompteBancaire_VM> {
return this.http.GET(`${this.base}/get/${id}`);
}


public getAll(projectId: number | null): Promise<CompteBancaire_VM[]> {
const pid = projectId ?? 'null';
return this.http.GET(`${this.base}/getall/${pid}`);
}


public add(payload: Partial<CompteBancaire_VM>): Promise<number> {
return this.http.PUT(`${this.base}/add`, payload);
}


public update(payload: Partial<CompteBancaire_VM> & { id: number }): Promise<boolean> {
return this.http.PUT(`${this.base}/update`, payload);
}


public delete(id: number): Promise<boolean> {
return this.http.DELETE(`${this.base}/delete/${id}`);
}
}

