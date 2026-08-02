import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ProjectId } from '../common/decorators/project-id.decorator';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import { SaveExigenceDossierDto, UpdateExigenceDossierDto } from './exigence-dossier.dto';
import { ExigenceDossierService } from './exigence-dossier.service';

@Controller('exigences-dossier')
@UseGuards(ProjectAdminGuard)
export class ExigenceDossierController {
  constructor(private readonly service: ExigenceDossierService) {}

  @Get()
  list(
    @ProjectId() projectId: number,
    @Query('saisonId') saisonId?: string,
  ) {
    const parsed = Number(saisonId);
    return this.service.list(
      projectId,
      Number.isInteger(parsed) && parsed > 0 ? parsed : null,
    );
  }

  @Post()
  create(
    @Body() dto: SaveExigenceDossierDto,
    @ProjectId() projectId: number,
  ) {
    return this.service.create(dto, projectId);
  }

  @Post(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExigenceDossierDto,
    @ProjectId() projectId: number,
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
