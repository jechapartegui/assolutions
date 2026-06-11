import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CompteBancaireController } from './compte_bancaire.controller';
import { CompteBancaireEntity } from './compte_bancaire.entity';
import { CompteBancaireService } from './compte_bancaire.service';
import { AccessControlModule } from '../common/access-control.module'; // ✅

@Module({
  imports: [TypeOrmModule.forFeature([CompteBancaireEntity]), AccessControlModule],
  controllers: [CompteBancaireController],
  providers: [CompteBancaireService],
})
export class CompteBancaireModule {}
