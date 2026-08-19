import {
  Body,
  Controller,
  Delete,
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
import { CreateLoginProjectDto, DeleteLoginProjectDto } from './login_project.dto';
import { LoginProjectService } from './login_project.service';

@Controller('login-project')
export class LoginProjectController {
  constructor(private readonly service: LoginProjectService) {}

  @UseGuards(JwtAuthGuard)
  @Get('login/:loginId')
  listByLogin(
    @Req() req: any,
    @Param('loginId', ParseIntPipe) loginId: number,
  ) {
    return this.service.listByLoginAuthorized(
      req.user.id,
      loginId,
      readOptionalProjectId(req),
    );
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post()
  create(
    @Req() req: any,
    @ProjectId() projectId: number,
    @Body() dto: CreateLoginProjectDto,
  ) {
    return this.service.create(dto, req.user.id, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Delete()
  delete(
    @Req() req: any,
    @ProjectId() projectId: number,
    @Body() dto: DeleteLoginProjectDto,
  ) {
    return this.service.delete(dto, req.user.id, projectId);
  }
}
