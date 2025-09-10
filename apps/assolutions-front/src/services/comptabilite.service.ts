import { Injectable } from '@angular/core';
import { GlobalService } from './global.services';
import { environment } from '../environments/environment.prod';
import { FluxFinancier_VM } from '@shared/index';


@Injectable({ providedIn: 'root' })
export class ComptabiliteService {
private base = environment.maseance + 'api/admin/flow';
constructor(private http: GlobalService) {}


public get(id: number): Promise<FluxFinancier_VM> {
return this.http.GET(`${this.base}/get/${id}`);
}


public getAll(projectId: number | null, saisonId?: number | null): Promise<FluxFinancier_VM[]> {
const pid = projectId ?? 'null';
const url = new URL(`${this.base}/getall/${pid}`, window.location.origin);
if (saisonId != null) url.searchParams.set('saison_id', String(saisonId));
return this.http.GET(url.pathname + (url.search || ''));
}


public add(payload: Partial<FluxFinancier_VM>): Promise<number> {
return this.http.PUT(`${this.base}/add`, payload);
}


public update(payload: Partial<FluxFinancier_VM> & { id: number }): Promise<boolean> {
return this.http.PUT(`${this.base}/update`, payload);
}


public delete(id: number): Promise<boolean> {
return this.http.DELETE(`${this.base}/delete/${id}`);
}
}

