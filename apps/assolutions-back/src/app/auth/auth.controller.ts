import { BadRequestException, Body, Controller, Delete, Get, Headers, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.services';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Compte_VM, ProjetView } from '@shared/lib/compte.interface';
import { Project } from '../../entities/projet.entity';
// src/auth/auth.controller.ts
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
    @UseGuards(JwtAuthGuard)
    @Get('get/:id')
  async Get(@Param() { id }: { id: number }) {
    return this.authService.get(id);
  }
   @UseGuards(JwtAuthGuard)
    @Get('get_by_login/:login')
  async GetByLogin(@Param() { login }: { login: string }) {
    return this.authService.getLogin(login);
  }

  @UseGuards(JwtAuthGuard)
  @Get('getall')
  async GetAll(@Headers('projectid') projectId: number) {
    return this.authService.getAll(projectId);
  }

@Post('login')
async login(
  @Body() body:  { email: string; password?: string }
): Promise<{ token: string; compte: Compte_VM }> {
  return this.authService.login(body.email, body.password);
}

@UseGuards(JwtAuthGuard)
@Get('me')
async me(@Req() req): Promise<{ compte: Compte_VM, projects: ProjetView[] }> {
  const userId = req.user.id;
  const compte = await this.authService.get(userId);
  if(compte){
    const projects = await this.authService.getProjects(compte.id);
    return { compte, projects };
  } else {
    throw new BadRequestException('USER_NOT_FOUND');
  }
}


@Post('check_token')
  async check_token(
    @Body() { login, token }: { login: string; token: string }
  ) : Promise<boolean> {
    return this.authService.checkToken(login, token);
  }

@Post('reinit_mdp')
async reinit_mdp(@Body('login') login: string): Promise<boolean> {
  if (!login) throw new BadRequestException('LOGIN_REQUIRED');
  return this.authService.ReinitMDP(login.toLowerCase());
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
    
    
        @UseGuards(JwtAuthGuard)
    @Post('delete')
    async Delete(@Body() body: { id: number})  {
      return this.authService.delete(body.id);
    }

    @UseGuards(JwtAuthGuard)
    @Post('change_my_password')
    async ChangeMyPassword(@Headers('Userid') user_id: number,@Body() { newPassword }: { newPassword: string }) {
      return this.authService.ChangeMyPassword(user_id, newPassword);
    }

    @Post('reset_password_with_token')
    async resetPasswordWithToken(@Body() { login, token, newPassword }: { login: string; token: string; newPassword: string }) {
      return this.authService.resetPasswordWithToken(login, token, newPassword);
    }

  
}