import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaisonController } from './saison.controller';
import { SaisonService } from './saison.services';
import { SeasonService } from '../../crud/season.service';
import { Season } from '../../entities/saison.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
    Season
    ]),
  ],
  providers: [SaisonService, SeasonService],
  controllers: [SaisonController],
  exports: [SaisonService], // 👈 ajoute ça
})
export class SaisonModule {}
