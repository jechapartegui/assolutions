import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectId } from '../common/decorators/project-id.decorator';
import { AddinfoService } from './addinfo.service';
import { CreateAddinfoFieldDto, CreateAddInfoValueDto, SetAddinfoValueDto, UpdateAddinfoFieldDto, UpdateAddInfoValueDto } from './addinfo.dto';

@Controller('addinfo')
export class AddinfoController {
  constructor(private readonly service: AddinfoService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  list(@ProjectId() projectId: number) {
    return this.service.listForProject(projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number, @ProjectId() projectId: number) {
    return this.service.getForProject(id, projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@ProjectId() projectId: number, @Body() dto: CreateAddinfoFieldDto) {
    return this.service.create(dto, projectId); // projectId imposé par header
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
    @Body() dto: UpdateAddinfoFieldDto,
  ) {
    return this.service.update(id, dto, projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/delete')
  remove(@Param('id', ParseIntPipe) id: number, @ProjectId() projectId: number) {
    return this.service.remove(id, projectId);
  }

  @Get('fields/:objectType')
listFields(
  @Param('objectType') objectType: string,
  @ProjectId() projectId: number,
) {
  return this.service.listFields(objectType, projectId);
}

@Get('values/:objectType/:objectId')
listValues(
  @Param('objectType') objectType: string,
  @Param('objectId', ParseIntPipe) objectId: number,
  @ProjectId() projectId: number,
) {
  return this.service.listValues(objectType, objectId, projectId);
}

@Get('form/:objectType/:objectId')
getForm(
  @Param('objectType') objectType: string,
  @Param('objectId', ParseIntPipe) objectId: number,
  @ProjectId() projectId: number,
) {
  return this.service.getForm(objectType, objectId, projectId);
}
@Post('values')
setValue(
  @ProjectId() projectId: number,
  @Body() dto: SetAddinfoValueDto,
) {
  return this.service.setValue(dto, projectId);
}

@Get('lov/:code/:lang')
getLov(
  @Param('code') code: string,
  @Param('lang') lang: string,
  @ProjectId() projectId: number,
) {
  return this.service.getLov(code, lang, projectId);
}
@Post('values')
createValue(
  @Body() dto: CreateAddInfoValueDto,
  @Req() req: any,
) {
  return this.service.createValue(dto, req.user.project_id);
}
@Post('values/:id/update')
updateValue(
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: UpdateAddInfoValueDto,
) {
  return this.service.updateValue(id, dto);
}
@Post('values/:id/delete')
deleteValue(
  @Param('id', ParseIntPipe) id: number,
) {
  return this.service.deleteValue(id);
}
}
