import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { readOptionalProjectId } from '../common/access-control.service';
import { ProjectId } from '../common/decorators/project-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import { CreateDocumentDto, SetPhotoDto, UpdateDocumentDto } from './document.dto';
import { DocumentService } from './document.service';

@Controller('documents')
export class DocumentController {
  constructor(private readonly service: DocumentService) {}

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Get()
  list(
    @ProjectId() projectId: number,
    @Query('objet_type') objetType?: string,
    @Query('objet_id') objetId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listForProject(projectId, {
      objetType,
      objetId: objetId ? +objetId : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  get(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.getAuthorized(id, req.user.id, readOptionalProjectId(req));
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post()
  create(
    @Req() req: any,
    @ProjectId() projectId: number,
    @Body() dto: CreateDocumentDto,
  ) {
    return this.service.create(dto, projectId, req.user.id);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':id/update')
  updatePost(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.service.update(id, dto, projectId, req.user.id);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Patch(':id')
  updatePatch(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.service.update(id, dto, projectId, req.user.id);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':id/delete')
  removePost(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
  ) {
    return this.service.remove(id, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Delete(':id')
  removeDelete(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
  ) {
    return this.service.remove(id, projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('photo-by-id')
  photoById(@Req() req: any, @Body() ids: number[]) {
    return this.service.photoById(ids, req.user.id, readOptionalProjectId(req));
  }

  @UseGuards(JwtAuthGuard)
  @Post('set-photo')
  setPhoto(
    @Req() req: any,
    @Body() dto: SetPhotoDto,
    @ProjectId() projectId: number,
  ) {
    return this.service.setPhoto(dto, projectId, req.user.id);
  }
}
