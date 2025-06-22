import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { PasswordGuard } from '../guards/password.guard';
import { ProfService } from './prof.services';

// src/auth/auth.controller.ts
@Controller('prof')
export class ProfController {
  constructor(private readonly prof_serv: ProfService) {}
  @UseGuards(PasswordGuard)
  @Get('get')
  async Get(@Param() { id }: { id: number }) {
    return this.prof_serv.Get(id);
  }

   @UseGuards(PasswordGuard)
  @Get('get_prof_seance')
  async GetProfSeance(@Param() { seance_id }: { seance_id: number }) {
    return this.prof_serv.GetProfSeance(seance_id);
  }

    @UseGuards(PasswordGuard)
  @Get('get_prof_saison/:saison_id')
async GetProfSaison(@Param('saison_id') saison_id : number ) {
    return this.prof_serv.GetProfSaison(saison_id);
  }

}