import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemberController } from './member.controller';
import { MemberService } from './member.services';
import { ProjectService } from '../project/project.service';
import { SeanceService } from '../seance/seance.services';
import { ProfService } from '../prof/prof.services';
import { GroupeService } from '../groupe/groupe.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([

    ]),
  ],
  providers: [MemberService, ProjectService, SeanceService, GroupeService, ProfService],
  controllers: [MemberController],
  exports: [MemberService], // 👈 ajoute ça
})
export class MemberModule {}
