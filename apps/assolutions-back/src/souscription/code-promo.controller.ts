import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { ProjectId } from '../common/decorators/project-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import { SaveCodePromoDto, UpdateCodePromoDto } from './code-promo.dto';
import { CodePromoService } from './code-promo.service';

@Controller('codes-promo')
@UseGuards(JwtAuthGuard, ProjectAdminGuard)
export class CodePromoController {
  constructor(private readonly service: CodePromoService) {}

  @Get('saison/:saisonId')
  list(
    @Param('saisonId', ParseIntPipe) saisonId: number,
    @ProjectId() projectId: number,
  ) {
    return this.service.list(saisonId, projectId);
  }

  @Post()
  create(@Body() dto: SaveCodePromoDto, @ProjectId() projectId: number) {
    return this.service.create(dto, projectId);
  }

  @Post(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCodePromoDto,
    @ProjectId() projectId: number,
  ) {
    return this.service.update(id, dto, projectId);
  }

  @Post(':id/delete')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
  ) {
    return this.service.remove(id, projectId);
  }
}
