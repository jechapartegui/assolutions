import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
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
  @Post('light')
  listLight(@Body() ids: number[],
    @Query('includePhotos') includePhotos?: string) {
    const withPhotos = includePhotos === 'true';
    return this.service.listLight(ids, withPhotos);
  }
 

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: any, @Body() dto: CreatePersonneDto) {
    return this.service.create({ ...dto, compte: req.user.id });
  }

  // ✅ UPDATE via POST
  @UseGuards(JwtAuthGuard)
  @Post(':id/update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePersonneDto) {
    return this.service.update(id, dto);
  }

  // ✅ DELETE via POST
  @UseGuards(JwtAuthGuard)
  @Post(':id/delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('by-ids')
  list_by_id(@Body() ids: number[]) {
    return this.service.listByIds(ids);
  }
}
