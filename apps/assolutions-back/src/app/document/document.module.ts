import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Adherent } from '../bdd/riders';
import { Document } from '../bdd/document';
import { DocumentService } from './document.services';
import { DocumentController } from './document.controller';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
Document, Adherent
    ]),
  ],
  providers: [DocumentService],
  controllers: [DocumentController],
  exports: [DocumentService], // 👈 ajoute ça
})
export class DocumentModule {}
