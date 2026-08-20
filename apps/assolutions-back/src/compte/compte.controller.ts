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
import { AccessControlService } from '../common/access-control.service';
import { OptionalProjectId } from '../common/decorators/optional-project-id.decorator';
import { ProjectId } from '../common/decorators/project-id.decorator';
import { Public } from '../common/decorators/public.decorator';
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
  constructor(
    private readonly service: CompteService,
    private readonly access: AccessControlService,
  ) {}

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Get()
  list(@ProjectId() projectId: number) {
    return this.service.listByProject(projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Get('by-project/:projectId')
  listByProject(
    @ProjectId() headerProjectId: number,
    @Param('projectId', ParseIntPipe) projectId: number,
  ) {
    if (Number(headerProjectId) !== Number(projectId)) {
      throw new ForbiddenException('PROJECT_ID_MISMATCH');
    }
    return this.service.listByProject(projectId);
  }

  @Public()
  @Post('register-with-project')
  registerWithProject(@Body() dto: RegisterCompteWithProjectDto) {
    return this.service.registerWithProject(dto);
  }

  @Public()
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
    if (Number(dto.project_id) !== Number(projectId)) {
      throw new ForbiddenException('PROJECT_ID_MISMATCH');
    }
    return this.service.createWithProject(dto);
  }

  @Public()
  @Post('check-token')
  checkToken(@Body() body: { login: string; token: string }) {
    return this.service.check_token(body.login, body.token);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async get(
    @Req() req: any,
    @OptionalProjectId() projectId: number | null,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.access.assertAccountAccess(req.user.id, id, projectId);
    return this.service.get(id);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post()
  create(@Body() dto: CreateCompteDto) {
    return this.service.create(dto);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':id/update')
  async update(
    @Req() req: any,
    @ProjectId() projectId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCompteDto,
  ) {
    await this.access.assertAccountAccess(req.user.id, id, projectId);
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':id/delete')
  async remove(
    @Req() req: any,
    @ProjectId() projectId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.access.assertAccountAccess(req.user.id, id, projectId);
    return this.service.remove(id);
  }
}
