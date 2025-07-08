import { Body, Controller, Delete, Get, Headers, Param, Put, UseGuards } from '@nestjs/common';
import { PasswordGuard } from '../guards/password.guard';
import { MemberService } from './member.services';
import  { Adherent_VM } from '@shared/src';
import { SeanceService } from '../seance/seance.services';

// src/auth/auth.controller.ts
@Controller('member')
export class MemberController {
  constructor(private readonly mem_serv: MemberService, private readonly seance_serv:SeanceService) {}
  @UseGuards(PasswordGuard)
  @Get('my_info')
  async MyInfo(@Body() { id }: { id: number }) {
    return this.mem_serv.GetMyInfo(id);
  }
@UseGuards(PasswordGuard)
  @Get('getallseance')
async GetAllSeance(@Param('saison_id') saison_id: number) {
    return this.seance_serv.GetAll(saison_id);
  }
  @UseGuards(PasswordGuard)
  @Get('my_seance')
  async MySeance(@Headers('projectid') projectId: number,@Headers('userid') userid: number) {
    return this.mem_serv.GetMySeance(userid, projectId);
  }
  @UseGuards(PasswordGuard)
  @Get('my_prof')
  async MyProf(@Headers('projectid') projectId: number,@Headers('userid') userid: number) {
    return this.mem_serv.GetMyProf(userid, projectId);
  }
  @UseGuards(PasswordGuard)
  @Get('is_gestionnaire')
  async IsGestionnaire(@Headers('projectid') projectId: number,@Headers('userid') userid: number) {
    return this.mem_serv.GetGestionnaire(userid, projectId);
  }
   @UseGuards(PasswordGuard)
      @Get('get/:id')
    async Get(@Param() { id }: { id: number }) {
      return this.mem_serv.Get(id);
    }
  
    @UseGuards(PasswordGuard)
    @Get('getall/:saison_id')
    async GetAll(@Headers('projectid') projectId: number,@Param('saison_id') saison_id: number) {
      return this.mem_serv.GetAll(saison_id,projectId);
    }
    
     @UseGuards(PasswordGuard)
    @Get('getall_light/:saison_id')
    async GetAllLight(@Headers('projectid') projectId: number,@Param('saison_id') saison_id: number) {
      return this.mem_serv.GetAllLight(saison_id,projectId);
    }
       @UseGuards(PasswordGuard)
    @Get('getall_adherent/:saison_id')
    async GetAllAdherent(@Headers('projectid') projectId: number,@Param() { saison_id }: { saison_id: number }) {
      return this.mem_serv.GetAllAdherent(saison_id,projectId);
    }
           @UseGuards(PasswordGuard)
    @Get('getall_adherent_light/:saison_id')
    async GetAllAdherentLight(@Headers('projectid') projectId: number,@Param() { saison_id }: { saison_id: number }) {
      return this.mem_serv.GetAllAdherentLight(saison_id,projectId);
    }
  
    @Put('add')
    async Add(@Headers('projectid') projectId: number,@Body() s: Adherent_VM) {
      return this.mem_serv.Add(s, projectId);
    }
    
    @Put('update')
    async Update(@Headers('projectid') projectId: number,@Body() s: Adherent_VM) {
      return this.mem_serv.Update(s, projectId);
    }
    
    
        @UseGuards(PasswordGuard)
    @Delete('delete/:id')
    async Delete(@Param('id') id: number) {
      return this.mem_serv.Delete(id);
    }

}