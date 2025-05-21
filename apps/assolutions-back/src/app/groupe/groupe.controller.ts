import { Body, Controller, Delete, Get, Param, Put, UseGuards } from "@nestjs/common";
import { GroupeService } from "./groupe.service";
import { PasswordGuard } from "../guards/password.guard";
import type { KeyValuePair } from "@shared/compte/src/lib/autres.interface";

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
    async Add(@Body() body: { saison_id: number; s: KeyValuePair }) {
      const { saison_id, s } = body;
      return this.groupe_serv.Add(s, saison_id);
    }

@Put('update')
async Update(@Body() body: { saison_id: number; s: KeyValuePair }) {
  const { saison_id, s } = body;
  return this.groupe_serv.Update(s, saison_id);
}

        @UseGuards(PasswordGuard)
    @Delete('delete/:id')
    async Delete(@Param('id') id: number) {
      return this.groupe_serv.Delete(id);
    }

}