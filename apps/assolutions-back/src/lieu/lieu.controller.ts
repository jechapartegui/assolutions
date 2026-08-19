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
import { ProjectAccessGuard } from '../common/guards/project-access.guard';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import { CreateLieuDto, UpdateLieuDto } from './lieu.dto';
import { LieuService } from './lieu.service';

@Controller('lieux')
export class LieuController {
  constructor(private readonly service: LieuService) {}

  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  @Get()
  list(@ProjectId() projectId: number) {
    return this.service.listForProject(projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  @Get(':id')
  get(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
  ) {
    return this.service.getForProject(id, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post()
  create(@ProjectId() projectId: number, @Body() dto: CreateLieuDto) {
    return this.service.create(dto, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':id/update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
    @Body() dto: UpdateLieuDto,
  ) {
    return this.service.update(id, dto, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':id/delete')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
  ) {
    return this.service.remove(id, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  @Get('search/:query')
  search(
    @Param('query') query: string,
    @ProjectId() projectId: number,
  ) {
    return this.service.search(query, projectId);
  }
}
