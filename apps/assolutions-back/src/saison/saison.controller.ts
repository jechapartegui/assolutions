import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { AccessControlService } from '../common/access-control.service';
import { ProjectId } from '../common/decorators/project-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import { CreateSaisonDto, UpdateSaisonDto } from './saison.dto';
import { SaisonService } from './saison.service';

@Controller('saisons')
export class SaisonController {
  constructor(
    private readonly service: SaisonService,
    private readonly access: AccessControlService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@Req() req: any, @ProjectId() projectId: number) {
    await this.access.assertAccountHasProjectContext(req.user.id, projectId);
    return this.service.listForProject(projectId);
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

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post()
  create(@ProjectId() projectId: number, @Body() dto: CreateSaisonDto) {
    return this.service.create(dto, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':id/update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
    @Body() dto: UpdateSaisonDto,
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
