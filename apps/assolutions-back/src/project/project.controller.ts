import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ProjectId } from '../common/decorators/project-id.decorator';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { CreateProjectDto, UpdateProjectDto } from './project.dto';
import { ProjectService } from './project.service';

@Controller('projects')
export class ProjectController {
  constructor(private readonly service: ProjectService) {}

  @Public()
  @Get('public')
  listPublicProjects() {
    return this.service.listPublicProjects();
  }

  @Public()
  @Get('public/:id')
  getPublic(@Param('id', ParseIntPipe) id: number) {
    return this.service.getPublic(id);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Get()
  list() {
    return this.service.list();
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Get(':id')
  get(
    @ProjectId() projectId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    this.assertSameProject(projectId, id);
    return this.service.get(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: any, @Body() dto: CreateProjectDto) {
    return this.service.create({ ...dto, compte: req.user.id });
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':id/update')
  update(
    @ProjectId() projectId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProjectDto,
  ) {
    this.assertSameProject(projectId, id);
    const { compte: _ignoredOwner, activation_token: _ignoredToken, ...safeDto } = dto;
    return this.service.update(id, safeDto);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':id/delete')
  remove(
    @ProjectId() projectId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    this.assertSameProject(projectId, id);
    return this.service.remove(id);
  }

  private assertSameProject(headerProjectId: number, resourceProjectId: number): void {
    if (Number(headerProjectId) !== Number(resourceProjectId)) {
      throw new ForbiddenException('PROJECT_ID_MISMATCH');
    }
  }
}
