import { Body, Controller, Headers, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { PasswordGuard } from '../guards/password.guard';
import { ProfService } from './prof.services';
import { ContratLight_VM, Professeur_VM } from '@shared/lib/prof.interface';

// src/auth/auth.controller.ts
@Controller('prof')
export class ProfController {
  constructor(private readonly prof_serv: ProfService) {}
  @UseGuards(PasswordGuard)
  @Get('get/:id')
  async Get(@Param() { id }: { id: number }) {
    return this.prof_serv.Get(id);
  }

  @Get('getall')
  async GetAll(@Headers('projectid') projectId: number) {
    return this.prof_serv.GetAll(projectId);
  }

   @UseGuards(PasswordGuard)
  @Get('get_prof_seance/:seance_id')
  async GetProfSeance(@Param('seance_id') seance_id : number ) {
    return this.prof_serv.GetProfSeance(seance_id);
  }

    @UseGuards(PasswordGuard)
  @Get('get_prof_saison/:saison_id')
async GetProfSaison(@Param('saison_id') saison_id : number ) {
    return this.prof_serv.GetProfSaison(saison_id);
  }

  
    @UseGuards(PasswordGuard)
  @Post('add_contrat')
  async add_contrat(@Body() body: { contrat: ContratLight_VM, prof_id: number}) {
    return this.prof_serv.add_contrat(body.contrat, body.prof_id);
  }

      @UseGuards(PasswordGuard)
  @Post('update_contrat')
  async update_contrat(@Body() body: { contrat: ContratLight_VM, prof_id: number}) {
    return this.prof_serv.update_contrat(body.contrat, body.prof_id);
  }

  @Put('add')
  async Add(@Body() s: Professeur_VM) {
    return this.prof_serv.add(s);
  }
  
  @Put('update')
  async Update(@Body() s: Professeur_VM) {
    return this.prof_serv.update(s);
  }
  
  
  @UseGuards(PasswordGuard)
  @Post('delete')
  async Delete(@Body() body: { id: number}) {
    return this.prof_serv.delete(body.id);
  }

}