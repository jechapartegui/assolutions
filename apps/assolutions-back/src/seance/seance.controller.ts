import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { AccessControlService } from '../common/access-control.service';
import { ProjectId } from '../common/decorators/project-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import { CreateSeanceDto, CreateSeanceRangeDto, UpdateSeanceDto } from './seance.dto';
import { SeanceService } from './seance.service';

@Controller('seances')
export class SeanceController {
  constructor(
    private readonly service: SeanceService,
    private readonly access: AccessControlService,
  ) {}

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Get()
  list(@ProjectId() projectId: number) {
    return this.service.listForProject(projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('saison/:saisonId')
  async listBySaison(
    @Req() req: any,
    @Param('saisonId', ParseIntPipe) saisonId: number,
    @ProjectId() projectId: number,
  ) {
    await this.access.assertAccountHasProjectContext(req.user.id, projectId);
    return this.service.listForSaison(saisonId, projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('addrange')
  async createRange(
    @Req() req: any,
    @ProjectId() projectId: number,
    @Body() dto: CreateSeanceRangeDto,
  ) {
    await this.access.assertAccountHasProjectContext(req.user.id, projectId);
    return this.service.createRange(dto, projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('liste_by_ids')
  async listByIds(
    @Req() req: any,
    @ProjectId() projectId: number,
    @Body() ids: number[],
  ) {
    await this.access.assertAccountHasProjectContext(req.user.id, projectId);
    return this.service.listByIds(ids, projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async get(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
  ) {
    await this.access.assertAccountHasProjectContext(req.user.id, projectId);
    return this.service.getForProject(id, projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Req() req: any,
    @ProjectId() projectId: number,
    @Body() dto: CreateSeanceDto,
  ) {
    await this.access.assertAccountHasProjectContext(req.user.id, projectId);
    return this.service.create(dto, projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/update')
  async update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
    @Body() dto: UpdateSeanceDto,
  ) {
    await this.access.assertAccountHasProjectContext(req.user.id, projectId);
    return this.service.update(id, dto, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':id/delete')
  remove(@Param('id', ParseIntPipe) id: number, @ProjectId() projectId: number) {
    return this.service.remove(id, projectId);
  }
}
