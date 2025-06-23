import { Body, Controller, Delete, Get, Headers, Param, Put, UseGuards } from '@nestjs/common';
import { PasswordGuard } from '../guards/password.guard';
import { SeanceService } from './seance.services';
import { SeanceVM } from '@shared/compte/src';

// src/auth/auth.controller.ts
@Controller('seance')
export class SeanceController {
  constructor(private readonly seance_serv: SeanceService) {}
  
  @UseGuards(PasswordGuard)
  @Get('getall/:saison_id')
async GetAll(@Param('saison_id') saison_id: number) {
    return this.seance_serv.GetAll(saison_id);
  }

  @UseGuards(PasswordGuard)
@Get('getbydate/:saison_id/:date_debut/:date_fin')
async GetByDate(
  @Param('saison_id') saison_id: number,
  @Param('date_debut') date_debut: string,
  @Param('date_fin') date_fin: string
) {
    return this.seance_serv.GetByDate(saison_id, date_debut, date_fin);
  }

  @UseGuards(PasswordGuard)
  @Get('get/:id')
  async GetById(@Param('id') id: number ) {
    return this.seance_serv.Get(id);
  }

  @UseGuards(PasswordGuard)
  @Put('add')
  async Add(@Headers('projectid') projectId: number, @Body() { seance }: { seance: SeanceVM }) {
    return this.seance_serv.Add(projectId, seance);
  } 

  @UseGuards(PasswordGuard)
  @Put('add_range')
  async AddRange(@Headers('projectid') projectId: number, @Body() {
    seance, date_debut_serie, date_fin_serie, jour_semaine
  }: { seance: SeanceVM, date_debut_serie: Date, date_fin_serie: Date, jour_semaine: string }) {
    return this.seance_serv.AddRange(projectId, seance, date_debut_serie, date_fin_serie, jour_semaine);
  } 

  @UseGuards(PasswordGuard)
  @Put('update')
  async Update(@Headers('projectid') projectId: number, @Body() { seance }: { seance: SeanceVM }) {
    return this.seance_serv.Update(projectId, seance);
  }
  @UseGuards(PasswordGuard)
@Delete('delete/:id')
  async Delete(@Param('id') id: number) {
    return this.seance_serv.Delete(id);
  }


}