import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { InscriptionSeanceService } from './inscription_seance.services';
import { FullInscriptionSeance_VM, InscriptionSeance_VM } from '@shared/lib/inscription_seance.interface';

//   this.url = environment.maseance + 'api/inscription_seance/get/' + id;
//  this.url = environment.maseance + 'api/inscription_seance/get_full/' + id;
// this.url = `api/inscription_seance/get_all_rider_saison/${rider_id}/${saison_id}`;
//  this.url = environment.maseance + 'api/inscription_seance/get_all_seance/' + seance_id;
//   this.url = environment.maseance + 'api/inscription_seance/add';
//     this.url = environment.maseance + 'api/inscription_seance/update';
//  this.url = environment.maseance + 'api/inscription_seance/delete/' + id;
@Controller('inscription_seance')
export class InscriptionSeanceController {
  constructor(private readonly inscription_seance_serv: InscriptionSeanceService) {}
  @UseGuards(JwtAuthGuard)
  @Get('get/:personne_id/:seance_id')
  async Get(@Param('personne_id') personne_id: number, @Param('seance_id') seance_id: number) {
    return this.inscription_seance_serv.Get(personne_id, seance_id);
  }
  @UseGuards(JwtAuthGuard)
  @Get('get_full/:personne_id/:seance_id')
  async GetFull(@Param('personne_id') personne_id: number, @Param('seance_id') seance_id: number) {
    return this.inscription_seance_serv.GetFull(personne_id, seance_id);
  }
    @UseGuards(JwtAuthGuard)
  @Get('get_adherent_compte/:id/:id_seance')
  async GetAdherentCompte(@Param('id') id: string,@Param('id_seance') id_seance:number) {
    return this.inscription_seance_serv.GetAdherentCompte(id, id_seance);
  }

      @UseGuards(JwtAuthGuard)
  @Get('get_adherent_personne/:id/:id_seance')
  async GetAdherentPersonne(@Param('id') id: number,@Param('id_seance') id_seance:number) {
    return this.inscription_seance_serv.GetAdherentPersonne(id, id_seance);
  }



  @UseGuards(JwtAuthGuard)
@Get('get_all_rider_saison/:rider_id/:saison_id')
async GetAllRiderSaison(@Param('rider_id') rider_id: number, @Param('saison_id') saison_id: number) {
  return this.inscription_seance_serv.GetAllRiderSaison(rider_id, saison_id);
}

  @UseGuards(JwtAuthGuard)
@Get('get_all_seance/:seance_id')
async GetAllSeance(@Param('seance_id') seance_id: number) : Promise<InscriptionSeance_VM[]> {
  return this.inscription_seance_serv.GetAllSeance(seance_id);
}

  @UseGuards(JwtAuthGuard)
@Get('get_all_seance_full/:seance_id')
async GetAllSeanceFull(@Param('seance_id') seance_id: number) : Promise<FullInscriptionSeance_VM[]> {
  return this.inscription_seance_serv.GetAllSeanceFull(seance_id);
}

  @UseGuards(JwtAuthGuard)
@Post('faire_essai')
async FaireEssai(@Body() { personId, sessionId }: { personId: number; sessionId: number }
  ) : Promise<InscriptionSeance_VM> {
  return this.inscription_seance_serv.FaireEssai(personId, sessionId);
}

@Put('add')
async Add(@Body() inscription: InscriptionSeance_VM): Promise<InscriptionSeance_VM>  {
  return this.inscription_seance_serv.Add(inscription);
}

@Put('update')
async Update(@Body() inscription: InscriptionSeance_VM) {
  return this.inscription_seance_serv.Update(inscription);
}


    @UseGuards(JwtAuthGuard)
@Post('delete')
async Delete(@Body() body: { personne_id: number, seance_id: number})  {
  return this.inscription_seance_serv.Delete(body.personne_id, body.seance_id);
}

}