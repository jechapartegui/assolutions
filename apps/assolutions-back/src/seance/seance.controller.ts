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
import { ProjectAccessGuard } from '../common/guards/project-access.guard';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import { CreateSeanceDto, CreateSeanceRangeDto, UpdateSeanceDto } from './seance.dto';
import { SeanceService } from './seance.service';

@Controller('seances')
export class SeanceController {
  constructor(private readonly service: SeanceService) {}

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Get()
  list(@ProjectId() projectId: number) {
    return this.service.listForProject(projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  @Get('saison/:saisonId')
  listBySaison(
    @Param('saisonId', ParseIntPipe) saisonId: number,
    @ProjectId() projectId: number,
  ) {
    return this.service.listForSaison(saisonId, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post('addrange')
  createRange(
    @ProjectId() projectId: number,
    @Body() dto: CreateSeanceRangeDto,
  ) {
    return this.service.createRange(dto, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  @Post('liste_by_ids')
  listByIds(@Body() ids: number[], @ProjectId() projectId: number) {
    return this.service.listByIds(ids, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  @Get(':id')
  get(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
  ) {
    return this.service.getForProject(id, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post()
  create(@ProjectId() projectId: number, @Body() dto: CreateSeanceDto) {
    return this.service.create(dto, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':id/update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
    @Body() dto: UpdateSeanceDto,
  ) {
    return this.service.update(id, dto, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':id/delete')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
  ) {
    return this.service.remove(id, projectId);
  }
}
