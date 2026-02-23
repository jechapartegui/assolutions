import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import {
  InscriptionSeance,
  CreateInscriptionSeanceDto,
  UpdateInscriptionSeanceDto,
} from '@shared/lib/inscription-seance.interface';

@Injectable({ providedIn: 'root' })
export class InscriptionSeanceApiService {
  private readonly base = '/inscription-seance';

  constructor(private api: ApiClientService) {}

  list(): Promise<InscriptionSeance[]> {
    return this.api.GET<InscriptionSeance[]>(this.base);
  }

  get(personneId: number, seanceId: number): Promise<InscriptionSeance> {
    return this.api.GET<InscriptionSeance>(`${this.base}/${personneId}/${seanceId}`);
  }

  create(dto: CreateInscriptionSeanceDto): Promise<InscriptionSeance> {
    return this.api.POST<InscriptionSeance>(this.base, dto);
  }

  update(personneId: number, seanceId: number, dto: UpdateInscriptionSeanceDto): Promise<InscriptionSeance> {
    return this.api.POST<InscriptionSeance>(`${this.base}/${personneId}/${seanceId}/update`, dto);
  }

  remove(personneId: number, seanceId: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/${personneId}/${seanceId}/delete`, {});
  }
}
