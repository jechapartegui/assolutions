import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccessControlModule } from '../common/access-control.module';
import { FfrsExportMedicalService } from './ffrs-export-medical.service';
import { FfrsExportService } from './ffrs-export.service';
import { PersonneController } from './personne.controller';
import { PersonneEntity } from './personne.entity';
import { PersonneService } from './personne.service';

@Module({
  imports: [TypeOrmModule.forFeature([PersonneEntity]), AccessControlModule],
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
