import { Body, Controller, Delete, Get, Headers, Param, Put, UseGuards } from '@nestjs/common';
import { PasswordGuard } from '../guards/password.guard';
import { LieuService } from './lieu.services';
import type { lieu } from '@shared/compte/src/lib/lieu.interface';

// src/auth/auth.controller.ts
@Controller('lieu')
export class LieuController {
  constructor(private readonly lieu_serv: LieuService) {}
  @UseGuards(PasswordGuard)
    @Get('get/:id')
  async Get(@Param() { id }: { id: number }) {
    return this.lieu_serv.Get(id);
  }

  @UseGuards(PasswordGuard)
  @Get('getall')
  async GetAll(@Headers('projectid') projectId: number) {
    return this.lieu_serv.GetAll(projectId);
  }
  
   @UseGuards(PasswordGuard)
  @Get('getall_light')
  async GetAllLight(@Headers('projectid') projectId: number) {
    return this.lieu_serv.GetAllLight(projectId);
  }

  @Put('add')
  async Add(@Headers('projectid') projectId: number,@Body() s: lieu) {
    return this.lieu_serv.Add(s, projectId);
  }
  
  @Put('update')
  async Update(@Headers('projectid') projectId: number,@Body() s: lieu) {
    return this.lieu_serv.Update(s, projectId);
  }
  
  
      @UseGuards(PasswordGuard)
  @Delete('delete/:id')
  async Delete(@Param('id') id: number) {
    return this.lieu_serv.Delete(id);
  }


}