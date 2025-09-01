import {  Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { PasswordGuard } from '../guards/password.guard';
import { ProjetService } from './project.service';

// src/auth/auth.controller.ts
@Controller('project')
export class ProjetController {
  constructor(private projserv :ProjetService) {}
  
  @UseGuards(PasswordGuard)
  @Post('check_mdp')
  async checkpsw(@Headers('projectid') projectId: number,@Body() { password }: {password: string }
  ) : Promise<boolean> {
    return this.projserv.checkpsw(projectId, password);
  }

    @UseGuards(PasswordGuard)
  @Post('login')
  async login(@Body() { login,  password }: {login:string,password: string }
  ) : Promise<boolean> {
    return this.projserv.login(login, password);
  }

 
}