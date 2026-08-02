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

  evaluate(dto: EvaluerDossierPersonneDto): Promise<DossierPersonneEvaluation> {
    return this.api.POST<DossierPersonneEvaluation>(
      '/dossiers-personnes/evaluer',
      dto,
    );
  }

  saveResponse(
    dto: SauverReponseExigenceDto,
  ): Promise<DossierPersonneEvaluation> {
    return this.api.POST<DossierPersonneEvaluation>(
      '/dossiers-personnes/reponse',
      dto,
    );
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
