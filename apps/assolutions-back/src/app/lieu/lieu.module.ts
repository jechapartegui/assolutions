import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LieuController } from './lieu.controller';
import { LieuService } from './lieu.services';
import { LocationService } from '../../crud/location.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
    ]),
  ],
  providers: [LieuService, LocationService],
  controllers: [LieuController],
  exports: [LieuService], // 👈 ajoute ça
})
export class LieuModule {}
