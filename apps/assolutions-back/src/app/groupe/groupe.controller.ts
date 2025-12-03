import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { GroupeService } from "./groupe.service";import { JwtAuthGuard } from '../guards/jwt-auth.guard';

import { Groupe_VM } from "@shared/lib/groupe.interface";

@Controller('groupe')
export class GroupeController {
  constructor(private readonly groupe_serv: GroupeService) {}
 @UseGuards(JwtAuthGuard)
      @Get('get/:id')
    async Get(@Param() { id }: { id: number }) {
      return this.groupe_serv.Get(id);
    }
  
    @UseGuards(JwtAuthGuard)
    @Get('getall/:saison_id')
    async GetAll(@Param('saison_id') saison_id: number) {
      return this.groupe_serv.GetAll(saison_id, false);
    }
        @UseGuards(JwtAuthGuard)
    @Get('getalladmin/:saison_id')
    async GetAllAdmin(@Param('saison_id') saison_id: number) {
      return this.groupe_serv.GetAll(saison_id, true);
    }
     
  
    @Put('add')
    async Add(@Body() body: { gr: Groupe_VM }) {
      const { gr } = body;
      return this.groupe_serv.add(gr);
    }

@Put('update')
async Update(@Body() body: { gr: Groupe_VM })  {
      const { gr } = body;
  return this.groupe_serv.update(gr);
}

        @UseGuards(JwtAuthGuard)
    @Post('delete')
    async Delete(@Body() body: { id: number}) {
      return this.groupe_serv.delete(body.id);
    }

     @Put('addlien')
    async AddLien(@Body() body: { id_objet: number; type_objet: string; id_groupe: number }) {
      const { id_objet, type_objet, id_groupe} = body;
      return this.groupe_serv.AddLien(id_objet, type_objet, id_groupe);
    }

        @UseGuards(JwtAuthGuard)
@Post('deletelien')
async DeleteLien(
 @Body() body: { id: number }) {
      const { id } = body;
  return this.groupe_serv.DeleteLien(id);
}

}