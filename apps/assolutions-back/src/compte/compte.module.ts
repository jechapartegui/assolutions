import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CompteEntity } from './compte.entity';
import { CompteService } from './compte.service';
import { CompteController } from './compte.controller';
import { LoginProjectEntity } from '../login_project/login_project.entity';
import { MessageModule } from '../message/message.module';

@Module({
  imports: [
    ConfigModule,
    MessageModule,
    TypeOrmModule.forFeature([CompteEntity, LoginProjectEntity]),
  ],
  providers: [CompteService],
  controllers: [CompteController],
  exports: [CompteService],
})
export class CompteModule {}