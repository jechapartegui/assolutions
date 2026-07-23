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
import { CompteService } from './compte.service';
import {
  CreateCompteDto,
  CreateCompteWithProjectDto,
  RegisterCompteWithProjectDto,
  UpdateCompteDto,
} from './compte.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';

@Controller('comptes')
export class CompteController {
  constructor(private readonly service: CompteService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  list(@Req() req: any) {
    return this.service.list(req.projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('by-project/:projectId')
  listByProject(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.service.listByProject(projectId);
  }

  /** Public : création depuis la page login / créer-compte. */
  @Post('register-with-project')
  registerWithProject(@Body() dto: RegisterCompteWithProjectDto) {
    return this.service.registerWithProject(dto);
  }

  /** Admin : création d’un compte directement depuis la fiche adhérent. */
  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post('with-project')
  createWithProject(@Body() dto: CreateCompteWithProjectDto) {
    return this.service.createWithProject(dto);
  }

  @Post('check-token')
  check_token(@Body() body: { login: string; token: string }) {
    return this.service.check_token(body.login, body.token);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.get(id);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post()
  create(@Body() dto: CreateCompteDto) {
    return this.service.create(dto);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':id/update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCompteDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':id/delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
