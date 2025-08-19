import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjetController } from './project.controller';
import { Project } from '../../entities/projet.entity';
import { ProjetService } from './project.service';
import { ProjectService } from '../../crud/project.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Project]), // ✅ indispensable
  ],
  providers: [ProjectService, ProjetService],
  controllers: [ProjetController],
  exports: [ProjetService], // 👈 ajoute ça
})
export class ProjetModule {}
