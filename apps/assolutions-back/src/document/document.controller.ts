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
import { AccessControlService } from '../common/access-control.service';
import { OptionalProjectId } from '../common/decorators/optional-project-id.decorator';
import { ProjectId } from '../common/decorators/project-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import { CreateDocumentDto, SetPhotoDto, UpdateDocumentDto } from './document.dto';
import { DocumentService } from './document.service';

@Controller('documents')
export class DocumentController {
  constructor(
    private readonly service: DocumentService,
    private readonly access: AccessControlService,
  ) {}

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
  async get(
    @Req() req: any,
    @OptionalProjectId() projectId: number | null,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.access.assertDocumentAccess(req.user.id, id, projectId);
    return this.service.get(id);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post()
  async create(
    @Req() req: any,
    @ProjectId() projectId: number,
    @Body() dto: CreateDocumentDto,
  ) {
    await this.access.assertDocumentObjectAccess(
      req.user.id,
      dto.objet_type,
      dto.objet_id,
      projectId,
    );
    return this.service.create(dto, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':id/update')
  async updatePost(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
    @Body() dto: UpdateDocumentDto,
  ) {
    await this.access.assertDocumentAccess(req.user.id, id, projectId);
    if (dto.objet_type != null || dto.objet_id != null) {
      const existing = await this.service.get(id);
      await this.access.assertDocumentObjectAccess(
        req.user.id,
        dto.objet_type ?? existing.objet_type,
        dto.objet_id ?? existing.objet_id,
        projectId,
      );
    }
    return this.service.update(id, dto, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Patch(':id')
  async updatePatch(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.updatePost(req, id, projectId, dto);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':id/delete')
  async removePost(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
  ) {
    await this.access.assertDocumentAccess(req.user.id, id, projectId);
    return this.service.remove(id, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Delete(':id')
  async removeDelete(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
  ) {
    return this.removePost(req, id, projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('photo-by-id')
  async photoById(
    @Req() req: any,
    @OptionalProjectId() projectId: number | null,
    @Body() ids: number[],
  ) {
    await this.access.assertPersonIdsAccess(req.user.id, ids, projectId);
    return this.service.photoById(ids, projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('set-photo')
  async setPhoto(
    @Req() req: any,
    @Body() dto: SetPhotoDto,
    @ProjectId() projectId: number,
  ) {
    await this.access.assertDocumentObjectAccess(
      req.user.id,
      dto.objet_type,
      dto.objet_id,
      projectId,
    );
    return this.service.setPhoto(dto, projectId);
  }
}
