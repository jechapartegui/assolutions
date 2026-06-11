import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompteEntity } from './compte.entity';
import { CompteService } from './compte.service';
import { CompteController } from './compte.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([CompteEntity])
  ],
  providers: [CompteService], // ✅ une seule fois
  controllers: [CompteController],
})
export class CompteModule {}
