import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lieu } from '../bdd/lieu';
import { LieuController } from './lieu.controller';
import { LieuService } from './lieu.services';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
    Lieu
    ]),
  ],
  providers: [LieuService],
  controllers: [LieuController],
  exports: [LieuService], // 👈 ajoute ça
})
export class LieuModule {}
