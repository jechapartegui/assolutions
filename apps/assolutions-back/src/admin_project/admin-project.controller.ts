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

import { ProjectId } from '../common/decorators/project-id.decorator';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import {
  AdminAccountUpdateDto,
  AdminProjectService,
  AdminProjectUpdateDto,
} from './admin-project.service';

@Controller('admin-project')
@UseGuards(ProjectAdminGuard)
export class AdminProjectController {
  constructor(private readonly service: AdminProjectService) {}

  @Get('overview')
  overview(@ProjectId() projectId: number) {
    return this.service.overview(projectId);
  }

  @Get('accounts')
  accounts(@ProjectId() projectId: number) {
    return this.service.listAccounts(projectId);
  }

  @Get('people')
  people(@ProjectId() projectId: number) {
    return this.service.listPeople(projectId);
  }

  @Post('project/update')
  updateProject(
    @ProjectId() projectId: number,
    @Body() body: AdminProjectUpdateDto,
  ) {
    return this.service.updateProject(projectId, body ?? {});
  }

  @Post('elevate')
  elevate(
    @Req() req: any,
    @ProjectId() projectId: number,
    @Body() body: { code?: string },
  ) {
    return this.service.elevate(req.user.id, projectId, body?.code ?? '');
  }

  @Post('accounts/:id/update')
  updateAccount(
    @Req() req: any,
    @ProjectId() projectId: number,
    @Param('id', ParseIntPipe) accountId: number,
    @Body() body: AdminAccountUpdateDto,
  ) {
    return this.service.updateAccount(
      req.user.id,
      projectId,
      accountId,
      body ?? {},
    );
  }

  @Post('accounts/:id/reset-password')
  resetPassword(
    @Req() req: any,
    @ProjectId() projectId: number,
    @Param('id', ParseIntPipe) accountId: number,
    @Body() body: { elevation_token?: string | null },
  ) {
    return this.service.resetPassword(
      req.user.id,
      projectId,
      accountId,
      body?.elevation_token ?? null,
    );
  }
}
