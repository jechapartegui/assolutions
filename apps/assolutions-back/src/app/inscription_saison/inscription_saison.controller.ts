import { Body, Controller, Delete, Get, Headers, Param, Put, UseGuards } from '@nestjs/common';
import { PasswordGuard } from '../guards/password.guard';
import { InscriptionSaisonService } from './inscription_saison.services';
import { InscriptionSaison_VM } from '@shared/lib/inscription_saison.interface';

//   this.url = environment.maseance + 'api/inscription_seance/get/' + id;
//  this.url = environment.maseance + 'api/inscription_seance/get_full/' + id;
// this.url = `api/inscription_seance/get_all_rider_saison/${rider_id}/${saison_id}`;
//  this.url = environment.maseance + 'api/inscription_seance/get_all_seance/' + seance_id;
//   this.url = environment.maseance + 'api/inscription_seance/add';
//     this.url = environment.maseance + 'api/inscription_seance/update';
//  this.url = environment.maseance + 'api/inscription_seance/delete/' + id;
@Controller('inscription_saison')
export class InscriptionSaisonController {
  constructor(private readonly inscription_saison_serv: InscriptionSaisonService) {}
  @UseGuards(PasswordGuard)
  @Get('get/:id')
  async Get(@Param('id') id: number) {
    return this.inscription_saison_serv.Get(id);
  }

  @UseGuards(PasswordGuard)
@Get('get_all_rider/:rider_id')
async GetAllRider(@Headers('projectid') projectId: number,@Param('rider_id') rider_id: number) {
  return this.inscription_saison_serv.GetAllRider(rider_id, projectId);
}
  @UseGuards(PasswordGuard)
@Get('get_all_saison/:saison_id')
async GetAllSaison(@Param('saison_id') saison_id: number) {
  return this.inscription_saison_serv.GetAllSaison(saison_id);
}
  @UseGuards(PasswordGuard)
@Get('get_all_saison/:saison_id/:rider_id')
async GetAllSeasonRider(@Param('saison_id') saison_id: number,@Param('rider_id') rider_id: number) {
  return this.inscription_saison_serv.GetAllSeasonRider(saison_id, rider_id);
}

@Put('add')
async Add(@Body() inscription: InscriptionSaison_VM) {
  return this.inscription_saison_serv.Add(inscription);
}

@Put('update')
async Update(@Body() inscription: InscriptionSaison_VM) {
  return this.inscription_saison_serv.Update(inscription);
}


    @UseGuards(PasswordGuard)
@Delete('delete/:id')
async Delete(@Param('id') id: number) {
  return this.inscription_saison_serv.Delete(id);
}

}