import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Compte } from '../app/bdd/compte';
import { Adherent } from '../app/bdd/riders';
import { AdherentProjet } from '../app/bdd/member_project';
import { Projet } from '../app/bdd/project';
import { MemberController } from './member.controller';
import { MemberService } from './member.services';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Compte, Adherent, AdherentProjet, Projet]), // ✅ indispensable
  ],
  providers: [MemberService],
  controllers: [MemberController],
})
export class MemberModule {}
