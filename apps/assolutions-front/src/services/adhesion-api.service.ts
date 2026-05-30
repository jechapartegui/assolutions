import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { ProjetView } from '@shared/lib/compte.interface';
import { Adherent_VM } from '@shared/lib/member.interface';
import { PersonneSearchItem } from '@shared/index';

@Injectable({ providedIn: 'root' })
export class AdhesionApiService {
  private readonly base = '/adhesion';

  constructor(private api: ApiClientService) {}

  get(): Promise<ProjetView[]> {
    return this.api.GET<ProjetView[]>(this.base);
  }
    Anniversaire(saison_id: number): Promise<string[]> {
    return this.api.GET<string[]>(this.base + `/anniversaire/${saison_id}`);
  }

  GetAdherentAdhesion(saison_id: number, login: string): Promise<Adherent_VM[]> {
    return this.api.POST<Adherent_VM[]>(this.base + `/adherent/${saison_id}` , { login });
  }

  admin_search(search: string): Promise<PersonneSearchItem[]> {
    return this.api.POST<PersonneSearchItem[]>(this.base + `/admin-search`, { search }).then((rows) => rows.map(this.mapPersonne.bind(this)));
  }

  private mapPersonne(raw: any): PersonneSearchItem {
  return {
    id: Number(raw.id),
    nom: raw.nom,
    prenom: raw.prenom,
    surnom: raw.surnom,
    libelle: raw.libelle || [raw.prenom, raw.nom, raw.surnom].filter(Boolean).join(' '),
  };
}

}
