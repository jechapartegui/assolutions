import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistrationSeasonService } from '../../crud/inscriptionsaison.service';
import { InscriptionSaisonService } from './inscription_saison.services';
import { InscriptionSaisonController } from './inscription_saison.controller';
import { RegistrationSeason } from '../../entities/inscription-saison.entity';
import { LinkGroup } from '../../entities/lien_groupe.entity';
import { LinkGroupService } from '../../crud/linkgroup.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([RegistrationSeason, LinkGroup
    ]),
  ],
  providers: [RegistrationSeasonService, InscriptionSaisonService, LinkGroupService],
  controllers: [InscriptionSaisonController],
  exports: [InscriptionSaisonService], // 👈 ajoute ça
})
export class InscriptionSaisonModule {}
