import { Body, Controller, Delete, Get, Param, Put, UseGuards } from "@nestjs/common";
import { GroupeService } from "./groupe.service";
import { PasswordGuard } from "../guards/password.guard";
import type { KeyValuePair } from "@shared/src/lib/autres.interface";

@Controller('groupe')
export class GroupeController {
  constructor(private readonly groupe_serv: GroupeService) {}
 @UseGuards(PasswordGuard)
      @Get('get/:id')
    async Get(@Param() { id }: { id: number }) {
      return this.groupe_serv.Get(id);
    }
  
    @UseGuards(PasswordGuard)
    @Get('getall/:saison_id')
    async GetAll(@Param('saison_id') saison_id: number) {
      return this.groupe_serv.GetAll(saison_id);
    }
    
     
  
    @Put('add')
    async Add(@Body() body: { saison_id: number; gr: KeyValuePair }) {
      const { saison_id, gr } = body;
      return this.groupe_serv.add(gr, saison_id);
    }

@Put('update')
async Update(@Body() body: { saison_id: number; gr: KeyValuePair }) {
  const { saison_id, gr } = body;
  return this.groupe_serv.update(gr, saison_id);
}

        @UseGuards(PasswordGuard)
    @Delete('delete/:id')
    async Delete(@Param('id') id: number) {
      return this.groupe_serv.delete(id);
    }

     @Put('addlien')
    async AddLien(@Body() body: { id_objet: number; type_objet: string; id_groupe: number }) {
      const { id_objet, type_objet, id_groupe} = body;
      console.warn('AddLien', id_objet, type_objet, id_groupe);
      return this.groupe_serv.AddLien(id_objet, type_objet, id_groupe);
    }

        @UseGuards(PasswordGuard)
@Delete('deletelien/:id')
async DeleteLien(
  @Param('id') id: number,
) {
  return this.groupe_serv.DeleteLien(id);
}

}