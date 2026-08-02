import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

import { ProjectId } from '../common/decorators/project-id.decorator';
import {
  EvaluerPreuveMedicaleDto,
  SavePreuveMedicaleDto,
} from './preuve-medicale.dto';
import { PreuveMedicaleService } from './preuve-medicale.service';

type AuthenticatedRequest = Request & { user?: { id?: number } };

@Controller('preuves-medicales')
export class PreuveMedicaleController {
  constructor(private readonly service: PreuveMedicaleService) {}

  @Get('personne/:personneId')
  list(
    @Param('personneId', ParseIntPipe) personneId: number,
    @Query('saisonId') saisonId: string,
    @ProjectId() projectId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.list(
      personneId,
      Number(saisonId),
      projectId,
      this.accountId(req),
    );
  }

  @Post()
  save(
    @Body() dto: SavePreuveMedicaleDto,
    @ProjectId() projectId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.save(dto, projectId, this.accountId(req));
  }

  @Post('evaluer')
  evaluate(
    @Body() dto: EvaluerPreuveMedicaleDto,
    @ProjectId() projectId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.evaluate(dto, projectId, this.accountId(req));
  }

  private accountId(req: AuthenticatedRequest): number {
    const id = Number(req.user?.id);
    if (!id) throw new UnauthorizedException('Compte authentifié introuvable');
    return id;
  }
}
