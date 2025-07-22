import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentService } from './document.services';
import { DocumentController } from './document.controller';
import { Document } from '../../entities/document.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Document
    ]),
  ],
  providers: [DocumentService],
  controllers: [DocumentController],
  exports: [DocumentService], // 👈 ajoute ça
})
export class DocumentModule {}
