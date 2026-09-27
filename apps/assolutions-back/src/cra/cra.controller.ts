import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ProjectId } from '../common/decorators/project-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AddCraLigneDto, FinalizeFactureDto } from './cra.dto';
import { CraService } from './cra.service';

@Controller('cra')
@UseGuards(JwtAuthGuard)
export class CraController {
  constructor(private readonly service: CraService) {}

  @Get('me/context')
  context(@Req() req: any, @ProjectId() projectId: number) {
    return this.service.getProfessorContext(Number(req.user.id), projectId);
  }

  @Post('me/open')
  openMine(@Req() req: any, @ProjectId() projectId: number, @Body() dto: { annee: number; mois: number }) {
    return this.service.openMine(Number(req.user.id), projectId, Number(dto.annee), Number(dto.mois));
  }

  @Get(':id')
  get(@Req() req: any, @Param('id', ParseIntPipe) id: number, @ProjectId() projectId: number) {
    return this.service.get(id, projectId, Number(req.user.id));
  }

  @Post(':id/lines')
  addLine(@Req() req: any, @Param('id', ParseIntPipe) id: number, @ProjectId() projectId: number, @Body() dto: AddCraLigneDto) {
    return this.service.addLine(id, dto, projectId, Number(req.user.id));
  }

  @Post(':id/lines/:lineId/delete')
  removeLine(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Param('lineId', ParseIntPipe) lineId: number, @ProjectId() projectId: number) {
    return this.service.removeLine(id, lineId, projectId, Number(req.user.id));
  }

  @Post(':id/validate')
  validate(@Req() req: any, @Param('id', ParseIntPipe) id: number, @ProjectId() projectId: number) {
    return this.service.validate(id, projectId, Number(req.user.id));
  }

  @Post(':id/invoice')
  invoice(@Req() req: any, @Param('id', ParseIntPipe) id: number, @ProjectId() projectId: number, @Body() dto: FinalizeFactureDto) {
    return this.service.finalizeInvoice(id, dto, projectId, Number(req.user.id));
  }
}
