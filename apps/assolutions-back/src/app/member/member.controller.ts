import { Body, Controller, Get, Headers, UseGuards } from '@nestjs/common';
import { PasswordGuard } from '../guards/password.guard';
import { MemberService } from './member.services';

// src/auth/auth.controller.ts
@Controller('member')
export class MemberController {
  constructor(private readonly mem_serv: MemberService) {}
  @UseGuards(PasswordGuard)
  @Get('my_info')
  async MyInfo(@Body() { id }: { id: number }) {
    return this.mem_serv.GetMyInfo(id);
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

}