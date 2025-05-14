import { Body, Controller, Get, Headers, UseGuards } from '@nestjs/common';
import { PasswordGuard } from '../guards/password.guard';
import { InscritpionSeanceService } from './inscription_seance.services';

// src/auth/auth.controller.ts
@Controller('inscription_seance')
export class InscritpionSeanceController {
  constructor(private readonly lieu_serv: InscritpionSeanceService) {}
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