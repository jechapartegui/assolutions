import { Body, Controller, Delete, Get, Headers, Param, Put, UseGuards } from '@nestjs/common';
import { PasswordGuard } from '../guards/password.guard';
import type { saison } from '@shared/compte/src/lib/saison.interface';
import { SaisonService } from './saison.services';

@Controller('saison')
export class SaisonController {
  constructor(private readonly saison_serv: SaisonService) {}
  @UseGuards(PasswordGuard)
  @Get('get/:id')
  async Get(@Param('id') id: number) {
    return this.saison_serv.Get(id);
  }
  @UseGuards(PasswordGuard)
  @Get('getall')
  async GetAll(@Headers('projectid') projectId: number) {
    return this.saison_serv.GetAll(projectId);
  }

  @UseGuards(PasswordGuard)
  @Get('getall_light')
  async GetAllLight(@Headers('projectid') projectId: number) {
    return this.saison_serv.GetAllLight(projectId);
  }

@Put('add')
async Add(@Headers('projectid') projectId: number,@Body() s: saison) {
  return this.saison_serv.Add(s, projectId);
}

@Put('update')
async Update(@Headers('projectid') projectId: number,@Body() s: saison) {
  return this.saison_serv.Update(s, projectId);
}


    @UseGuards(PasswordGuard)
@Delete('delete/:id')
async Delete(@Param('id') id: number) {
  return this.saison_serv.Delete(id);
}

}