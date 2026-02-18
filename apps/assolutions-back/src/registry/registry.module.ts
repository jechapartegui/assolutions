import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistryEntity } from './registry.entity';
import { RegistryService } from './registry.service';

@Module({
  imports: [TypeOrmModule.forFeature([RegistryEntity])],
  providers: [RegistryService],
  exports: [RegistryService], // important: utilisé par les autres modules
})
export class RegistryModule {}
