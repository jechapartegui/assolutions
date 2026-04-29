import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { LoginProjectService } from './login_project.service';
import { CreateLoginProjectDto, DeleteLoginProjectDto } from './login_project.dto';

@Controller('login-project')
@UseGuards(JwtAuthGuard)
export class LoginProjectController {
  constructor(private readonly service: LoginProjectService) {}

  @Get('login/:loginId')
  listByLogin(@Param('loginId') loginId: string) {
    return this.service.listByLogin(Number(loginId));
  }

  @Post()
  create(@Body() dto: CreateLoginProjectDto) {
    return this.service.create(dto);
  }

  @Delete()
  delete(@Body() dto: DeleteLoginProjectDto) {
    return this.service.delete(dto);
  }
}