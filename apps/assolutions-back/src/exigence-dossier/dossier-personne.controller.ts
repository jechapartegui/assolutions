import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { ProjectId } from '../common/decorators/project-id.decorator';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import { SaveDossierDocumentDto } from './dossier-document.dto';
import { DossierDocumentService } from './dossier-document.service';
import {
  EvaluerDossierPersonneDto,
  SauverReponseExigenceDto,
} from './dossier-personne.dto';
import { ExigenceDossierService } from './exigence-dossier.service';
import { PreuveMedicaleService } from './preuve-medicale.service';

type AuthenticatedRequest = Request & { user?: { id?: number } };

@Controller('dossiers-personnes')
export class DossierPersonneController {
  constructor(
    private readonly service: ExigenceDossierService,
    private readonly documents: DossierDocumentService,
    private readonly medical: PreuveMedicaleService,
  ) {}

  @Post('evaluer')
  evaluate(
    @Body() dto: EvaluerDossierPersonneDto,
    @ProjectId() projectId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.evaluateComplete(dto, projectId, this.accountId(req));
  }

  @UseGuards(ProjectAdminGuard)
  @Post('admin/evaluer/:compteId')
  evaluateAdmin(
    @Param('compteId', ParseIntPipe) compteId: number,
    @Body() dto: EvaluerDossierPersonneDto,
    @ProjectId() projectId: number,
  ) {
    return this.evaluateComplete(dto, projectId, compteId);
  }

  @Post('reponse')
  async saveResponse(
    @Body() dto: SauverReponseExigenceDto,
    @ProjectId() projectId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const accountId = this.accountId(req);
    await this.service.saveResponse(dto, projectId, accountId);
    return this.evaluateComplete(dto, projectId, accountId);
  }

  @UseGuards(ProjectAdminGuard)
  @Post('admin/reponse/:compteId')
  async saveAdminResponse(
    @Param('compteId', ParseIntPipe) compteId: number,
    @Body() dto: SauverReponseExigenceDto,
    @ProjectId() projectId: number,
  ) {
    await this.service.saveResponse(dto, projectId, compteId);
    return this.evaluateComplete(dto, projectId, compteId);
  }

  @Post('document')
  saveDocument(
    @Body() dto: SaveDossierDocumentDto,
    @ProjectId() projectId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.documents.save(dto, projectId, this.accountId(req));
  }

  @UseGuards(ProjectAdminGuard)
  @Post('admin/document/:compteId')
  saveAdminDocument(
    @Param('compteId', ParseIntPipe) compteId: number,
    @Body() dto: SaveDossierDocumentDto,
    @ProjectId() projectId: number,
  ) {
    return this.documents.save(dto, projectId, compteId);
  }

  private async evaluateComplete(
    dto: EvaluerDossierPersonneDto,
    projectId: number,
    accountId: number,
  ) {
    const [dossier, medical] = await Promise.all([
      this.service.evaluate(dto, projectId, accountId),
      this.medical.evaluate(
        {
          personne_id: dto.personne_id,
          saison_id: dto.saison_id,
          type_licence: dto.type_licence,
        },
        projectId,
        accountId,
      ),
    ]);

    if (medical.eligible) {
      return { ...dossier, preuve_medicale: medical };
    }

    return {
      ...dossier,
      inscription_complete: false,
      exigences_manquantes_bloquantes: Array.from(
        new Set([
          ...(dossier.exigences_manquantes_bloquantes ?? []),
          'PREUVE_MEDICALE',
        ]),
      ),
      preuve_medicale: medical,
    };
  }

  private accountId(req: AuthenticatedRequest): number {
    const id = Number(req.user?.id);
    if (!id) throw new UnauthorizedException('Compte authentifié introuvable');
    return id;
  }
}
