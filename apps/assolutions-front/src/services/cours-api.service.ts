import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { Cours } from '@shared/lib/cours.interface';

export type CreateCoursDto = Omit<Cours, 'id'>;
export type UpdateCoursDto = Partial<Omit<Cours, 'id' | 'project_id'>>;

@Injectable({ providedIn: 'root' })
export class CoursApiService {
  private readonly base = '/cours';

  constructor(private api: ApiClientService) {}

  list(saisonId: number): Promise<Cours[]> {
    return this.api.GET<Cours[]>(`${this.base}/saison/${saisonId}`);
  }

  get(id: number): Promise<Cours> {
    return this.api.GET<Cours>(`${this.base}/${id}`);
  }

  create(dto: CreateCoursDto): Promise<Cours> {
    return this.api.POST<Cours>(this.base, this.toPayload(dto));
  }

  update(id: number, dto: UpdateCoursDto): Promise<Cours> {
    return this.api.POST<Cours>(`${this.base}/${id}/update`, this.toPayload(dto));
  }

  remove(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/${id}/delete`, {});
  }

  updateSerieCours(id: number, dto: UpdateCoursDto, fromDate: Date): Promise<void> {
    const payload = {
      ...this.toPayload(dto),
      fromDate,
    };
    return this.api.POST<void>(`${this.base}/${id}/serie`, payload);
  }

  /**
   * Le ValidationPipe du back refuse désormais toute propriété hors DTO.
   * Les écrans manipulent parfois des VM enrichis (id, project_id, lieu,
   * groupes, professeursCours, rdv...). On construit donc explicitement le
   * contrat API au lieu de sérialiser l'objet d'écran entier.
   */
  private toPayload(dto: any): Record<string, unknown> {
    return {
      nom: dto?.nom,
      jour_semaine: dto?.jour_semaine,
      heure: dto?.heure,
      duree: dto?.duree,
      prof_principal_id: dto?.prof_principal_id,
      lieu_id: dto?.lieu_id,
      age_minimum: dto?.age_minimum,
      age_maximum: dto?.age_maximum,
      saison_id: dto?.saison_id,
      place_maximum: dto?.place_maximum,
      convocation_nominative: dto?.convocation_nominative,
      afficher_present: dto?.afficher_present,
      essai_possible: dto?.essai_possible,
      appointment: dto?.appointment ?? dto?.rdv,
    };
  }
}
