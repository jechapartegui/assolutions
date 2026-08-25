import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { AccessControlService } from '../common/access-control.service';
import { ProjectId } from '../common/decorators/project-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import { CreateCoursDto, UpdateCoursDto, UpdateCoursSerieDto } from './cours.dto';
import { CoursService } from './cours.service';

@Controller('cours')
export class CoursController {
  constructor(
    private readonly service: CoursService,
    private readonly access: AccessControlService,
  ) {}

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
    @Body() dto: CreateCoursDto,
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
    @Body() dto: UpdateCoursDto,
  ) {
    await this.access.assertAccountHasProjectContext(req.user.id, projectId);
    return this.service.update(id, dto, projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/serie')
  async updateSerie(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
    @Body() dto: UpdateCoursSerieDto,
  ) {
    await this.access.assertProjectStaff(req.user.id, projectId);
    return this.service.updateSerie(id, dto, projectId);
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
