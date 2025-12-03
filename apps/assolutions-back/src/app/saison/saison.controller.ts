import { Body, Controller, Delete, Get, Headers, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Saison_VM } from '@shared/lib/saison.interface';
import { SaisonService } from './saison.services';

@Controller('saison')
export class SaisonController {
  constructor(private readonly saison_serv: SaisonService) {}
  @UseGuards(JwtAuthGuard)
  @Get('get/:id')
  async Get(@Param('id') id: number) {
    return this.saison_serv.Get(id);
  }

  
  @UseGuards(JwtAuthGuard)
@Get('active_saison')
async GetActive(@Headers('projectid') projectId: number) {
  return this.saison_serv.GetSaisonActive(projectId);
}


  @UseGuards(JwtAuthGuard)
  @Get('getall')
  async GetAll(@Headers('projectid') projectId: number) {
    return this.saison_serv.GetAll(projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('getall_light')
  async GetAllLight(@Headers('projectid') projectId: number) {
    return this.saison_serv.GetAllLight(projectId);
  }

@Put('add')
async Add(@Headers('projectid') projectId: number,@Body() s: Saison_VM) {
  return this.saison_serv.add(s, projectId);
}

@Put('update')
async Update(@Headers('projectid') projectId: number,@Body() s: Saison_VM) {
  return this.saison_serv.update(s, projectId);
}


    @UseGuards(JwtAuthGuard)
@Post('delete')
async Delete(@Body() body: { id: number}) {
  return this.saison_serv.delete(body.id);
}

}