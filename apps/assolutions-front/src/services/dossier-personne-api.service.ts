import { Injectable } from '@angular/core';
import {
  DossierPersonneEvaluation,
  EvaluerDossierPersonneDto,
  EvaluationPreuveMedicale,
  PreuveMedicale,
  SauverReponseExigenceDto,
  SavePreuveMedicaleDto,
  TypeLicence,
} from '@shared/index';

import { ApiClientService } from './api-client.service';

@Injectable({ providedIn: 'root' })
export class DossierPersonneApiService {
  constructor(private readonly api: ApiClientService) {}

  evaluate(
    dto: EvaluerDossierPersonneDto,
    adminCompteId?: number | null,
  ): Promise<DossierPersonneEvaluation> {
    const url = adminCompteId
      ? `/dossiers-personnes/admin/evaluer/${Number(adminCompteId)}`
      : '/dossiers-personnes/evaluer';
    return this.api.POST<DossierPersonneEvaluation>(url, dto);
  }

  saveResponse(
    dto: SauverReponseExigenceDto,
    adminCompteId?: number | null,
  ): Promise<DossierPersonneEvaluation> {
    const url = adminCompteId
      ? `/dossiers-personnes/admin/reponse/${Number(adminCompteId)}`
      : '/dossiers-personnes/reponse';
    return this.api.POST<DossierPersonneEvaluation>(url, dto);
  }

  saveDocument(
    dto: {
      personne_id: number;
      typedoc: string;
      titre: string;
      mimetype: string;
      data_base64: string;
      date_document?: string | null;
    },
    adminCompteId?: number | null,
  ): Promise<{ id: number }> {
    const url = adminCompteId
      ? `/dossiers-personnes/admin/document/${Number(adminCompteId)}`
      : '/dossiers-personnes/document';
    return this.api.POST<{ id: number }>(url, dto);
  }

  listMedicalProofs(
    personId: number,
    seasonId: number,
  ): Promise<PreuveMedicale[]> {
    return this.api.GET<PreuveMedicale[]>(
      `/preuves-medicales/personne/${Number(personId)}?saisonId=${Number(seasonId)}`,
    );
  }

  saveMedicalProof(dto: SavePreuveMedicaleDto): Promise<PreuveMedicale> {
    return this.api.POST<PreuveMedicale>('/preuves-medicales', dto);
  }

  evaluateMedicalProof(
    personId: number,
    seasonId: number,
    licenceType: TypeLicence,
  ): Promise<EvaluationPreuveMedicale> {
    return this.api.POST<EvaluationPreuveMedicale>(
      '/preuves-medicales/evaluer',
      {
        personne_id: Number(personId),
        saison_id: Number(seasonId),
        type_licence: licenceType,
      },
    );
  }
}
