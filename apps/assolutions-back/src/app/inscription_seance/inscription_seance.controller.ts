import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { PasswordGuard } from '../guards/password.guard';
import { InscriptionSeanceService } from './inscription_seance.services';
import { FullInscriptionSeance_VM, InscriptionSeance_VM } from '@shared/src/lib/inscription_seance.interface';

//   this.url = 'api/inscription_seance/get/' + id;
//  this.url = 'api/inscription_seance/get_full/' + id;
// this.url = `api/inscription_seance/get_all_rider_saison/${rider_id}/${saison_id}`;
//  this.url = 'api/inscription_seance/get_all_seance/' + seance_id;
//   this.url = 'api/inscription_seance/add';
//     this.url = 'api/inscription_seance/update';
//  this.url = 'api/inscription_seance/delete/' + id;
@Controller('inscription_seance')
export class InscriptionSeanceController {
  constructor(private readonly inscription_seance_serv: InscriptionSeanceService) {}
  @UseGuards(PasswordGuard)
  @Get('get/:id')
  async Get(@Param('id') id: number) {
    return this.inscription_seance_serv.Get(id);
  }
  @UseGuards(PasswordGuard)
  @Get('get_full/:id')
  async GetFull(@Param('id') id: number) {
    return this.inscription_seance_serv.GetFull(id);
  }

  @UseGuards(PasswordGuard)
@Get('get_all_rider_saison/:rider_id/:saison_id')
async GetAllRiderSaison(@Param('rider_id') rider_id: number, @Param('saison_id') saison_id: number) {
  return this.inscription_seance_serv.GetAllRiderSaison(rider_id, saison_id);
}

  @UseGuards(PasswordGuard)
@Get('get_all_seance/:seance_id')
async GetAllSeance(@Param('seance_id') seance_id: number) : Promise<InscriptionSeance_VM[]> {
  return this.inscription_seance_serv.GetAllSeance(seance_id);
}

  @UseGuards(PasswordGuard)
@Get('get_all_seance_full/:seance_id')
async GetAllSeanceFull(@Param('seance_id') seance_id: number) : Promise<FullInscriptionSeance_VM[]> {
  return this.inscription_seance_serv.GetAllSeanceFull(seance_id);
}

@Put('add')
async Add(@Body() inscription: InscriptionSeance_VM) {
  return this.inscription_seance_serv.Add(inscription);
}

@Put('update')
async Update(@Body() inscription: InscriptionSeance_VM) {
  return this.inscription_seance_serv.Update(inscription);
}


    @UseGuards(PasswordGuard)
@Delete('delete/:id')
async Delete(@Param('id') id: number) {
  return this.inscription_seance_serv.Delete(id);
}

}