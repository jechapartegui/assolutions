import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { MesSeancesQueryService } from './mes_seances.query.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ProjectId } from '../../common/decorators/project-id.decorator';
@Controller('mes-seances')
export class MesSeancesController {
  constructor(private readonly query: MesSeancesQueryService) {}

  @UseGuards(JwtAuthGuard)
  @Get('adherent')
  async Adherents(@Req() req: any, @ProjectId() projectId: number) {
    return this.query.getAdherents(req.user.id, projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('prof')
  async Profs(@Req() req: any, @ProjectId() projectId: number) {
    return this.query.getProfs(req.user.id, projectId);
  }
}
