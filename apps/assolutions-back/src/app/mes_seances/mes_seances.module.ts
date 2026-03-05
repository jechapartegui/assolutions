import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MesSeancesQueryService } from './mes_seances.query.service';
import { MesSeancesController } from './mes_seances.controller';

@Module({
  imports: [TypeOrmModule.forFeature([])], // pas obligatoire si tu n'injectes aucun repo
  providers: [MesSeancesQueryService],
  controllers: [MesSeancesController],
  exports: [MesSeancesQueryService],
})
export class MesSeancesModule {}
