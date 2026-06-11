import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PersonneController } from './personne.controller';
import { PersonneEntity } from './personne.entity';
import { PersonneService } from './personne.service';

import { AccessControlModule } from '../common/access-control.module'; // ✅
@Module({
  imports: [TypeOrmModule.forFeature([PersonneEntity]), AccessControlModule],
  controllers: [PersonneController],
  providers: [PersonneService],
})
export class PersonneModule {}
