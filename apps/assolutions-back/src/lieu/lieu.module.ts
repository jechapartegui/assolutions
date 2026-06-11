import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LieuController } from './lieu.controller';
import { LieuEntity } from './lieu.entity';
import { LieuService } from './lieu.service';

import { AccessControlModule } from '../common/access-control.module'; // ✅
@Module({
  imports: [TypeOrmModule.forFeature([LieuEntity]), AccessControlModule],
  controllers: [LieuController],
  providers: [LieuService],
})
export class LieuModule {}
