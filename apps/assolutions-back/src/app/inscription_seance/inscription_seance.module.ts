import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InscriptionSeanceService } from './inscription_seance.services';
import { InscriptionSeanceController } from './inscription_seance.controller';
import { RegistrationSessionService } from '../../crud/inscriptionseance.service';
import { RegistrationSession } from '../../entities/inscription-seance.entity';
import { SessionService } from '../../crud/session.service';
import { LinkGroupService } from '../../crud/linkgroup.service';
import { Session } from '../../entities/seance.entity';
import { LinkGroup } from '../../entities/lien_groupe.entity';
import { Person } from '../../entities/personne.entity';
import { PersonService } from '../../crud/person.service';
import { Contact } from '../../entities/contacts.entity';
import { ContactsService } from '../../crud/contacts.servivce';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([RegistrationSession, Session, LinkGroup, Person, Contact
    ]),
  ],
  providers: [RegistrationSessionService, InscriptionSeanceService, SessionService, LinkGroupService, PersonService, ContactsService],
  controllers: [InscriptionSeanceController],
  exports: [InscriptionSeanceService], // 👈 ajoute ça
})
export class InscriptionSeanceModule {}
