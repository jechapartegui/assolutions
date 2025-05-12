import { Body, Controller, Get, Headers, UseGuards } from '@nestjs/common';
import { PasswordGuard } from '../guards/password.guard';
import { SeanceService } from './seance.services';

// src/auth/auth.controller.ts
@Controller('seance')
export class SeanceController {
  constructor(private readonly seance_serv: SeanceService) {}
  @UseGuards(PasswordGuard) 

  @UseGuards(PasswordGuard)
  @Get('get')
  async Get(@Headers('projectid') projectId: number,@Body() { id }: { id: number }) {
    return true;
  }


}