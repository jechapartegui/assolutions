import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { SeanceService } from './seance.services';
import { Seance_VM, SeanceProfesseur_VM } from '@shared/lib/seance.interface';

// src/auth/auth.controller.ts
@Controller('seance')
export class SeanceController {
  constructor(private readonly seance_serv: SeanceService) {}
  
  @UseGuards(JwtAuthGuard)
  @Get('getall/:saison_id')
async GetAll(@Param('saison_id') saison_id: number) {
    return this.seance_serv.GetAll(saison_id);
  }

    @UseGuards(JwtAuthGuard)
  @Get('getall_public/:saison_id')
async GetAllPublic(@Param('saison_id') saison_id: number) {
    return this.seance_serv.GetAllPublic(saison_id);
  }

  @UseGuards(JwtAuthGuard)
@Get('getbydate/:saison_id/:date_debut/:date_fin')
async GetByDate(
  @Param('saison_id') saison_id: number,
  @Param('date_debut') date_debut: string,
  @Param('date_fin') date_fin: string
) {
    return this.seance_serv.GetByDate(saison_id, date_debut, date_fin);
  }

  @UseGuards(JwtAuthGuard)
  @Get('get/:id')
  async GetById(@Param('id') id: number ) {
    return this.seance_serv.Get(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('add')
  async Add(@Body() { seance }: { seance: Seance_VM }) {
    return this.seance_serv.Add(seance);
  } 

  @UseGuards(JwtAuthGuard)
  @Put('add_range')
  async AddRange(@Body() {
    seance, date_debut_serie, date_fin_serie, jour_semaine
  }: { seance: Seance_VM, date_debut_serie: Date, date_fin_serie: Date, jour_semaine: string }) {
    return this.seance_serv.AddRange(seance, date_debut_serie, date_fin_serie, jour_semaine);
  } 

  @UseGuards(JwtAuthGuard)
  @Put('update')
  async Update(@Body() { seance }: { seance: Seance_VM }) {
    return this.seance_serv.Update(seance);
  }
  @UseGuards(JwtAuthGuard)
@Post('delete')
  async Delete(@Body() body: { id: number}) {
    return this.seance_serv.Delete(body.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('update_seance_prof')
  async UpdateSeanceProf(@Body() { seance_id, liste_seance_prof }: { seance_id: number, liste_seance_prof: SeanceProfesseur_VM[] }) {
    return this.seance_serv.UpdateSeanceProf(seance_id, liste_seance_prof);
  }


}