import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ProjectId } from '../common/decorators/project-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import { AddCraLigneDto, FinalizeFactureDto, OpenCraDto } from './cra.dto';
import { CraService } from './cra.service';

@Controller('cra')
@UseGuards(JwtAuthGuard, ProjectAdminGuard)
export class CraController {
  constructor(private readonly service: CraService) {}

  @Post('open')
  open(@ProjectId() projectId: number, @Body() dto: OpenCraDto) { return this.service.open(dto, projectId); }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number, @ProjectId() projectId: number) { return this.service.get(id, projectId); }

  @Post(':id/lines')
  addLine(@Param('id', ParseIntPipe) id: number, @ProjectId() projectId: number, @Body() dto: AddCraLigneDto) {
    return this.service.addLine(id, dto, projectId);
  }

  @Post(':id/lines/:lineId/delete')
  removeLine(@Param('id', ParseIntPipe) id: number, @Param('lineId', ParseIntPipe) lineId: number, @ProjectId() projectId: number) {
    return this.service.removeLine(id, lineId, projectId);
  }

  @Post(':id/validate')
  validate(@Param('id', ParseIntPipe) id: number, @ProjectId() projectId: number) { return this.service.validate(id, projectId); }

  @Post(':id/invoice')
  invoice(@Param('id', ParseIntPipe) id: number, @ProjectId() projectId: number, @Body() dto: FinalizeFactureDto) {
    return this.service.finalizeInvoice(id, dto, projectId);
  }
}
