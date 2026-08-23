import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccessControlModule } from '../common/access-control.module';
import { CompteEntity } from '../compte/compte.entity';
import { LienGroupeEntity } from '../lien_groupe/lien_groupe.entity';
import { PersonneEntity } from '../personne/personne.entity';
import { SaisonEntity } from '../saison/saison.entity';
import { SeanceEntity } from '../seance/seance.entity';
import { InscriptionSeanceController } from './inscription_seance.controller';
import { InscriptionSeanceEntity } from './inscription_seance.entity';
import { InscriptionSeanceService } from './inscription_seance.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InscriptionSeanceEntity,
      SeanceEntity,
      SaisonEntity,
      PersonneEntity,
      LienGroupeEntity,
      CompteEntity,
    ]),
    AccessControlModule,
  ],
  controllers: [InscriptionSeanceController],
  providers: [InscriptionSeanceService],
})
export class InscriptionSeanceModule {}
