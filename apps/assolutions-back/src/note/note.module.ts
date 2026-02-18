import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistryModule } from '../registry/registry.module';
import { NoteController } from './note.controller';
import { NoteEntity } from './note.entity';
import { NoteService } from './note.service';

@Module({
  imports: [TypeOrmModule.forFeature([NoteEntity]), RegistryModule],
  controllers: [NoteController],
  providers: [NoteService],
})
export class NoteModule {}
