import { Body, Controller, Get, UseGuards } from '@nestjs/common';
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
  async MySeance(@Body() { id }: { id: number }) {
    return this.mem_serv.GetMySeance(id);
  }


}