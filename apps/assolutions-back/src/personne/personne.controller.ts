import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AccessControlService } from '../common/access-control.service';
import { OptionalProjectId } from '../common/decorators/optional-project-id.decorator';
import { ProjectId } from '../common/decorators/project-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import { FfrsExportService } from './ffrs-export.service';
import { CreatePersonneDto, UpdatePersonneDto } from './personne.dto';
import { PersonneService } from './personne.service';

@Controller('personnes')
export class PersonneController {
  constructor(
    private readonly service: PersonneService,
    private readonly ffrsExport: FfrsExportService,
    private readonly access: AccessControlService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  listMine(@Req() req: any) {
    return this.service.listForCompte(req.user.id);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post('export-ffrs')
  exportFfrs(
    @Req() req: any,
    @ProjectId() projectId: number,
    @Body() body: { ids?: number[]; saison_id?: number | null },
  ) {
    const forwardedProto = String(req.headers?.['x-forwarded-proto'] ?? '')
      .split(',')[0]
      .trim();
    const forwardedHost = String(req.headers?.['x-forwarded-host'] ?? '')
      .split(',')[0]
      .trim();
    const protocol = forwardedProto || req.protocol || 'https';
    const host = forwardedHost || req.get?.('host') || '';
    const publicBaseUrl = host ? `${protocol}://${host}` : '';

    return this.ffrsExport.build(
      body?.ids ?? [],
      projectId,
      body?.saison_id ? Number(body.saison_id) : null,
      publicBaseUrl,
    );
  }

  @Get(['ffrs-photo/:id', 'ffrs-photo/:id/:filename'])
  async getFfrsPhoto(
    @Param('id', ParseIntPipe) id: number,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    const photo = await this.ffrsExport.getPhoto(id, token);
    res.setHeader('Content-Type', photo.mimetype);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('Content-Disposition', `inline; filename="ffrs-${id}"`);
    res.send(photo.buffer);
  }

  @UseGuards(JwtAuthGuard)
  @Post('light')
  async listLight(
    @Req() req: any,
    @OptionalProjectId() projectId: number | null,
    @Body() ids: number[],
    @Query('includePhotos') includePhotos?: string,
  ) {
    await this.access.assertPersonIdsAccess(req.user.id, ids, projectId);
    return this.service.listLight(ids, includePhotos === 'true');
  }

  @UseGuards(JwtAuthGuard)
  @Post('by-ids')
  async listById(
    @Req() req: any,
    @OptionalProjectId() projectId: number | null,
    @Body() ids: number[],
  ) {
    await this.access.assertPersonIdsAccess(req.user.id, ids, projectId);
    return this.service.listByIds(ids);
  }

  @UseGuards(JwtAuthGuard)
  @Get('by-compte/:compte')
  async listByCompte(
    @Req() req: any,
    @OptionalProjectId() projectId: number | null,
    @Param('compte', ParseIntPipe) compte: number,
  ) {
    await this.access.assertAccountAccess(req.user.id, compte, projectId);
    return this.service.listForCompte(compte);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async get(
    @Req() req: any,
    @OptionalProjectId() projectId: number | null,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.access.assertPersonAccess(req.user.id, id, projectId);
    return this.service.get(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Req() req: any,
    @OptionalProjectId() projectId: number | null,
    @Body() dto: CreatePersonneDto,
  ) {
    const accountId = Number(dto.compte || req.user.id);
    await this.access.assertAccountAccess(req.user.id, accountId, projectId);
    return this.service.create({ ...dto, compte: accountId }, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/update')
  async update(
    @Req() req: any,
    @OptionalProjectId() projectId: number | null,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePersonneDto,
  ) {
    await this.access.assertPersonAccess(req.user.id, id, projectId);
    if (dto.compte != null) {
      await this.access.assertAccountAccess(req.user.id, dto.compte, projectId);
    }
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/delete')
  async remove(
    @Req() req: any,
    @OptionalProjectId() projectId: number | null,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.access.assertPersonAccess(req.user.id, id, projectId);
    return this.service.remove(id);
  }
}
