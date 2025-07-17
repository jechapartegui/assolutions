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
  async MyInfo(@Headers('projectid') projectId: number,@Body() { id }: { id: number }) {
    return this.mem_serv.GetMyInfo(id, projectId);
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
      @Get('get/:id')
    async Get(@Param() { id }: { id: number }) {
      return this.mem_serv.Get(id);
    }
  
    
  
    @Put('add')
    async Add(@Body() s: Adherent_VM) {
      return this.mem_serv.Add(s);
    }
    
    @Put('update')
    async Update(@Body() s: Adherent_VM) {
      return this.mem_serv.Update(s);
    }
    
    
        @UseGuards(PasswordGuard)
    @Delete('delete/:id')
    async Delete(@Param('id') id: number) {
      return this.mem_serv.Delete(id);
    }

}