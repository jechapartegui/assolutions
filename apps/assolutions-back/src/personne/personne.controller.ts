import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreatePersonneDto, UpdatePersonneDto } from './personne.dto';
import { PersonneService } from './personne.service';

@Controller('personnes')
export class PersonneController {
  constructor(private readonly service: PersonneService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  listMine(@Req() req: any) {
    return this.service.listForCompte(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.get(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: any, @Body() dto: CreatePersonneDto) {
    // sécurité : forcer compte = user
    return this.service.create({ ...dto, compte: req.user.id });
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePersonneDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
