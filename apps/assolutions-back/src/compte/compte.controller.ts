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
import { readOptionalProjectId } from '../common/access-control.service';
import { ProjectId } from '../common/decorators/project-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import {
  CreateCompteDto,
  CreateCompteWithProjectDto,
  RegisterCompteWithProjectDto,
  UpdateCompteDto,
} from './compte.dto';
import { CompteService } from './compte.service';

@Controller('comptes')
export class CompteController {
  constructor(private readonly service: CompteService) {}

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Get()
  list(@Req() req: any, @ProjectId() projectId: number) {
    return this.service.listByProjectAuthorized(req.user.id, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Get('by-project/:projectId')
  listByProject(
    @Req() req: any,
    @ProjectId() guardedProjectId: number,
    @Param('projectId', ParseIntPipe) projectId: number,
  ) {
    if (Number(guardedProjectId) !== Number(projectId)) {
      throw new ForbiddenException('PROJECT_MISMATCH');
    }
    return this.service.listByProjectAuthorized(req.user.id, guardedProjectId);
  }

  @Post('register-with-project')
  registerWithProject(@Body() dto: RegisterCompteWithProjectDto) {
    return this.service.registerWithProject(dto);
  }

  @Post('resend-activation')
  resendActivation(@Body() body: { email: string }) {
    return this.service.resendActivation(body.email);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post('with-project')
  createWithProject(
    @ProjectId() projectId: number,
    @Body() dto: CreateCompteWithProjectDto,
  ) {
    return this.service.createWithProject(dto, projectId);
  }

  @Post('check-token')
  checkToken(@Body() body: { login: string; token: string }) {
    return this.service.check_token(body.login, body.token);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  get(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.getAuthorized(
      id,
      req.user.id,
      readOptionalProjectId(req),
    );
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post()
  create(@ProjectId() projectId: number, @Body() dto: CreateCompteDto) {
    return this.service.createForProject(dto, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':id/update')
  update(
    @Req() req: any,
    @ProjectId() projectId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCompteDto,
  ) {
    return this.service.updateAuthorized(id, dto, req.user.id, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':id/delete')
  remove(
    @Req() req: any,
    @ProjectId() projectId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.removeAuthorized(id, req.user.id, projectId);
  }
}
