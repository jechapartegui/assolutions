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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectAccessGuard } from '../common/guards/project-access.guard';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import {
  CreateAddinfoFieldDto,
  CreateAddInfoValueDto,
  UpdateAddinfoFieldDto,
  UpdateAddInfoValueDto,
} from './addinfo.dto';
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
  create(@ProjectId() projectId: number, @Body() dto: CreateAddinfoFieldDto) {
    return this.service.create(dto, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':id/update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
    @Body() dto: UpdateAddinfoFieldDto,
  ) {
    return this.service.update(id, dto, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':id/delete')
  remove(@Param('id', ParseIntPipe) id: number, @ProjectId() projectId: number) {
    return this.service.remove(id, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  @Get('fields/:objectType')
  listFields(
    @Param('objectType') objectType: string,
    @ProjectId() projectId: number,
  ) {
    return this.service.listFields(objectType, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  @Get('values/:objectType/:objectId')
  listValues(
    @Req() req: any,
    @Param('objectType') objectType: string,
    @Param('objectId', ParseIntPipe) objectId: number,
    @ProjectId() projectId: number,
  ) {
    return this.service.listValues(objectType, objectId, projectId, req.user.id);
  }

  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  @Get('form/:objectType/:objectId')
  getForm(
    @Req() req: any,
    @Param('objectType') objectType: string,
    @Param('objectId', ParseIntPipe) objectId: number,
    @ProjectId() projectId: number,
  ) {
    return this.service.getForm(objectType, objectId, projectId, req.user.id);
  }

  // Route unique d'upsert de valeur (le contrôleur contenait deux POST /values).
  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  @Post('values')
  setValue(
    @Req() req: any,
    @ProjectId() projectId: number,
    @Body() dto: CreateAddInfoValueDto,
  ) {
    return this.service.setValue(dto, projectId, req.user.id);
  }

  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  @Get('lov/:code/:lang')
  getLov(
    @Param('code') code: string,
    @Param('lang') lang: string,
    @ProjectId() projectId: number,
  ) {
    return this.service.getLov(code, lang, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  @Post('values/:id/update')
  updateValue(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
    @Body() dto: UpdateAddInfoValueDto,
  ) {
    return this.service.updateValue(id, dto, projectId, req.user.id);
  }

  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  @Post('values/:id/delete')
  deleteValue(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
  ) {
    return this.service.deleteValue(id, projectId, req.user.id);
  }
}
