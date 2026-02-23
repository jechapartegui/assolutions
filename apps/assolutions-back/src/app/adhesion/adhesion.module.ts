import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdhesionQueryService } from './adhesion.query.service';
import { AdhesionController } from './adhesion.controller';

@Module({
  imports: [TypeOrmModule.forFeature([])], // pas obligatoire si tu n'injectes aucun repo
  providers: [AdhesionQueryService],
  controllers: [AdhesionController],
  exports: [AdhesionQueryService],
})
export class AdhesionModule {}
