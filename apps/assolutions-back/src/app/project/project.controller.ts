import {  Body, Controller, Get, Headers, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Projet_VM} from "@shared/lib/projet.interface";
import { ProjetService } from './project.service';

// src/auth/auth.controller.ts
@Controller('project')
export class ProjetController {
  constructor(private projserv :ProjetService) {}
  
  @UseGuards(JwtAuthGuard)
  @Post('check_mdp')
  async checkpsw(@Headers('projectid') projectId: number,@Body() { password }: {password: string }
  ) : Promise<boolean> {
    return this.projserv.checkpsw(projectId, password);
  }

    @UseGuards(JwtAuthGuard)
  @Post('login')
  async login(
    @Body() { email, password }: { email: string; password: string }
  ) : Promise<Projet_VM> {
    return this.projserv.login(email, password);
  }

    @UseGuards(JwtAuthGuard)
       @Get('get/:id')
       async Get(@Param() { id }: { id: number }) {
         return this.projserv.get(id);
       }

    @Put('add')
    async Add(@Body() s: any) {
      return this.projserv.Add(s);
    }
    
    @Put('update')
    async Update(@Body() s: any) {
      return this.projserv.Update(s);
    }
    
    
        @UseGuards(JwtAuthGuard)
    @Post('delete')
    async Delete(@Body() body: { id: number}) {
      return this.projserv.RendreInactif(body.id);
    }
  
 
}