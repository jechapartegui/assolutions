import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '../common/access-control.module';
import { CoursEntity } from '../cours/cours.entity';
import { GroupesEntity } from '../groupes/groupes.entity';
import { SaisonEntity } from '../saison/saison.entity';
import { SeanceEntity } from '../seance/seance.entity';
import { LienGroupeController } from './lien_groupe.controller';
import { LienGroupeEntity } from './lien_groupe.entity';
import { LienGroupeService } from './lien_groupe.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LienGroupeEntity,
      GroupesEntity,
      SaisonEntity,
      CoursEntity,
      SeanceEntity,
    ]),
    AccessControlModule,
  ],
  controllers: [LienGroupeController],
  providers: [LienGroupeService],
})
export class LienGroupeModule {}
