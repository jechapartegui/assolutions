import { Body, Controller, Delete, Get, Headers, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { MemberService } from './member.services';
import  { Adherent_VM } from '@shared/lib/member.interface';
import { SeanceService } from '../seance/seance.services';

// src/auth/auth.controller.ts
@Controller('member')
export class MemberController {
  constructor(private readonly mem_serv: MemberService, private readonly seance_serv:SeanceService) {}
  @UseGuards(JwtAuthGuard)
  @Get('my_info')
  async MyInfo(@Headers('projectid') projectId: number,@Body() { id }: { id: number }) {
    return this.mem_serv.GetMyInfo(id, projectId);
  }
@UseGuards(JwtAuthGuard)
  @Get('getallseance')
async GetAllSeance(@Param('saison_id') saison_id: number) {
    return this.seance_serv.GetAll(saison_id);
  }
  @UseGuards(JwtAuthGuard)
  @Get('anniversaire/:saison_id')
async anniv(@Param('saison_id') saison_id: number) {
    return this.mem_serv.anniv(saison_id);
  }
  @UseGuards(JwtAuthGuard)
  @Get('getall_adherent/:saison_id')
async GetAllAdherent(@Param('saison_id') saison_id: number) {
    return this.mem_serv.GetAll(saison_id);
  }
  
  @UseGuards(JwtAuthGuard)
  @Get('get_all_ever_account/:compte_id')
async GetAllEver(@Param('compte_id') compte_id: number) {
    return this.mem_serv.GetAllEver(compte_id);
  }
  @UseGuards(JwtAuthGuard)
  @Get('my_seance')
  async MySeance(@Headers('projectid') projectId: number,@Headers('userid') userid: number) {
    return this.mem_serv.GetMySeance(userid, projectId);
  }
  @UseGuards(JwtAuthGuard)
  @Get('my_prof')
  async MyProf(@Headers('projectid') projectId: number,@Headers('userid') userid: number) {
    return this.mem_serv.GetMyProf(userid, projectId);
  }

   @UseGuards(JwtAuthGuard)
      @Get('get/:id')
    async Get(@Headers('projectid') projectId: number,@Param() { id }: { id: number }) {
      return this.mem_serv.Get(id, projectId);
    }
  
    
  
    @Put('add')
    async Add(@Body() s: Adherent_VM) {
      return this.mem_serv.Add(s);
    }
    
    @Put('update')
    async Update(@Body() s: Adherent_VM) {
      return this.mem_serv.Update(s);
    }
    
    
        @UseGuards(JwtAuthGuard)
    @Post('delete')
    async Delete(@Body() body: { id: number}) {
      return this.mem_serv.Delete(body.id);
    }

}