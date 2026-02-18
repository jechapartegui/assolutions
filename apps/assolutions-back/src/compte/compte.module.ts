import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompteEntity } from './compte.entity';
import { CompteService } from './compte.service';
import { CompteController } from './compte.controller';
import { RegistryModule } from '../registry/registry.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CompteEntity]),
    RegistryModule
  ],
  providers: [CompteService], // ✅ une seule fois
  controllers: [CompteController],
})
export class CompteModule {}
