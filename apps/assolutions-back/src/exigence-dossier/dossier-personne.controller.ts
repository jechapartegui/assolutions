import {
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

import { ProjectId } from '../common/decorators/project-id.decorator';
import { SaveDossierDocumentDto } from './dossier-document.dto';
import {
  EvaluerDossierPersonneDto,
  SauverReponseExigenceDto,
} from './dossier-personne.dto';
import { ExigenceDossierService } from './exigence-dossier.service';
import { SouscriptionDossierService } from './souscription-dossier.service';

type AuthenticatedRequest = Request & {
  user?: { id?: number };
};

@Controller('dossiers-personnes')
export class DossierPersonneController {
  constructor(
    private readonly service: ExigenceDossierService,
    private readonly dossiers: SouscriptionDossierService,
  ) {}

  @Post('evaluer')
  evaluate(
    @Body() dto: EvaluerDossierPersonneDto,
    @ProjectId() projectId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.evaluate(dto, projectId, this.accountId(req));
  }

  @Post('reponse')
  saveResponse(
    @Body() dto: SauverReponseExigenceDto,
    @ProjectId() projectId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.saveResponse(dto, projectId, this.accountId(req));
  }

  @Post('document')
  saveDocument(
    @Body() dto: SaveDossierDocumentDto,
    @ProjectId() projectId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dossiers.saveDocument(dto, projectId, this.accountId(req));
  }

  private accountId(req: AuthenticatedRequest): number {
    const id = Number(req.user?.id);
    if (!id) throw new UnauthorizedException('Compte authentifié introuvable');
    return id;
  }
}
