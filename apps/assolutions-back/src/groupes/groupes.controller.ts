import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ProjectId } from '../common/decorators/project-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import { CreateGroupesDto, UpdateGroupesDto } from './groupes.dto';
import { GroupesService } from './groupes.service';

@Controller('groupes')
export class GroupesController {
  constructor(private readonly service: GroupesService) {}

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Get()
  list(@ProjectId() projectId: number) {
    return this.service.listForProject(projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number, @ProjectId() projectId: number) {
    return this.service.getForProject(id, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post()
  create(@ProjectId() projectId: number, @Body() dto: CreateGroupesDto) {
    return this.service.create(dto, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @ProjectId() projectId: number, @Body() dto: UpdateGroupesDto) {
    return this.service.update(id, dto, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @ProjectId() projectId: number) {
    return this.service.remove(id, projectId);
  }
}
