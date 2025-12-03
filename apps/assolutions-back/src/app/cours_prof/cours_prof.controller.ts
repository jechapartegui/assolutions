import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CoursProfService } from './cours_prof.services';

// src/auth/auth.controller.ts
@Controller('cours_prof')
export class CoursProfController {
  constructor(private readonly cp_serv: CoursProfService) {}
  @UseGuards(JwtAuthGuard)
    @Get('get/:id')
  async Get(@Param() { id }: { id: number }) {
    return this.cp_serv.get(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('getall/:id')
  async GetAll(@Param() { id }: { id: number }) {
    return this.cp_serv.getAll(id);
  }
  
  @Put('add')
async Add(@Body() body: { cours_id: number; person_id: number }) {
  return this.cp_serv.add(body.cours_id, body.person_id);
}
    
  
      @UseGuards(JwtAuthGuard)
  @Post('delete')
  async Delete(@Body() body: { cours_id: number, person_id: number }) {
    return this.cp_serv.delete(body.cours_id, body.person_id);
  }


}