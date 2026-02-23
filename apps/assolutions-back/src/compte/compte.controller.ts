import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { CompteService } from './compte.service';
import { CreateCompteDto, UpdateCompteDto } from './compte.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';

@Controller('comptes')
export class CompteController {
  constructor(private readonly service: CompteService) {}

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Get()
  list(@Req() req: any) {
    return this.service.list(req.projectId);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.get(id);
  }

  @Post()
  create(@Body() dto: CreateCompteDto) {
    return this.service.create(dto);
  }

  // ✅ UPDATE via POST (serveur friendly)
  @Post(':id/update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCompteDto) {
    return this.service.update(id, dto);
  }

  @Post('check-token')
  check_token(@Body() body: { login: string; token: string }) {
    return this.service.check_token(body.login, body.token);
  }

  // ✅ DELETE via POST (serveur friendly)
  @Post(':id/delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
