import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { ProjectId } from '../common/decorators/project-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import {
  CreateTarifInscriptionDto,
  UpdateTarifInscriptionDto,
} from './tarif_inscription.dto';
import { TarifInscriptionService } from './tarif_inscription.service';

@Controller('tarifs-inscription')
@UseGuards(JwtAuthGuard, ProjectAdminGuard)
export class TarifInscriptionController {
  constructor(
    private readonly service: TarifInscriptionService,
  ) {}

  @Get('saison/:saisonId')
  list(
    @Param('saisonId', ParseIntPipe) saisonId: number,
    @ProjectId() projectId: number,
  ) {
    return this.service.listForProject(saisonId, projectId);
  }

  @Get(':id')
  get(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
  ) {
    return this.service.getForProject(id, projectId);
  }

  @Post()
  create(
    @ProjectId() projectId: number,
    @Body() dto: CreateTarifInscriptionDto,
  ) {
    return this.service.create(dto, projectId);
  }

  @Post(':id/update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
    @Body() dto: UpdateTarifInscriptionDto,
  ) {
    return this.service.update(id, dto, projectId);
  }

  @Post(':id/delete')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
  ) {
    return this.service.remove(id, projectId);
  }
}
