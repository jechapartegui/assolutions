import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ProjectId } from '../common/decorators/project-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
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

  @UseGuards(JwtAuthGuard)
  @Get('saison/:saisonId')
  listBySaison(@Param('saisonId', ParseIntPipe) saisonId: number) {
    return this.service.listForSaison(saisonId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('addrange')
  createRange(@ProjectId() projectId: number, @Body() dto: CreateSeanceRangeDto) {
    return this.service.createRange(dto, projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('liste_by_ids')
  listbyIds(@Body() ids: number[]) {
    return this.service.listbyId(ids);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number, @ProjectId() projectId: number) {
    return this.service.getForProject(id, projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@ProjectId() projectId: number, @Body() dto: CreateSeanceDto) {
    return this.service.create(dto, projectId);
  }

  @UseGuards(JwtAuthGuard)
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
  remove(@Param('id', ParseIntPipe) id: number, @ProjectId() projectId: number) {
    return this.service.remove(id, projectId);
  }
}
