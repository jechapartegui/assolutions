import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AdhesionQueryService } from './adhesion.query.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ProjectAdminGuard } from '../../common/guards/project-admin.guard';
@Controller('adhesion')
export class AdhesionController {
  constructor(private readonly query: AdhesionQueryService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getActiveAdhesion(@Req() req: any) {
    return this.query.getAdhesion(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('anniversaire/:saison_id')
  async getAnniversaire(@Req() req: any) {
    return this.query.getAnniversaire(req.params.saison_id);
  }
}
