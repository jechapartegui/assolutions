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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import { CreateFluxFinancierDto, UpdateFluxFinancierDto } from './flux_financier.dto';
import { FluxFinancierService } from './flux_financier.service';

@Controller('flux-financier')
export class FluxFinancierController {
  constructor(private readonly service: FluxFinancierService) {}

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Get()
  list(
    @ProjectId() projectId: number,
    @Query('saison_id') saisonId?: string,
    @Query('include_systeme') includeSysteme?: string,
  ) {
    return this.service.listForProject(
      projectId,
      saisonId ? +saisonId : undefined,
      includeSysteme === 'true',
    );
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number, @ProjectId() projectId: number) {
    return this.service.getForProject(id, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post()
  create(@ProjectId() projectId: number, @Body() dto: CreateFluxFinancierDto) {
    return this.service.create(dto, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':id/update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
    @Body() dto: UpdateFluxFinancierDto,
  ) {
    return this.service.update(id, dto, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':id/delete')
  remove(@Param('id', ParseIntPipe) id: number, @ProjectId() projectId: number) {
    return this.service.remove(id, projectId);
  }
}