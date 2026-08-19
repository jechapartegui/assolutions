import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { CreateProjectDto, UpdateProjectDto } from './project.dto';
import { ProjectService } from './project.service';

@Controller('projects')
export class ProjectController {
  constructor(private readonly service: ProjectService) {}

  // Données strictement publiques nécessaires à la création de compte avant authentification.
  @Get('public')
  listPublicProjects() {
    return this.service.listPublicProjects();
  }

  @Get('public/:id')
  getPublicProject(@Param('id', ParseIntPipe) id: number) {
    return this.service.getPublicProject(id);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Get()
  list() {
    return this.service.list();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  get(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.getAuthorized(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: any, @Body() dto: CreateProjectDto) {
    return this.service.create(dto, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/update')
  update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.service.update(id, dto, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/delete')
  remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id, req.user.id);
  }
}
