import { Body, Controller, Delete, Get, Headers, Param, Put, UseGuards } from '@nestjs/common';
import { PasswordGuard } from '../guards/password.guard';
import { CoursService } from './cours.services';

@Controller('cours')
export class CoursController {
  constructor(private readonly cours_serv: CoursService) {}
    @UseGuards(PasswordGuard)
      @Get('get/:id')
    async Get(@Param() { id }: { id: number }) {
      return this.cours_serv.Get(id);
    }
  
    @UseGuards(PasswordGuard)
    @Get('getall/:saison_id')
    async GetAll(@Param('saison_id') saison_id: number) {
      return this.cours_serv.GetAll(saison_id);
    }
    
     @UseGuards(PasswordGuard)
    @Get('getall_light/:saison_id')
    async GetAllLight(@Param('saison_id') saison_id: number) {
      return this.cours_serv.GetAllLight(saison_id);
    }
  
    @Put('add')
    async Add(@Headers('projectid') projectId: number,@Body() s: any) {
      return this.cours_serv.Add(s, projectId);
    }
    
    @Put('update')
    async Update(@Headers('projectid') projectId: number,@Body() s: any) {
      return this.cours_serv.Update(s, projectId);
    }
    
    
        @UseGuards(PasswordGuard)
    @Delete('delete/:id')
    async Delete(@Param('id') id: number) {
      return this.cours_serv.Delete(id);
    }

}