import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AdhesionQueryService } from './adhesion.query.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
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

  @UseGuards(JwtAuthGuard)
  @Post('adherent/:saison_id')
  async getAdherentAdhesion(@Req() req: any) {
    return this.query.GetAdherentAdhesion(req.params.saison_id, req.user.login);
  }

 
}
