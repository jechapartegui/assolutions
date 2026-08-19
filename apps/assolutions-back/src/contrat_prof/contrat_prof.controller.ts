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
import { CreateContratProfDto, UpdateContratProfDto } from './contrat_prof.dto';
import { ContratProfService } from './contrat_prof.service';

@Controller('contrat-prof')
@UseGuards(JwtAuthGuard, ProjectAdminGuard)
export class ContratProfController {
  constructor(private readonly service: ContratProfService) {}

  @Get('saison/:saisonId')
  listForSeason(
    @ProjectId() projectId: number,
    @Param('saisonId', ParseIntPipe) saisonId: number,
  ) {
    return this.service.listForSeason(saisonId, projectId);
  }

  @Get(':id')
  get(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
  ) {
    return this.service.getForProject(id, projectId);
  }

  @Post()
  create(
    @ProjectId() projectId: number,
    @Body() dto: CreateContratProfDto,
  ) {
    return this.service.create(dto, projectId);
  }

  @Post(':id/update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
    @Body() dto: UpdateContratProfDto,
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

  @Get('exist/:profId')
  exist(
    @ProjectId() projectId: number,
    @Param('profId', ParseIntPipe) profId: number,
  ) {
    return this.service.exist(profId, projectId);
  }
}
