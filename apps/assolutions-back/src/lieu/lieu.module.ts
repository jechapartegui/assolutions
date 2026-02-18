import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistryModule } from '../registry/registry.module';
import { LieuController } from './lieu.controller';
import { LieuEntity } from './lieu.entity';
import { LieuService } from './lieu.service';

import { AccessControlModule } from '../common/access-control.module'; // ✅
@Module({
  imports: [TypeOrmModule.forFeature([LieuEntity]), RegistryModule, AccessControlModule],
  controllers: [LieuController],
  providers: [LieuService],
})
export class LieuModule {}
