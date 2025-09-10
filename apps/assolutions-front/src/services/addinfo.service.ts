import { Injectable } from '@angular/core';
import { GlobalService } from './global.services';
import { environment } from '../environments/environment.prod';
import { AddInfo_VM } from '@shared/lib/addinfo.interface';

@Injectable({ providedIn: 'root' })
export class AddInfoService {
private base = environment.maseance + 'api/admin/addinfo';
constructor(private http: GlobalService) {}


/** Liste de valeurs (LV) pour un object_type donné */
public list(objectType: string, original = false): Promise<AddInfo_VM> {
const url = `${this.base}/list/${encodeURIComponent(objectType)}?original=${original}`;
return this.http.GET(url);
}


/** Récupérer un addinfo par id */
public get(id: number): Promise<AddInfo_VM> {
const url = `${this.base}/get/${id}`;
return this.http.GET(url);
}


/** Créer une entrée addinfo */
public add(payload: Partial<AddInfo_VM>): Promise<number> {
const url = `${this.base}/add`;
return this.http.PUT(url, payload);
}


/** Mettre à jour une entrée addinfo */
public update(payload: Partial<AddInfo_VM> & { id: number }): Promise<boolean> {
const url = `${this.base}/update`;
return this.http.PUT(url, payload);
}


/** Supprimer */
public delete(id: number): Promise<boolean> {
const url = `${this.base}/delete/${id}`;
return this.http.DELETE(url);
}
}
