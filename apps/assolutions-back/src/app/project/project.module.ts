import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([]), // ✅ indispensable
  ],
  providers: [ProjectService],
  controllers: [ProjectController],
  exports: [ProjectService], // 👈 ajoute ça
})
export class ProjectModule {}
