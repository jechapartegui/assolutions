import { Body, Controller, Get, Headers, UseGuards } from '@nestjs/common';
import { PasswordGuard } from '../../guards/password.guard';
import { LieuService } from './lieu.services';

// src/auth/auth.controller.ts
@Controller('lieu')
export class LieuController {
  constructor(private readonly lieu_serv: LieuService) {}
  @UseGuards(PasswordGuard)
  @Get('get')
  async Get(@Body() { id }: { id: number }) {
    return this.lieu_serv.Get(id);
  }

  @UseGuards(PasswordGuard)
  @Get('getall')
  async GetAll(@Headers('projectid') projectId: number) {
    return this.lieu_serv.GetAll(projectId);
  }
  

}