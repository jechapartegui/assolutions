import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccessControlModule } from '../common/access-control.module';
import { FfrsExportMedicalService } from './ffrs-export-medical.service';
import { FfrsExportService } from './ffrs-export.service';
import { PersonneController } from './personne.controller';
import { PersonneEntity } from './personne.entity';
import { PersonneService } from './personne.service';
import { RepresentantLegalEntity } from './representant-legal.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PersonneEntity, RepresentantLegalEntity]), AccessControlModule],
  controllers: [PersonneController],
  providers: [
    PersonneService,
    {
      provide: FfrsExportService,
      useClass: FfrsExportMedicalService,
    },
  ],
})
export class PersonneModule {}
