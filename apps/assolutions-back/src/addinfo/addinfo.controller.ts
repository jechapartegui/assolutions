import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ProjectId } from '../common/decorators/project-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import { CreateAddinfoDto, UpdateAddinfoDto } from './addinfo.dto';
import { AddinfoService } from './addinfo.service';

@Controller('addinfo')
export class AddinfoController {
  constructor(private readonly service: AddinfoService) {}

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
  create(@ProjectId() projectId: number, @Body() dto: CreateAddinfoDto) {
    return this.service.create(dto, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @ProjectId() projectId: number, @Body() dto: UpdateAddinfoDto) {
    return this.service.update(id, dto, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @ProjectId() projectId: number) {
    return this.service.remove(id, projectId);
  }
}
