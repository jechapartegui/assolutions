import { Body, Controller, Get, Headers, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CoursService } from './cours.services';
import { Cours_VM } from '@shared/lib/cours.interface';

@Controller('cours')
export class CoursController {
  constructor(private readonly cours_serv: CoursService) {}
    @UseGuards(JwtAuthGuard)
      @Get('get/:id')
    async Get(@Param() { id }: { id: number }) {
      return this.cours_serv.Get(id);
    }
  
    @UseGuards(JwtAuthGuard)
    @Get('getall/:saison_id')
    async GetAll(@Param('saison_id') saison_id: number) {
      return this.cours_serv.GetAll(saison_id);
    }
    
     @UseGuards(JwtAuthGuard)
    @Get('getall_light/:saison_id')
    async GetAllLight(@Param('saison_id') saison_id: number) {
      return this.cours_serv.GetAllLight(saison_id);
    }
  
        @UseGuards(JwtAuthGuard)
    @Put('add')
    async Add(@Headers('projectid') projectId: number,@Body() s: any) {
      return this.cours_serv.Add(s, projectId);
    }
    
        @UseGuards(JwtAuthGuard)
    @Put('update')
    async Update(@Headers('projectid') projectId: number,@Body() s: any) {
      return this.cours_serv.Update(s, projectId);
    }
    
    
        @UseGuards(JwtAuthGuard)
    @Post('delete')
    async Delete(@Body() body: { id: number}) {
      return this.cours_serv.Delete(body.id);
    }

            @UseGuards(JwtAuthGuard)
    @Post('updateserie')
    async UpdateSerie(@Body() body: { cours:Cours_VM, date:Date}) {
      return this.cours_serv.UpdateSerie(body.cours, body.date);
    }

}