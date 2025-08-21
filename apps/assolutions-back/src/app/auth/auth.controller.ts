import { Body, Controller, Delete, Get, Headers, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.services';
import { PasswordGuard } from '../guards/password.guard';
// src/auth/auth.controller.ts
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
    @UseGuards(PasswordGuard)
    @Get('get/:id')
  async Get(@Param() { id }: { id: number }) {
    return this.authService.get(id);
  }
   @UseGuards(PasswordGuard)
    @Get('get_by_login/:login')
  async GetByLogin(@Param() { login }: { login: string }) {
    return this.authService.getLogin(login);
  }

  @UseGuards(PasswordGuard)
  @Get('getall')
  async GetAll(@Headers('projectid') projectId: number) {
    return this.authService.getAll(projectId);
  }


  @Get('prelogin/:login')
  async preLogin(@Param('login') login: string) : Promise<boolean> {
    return this.authService.prelogin(login);
  }

  @Post('login')
  async login(
    @Body() { email, password }: { email: string; password: string }
  ) : Promise<Compte_VM> {
    return this.authService.validatepassword(email, password);
  }

    @Post('check_token')
  async check_token(
    @Body() { login, token }: { login: string; token: string }
  ) : Promise<boolean> {
    return this.authService.checkToken(login, token);
  }

  @Get('get_project/:id')
  async get_project(@Param('id') id: number) {    
    return this.authService.getProjects(id);
  }

    @Put('add')
  async Add(@Body() compte_vm: Compte_VM) {
      return this.authService.add(compte_vm);
    }
    
    @Put('update')
    async Update(@Body() compte_vm: Compte_VM, update_psw:boolean) {
      return this.authService.update(compte_vm, update_psw);
    }
    
    
        @UseGuards(PasswordGuard)
    @Delete('delete/:id')
    async Delete(@Param('id') id: number) {
      return this.authService.delete(id);
    }
  
}