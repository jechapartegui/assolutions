import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { PasswordGuard } from '../guards/password.guard';
import { CoursProfService } from './cours_prof.services';

// src/auth/auth.controller.ts
@Controller('cours_prof')
export class CoursProfController {
  constructor(private readonly cp_serv: CoursProfService) {}
  @UseGuards(PasswordGuard)
    @Get('get/:id')
  async Get(@Param() { id }: { id: number }) {
    return this.cp_serv.get(id);
  }

  @UseGuards(PasswordGuard)
  @Get('getall/:id')
  async GetAll(@Param() { id }: { id: number }) {
    return this.cp_serv.getAll(id);
  }
  
  @Put('add')
async Add(@Body() body: { cours_id: number; person_id: number }) {
  return this.cp_serv.add(body.cours_id, body.person_id);
}
    
  
      @UseGuards(PasswordGuard)
  @Delete('delete/:cours_id/:person_id')
  async Delete(@Param('cours_id') cours_id: number, @Param('person_id') person_id: number) {
    return this.cp_serv.delete(cours_id, person_id);
  }


}