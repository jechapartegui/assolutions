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
  listLight(
    @Body() ids: number[],
    @Query('includePhotos') includePhotos?: string,
  ) {
    const withPhotos = includePhotos === 'true';
    return this.service.listLight(ids, withPhotos);
  }

  @UseGuards(JwtAuthGuard)
  @Post('by-ids')
  list_by_id(@Body() ids: number[]) {
    return this.service.listByIds(ids);
  }

  @UseGuards(JwtAuthGuard)
  @Get('by-compte/:compte')
  list_by_compte(@Param('compte', ParseIntPipe) compte: number) {
    return this.service.listForCompte(compte);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.get(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: any, @Body() dto: CreatePersonneDto) {
    return this.service.create(dto, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePersonneDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
