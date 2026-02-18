import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateProjectDto, UpdateProjectDto } from './project.dto';
import { ProjectService } from './project.service';

@Controller('projects')
export class ProjectController {
  constructor(private readonly service: ProjectService) {}

  // Exemple: liste des projets du compte connecté (owner)
  @UseGuards(JwtAuthGuard)
  @Get()
  listMine(@Req() req: any) {
    return this.service.listForCompte(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.get(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: any, @Body() dto: CreateProjectDto) {
    // sécurité minimum: forcer "compte = userId" pour éviter de créer sur le compte de quelqu’un d’autre
    return this.service.create({ ...dto, compte: req.user.id });
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProjectDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
