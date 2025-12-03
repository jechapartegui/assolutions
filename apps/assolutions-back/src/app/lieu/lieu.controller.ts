import { Body, Controller, Delete, Get, Headers, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { LieuService } from './lieu.services';
import { Lieu_VM } from '@shared/lib/lieu.interface';

// src/auth/auth.controller.ts
@Controller('lieu')
export class LieuController {
  constructor(private readonly lieu_serv: LieuService) {}
  @UseGuards(JwtAuthGuard)
    @Get('get/:id')
  async Get(@Param() { id }: { id: number }) {
    return this.lieu_serv.get(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('getall')
  async GetAll(@Headers('projectid') projectId: number) {
    return this.lieu_serv.getAll(projectId);
  }
  
   @UseGuards(JwtAuthGuard)
  @Get('getall_light')
  async GetAllLight(@Headers('projectid') projectId: number) {
    return this.lieu_serv.getAllLight(projectId);
  }

  @Put('add')
  async Add(@Headers('projectid') projectId: number,@Body() s: Lieu_VM) {
    return this.lieu_serv.add(s, projectId);
  }
  
  @Put('update')
  async Update(@Headers('projectid') projectId: number,@Body() s: Lieu_VM) {
    return this.lieu_serv.update(s, projectId);
  }
  
  
      @UseGuards(JwtAuthGuard)
  @Post('delete')
  async Delete(@Body() body: { id: number}) {
    return this.lieu_serv.delete(body.id);
  }


}