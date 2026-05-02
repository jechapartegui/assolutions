import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateProjectDto, UpdateProjectDto } from './project.dto';
import { ProjectService } from './project.service';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';

@Controller('projects')
export class ProjectController {
  constructor(private readonly service: ProjectService) {}

  @UseGuards(JwtAuthGuard)
  @Get('public')
  listPublicProjects() {
    return this.service.listPublicProjects();
  }

    @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Get()
  list() {
    return this.service.list();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.get(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: any, @Body() dto: CreateProjectDto) {
    return this.service.create({ ...dto, compte: req.user.id });
  }

  // ✅ UPDATE via POST
  @UseGuards(JwtAuthGuard)
  @Post(':id/update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProjectDto) {
    return this.service.update(id, dto);
  }

  // ✅ DELETE via POST
  @UseGuards(JwtAuthGuard)
  @Post(':id/delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
