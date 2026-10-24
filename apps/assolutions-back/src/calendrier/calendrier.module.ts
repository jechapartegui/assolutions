import { Module } from '@nestjs/common';
import { AccessControlModule } from '../common/access-control.module';
import { CalendrierController } from './calendrier.controller';
import { CalendrierService } from './calendrier.service';
import { CalendrierSyncService } from './calendrier-sync.service';
import { GoogleCalendrierClient } from './google-calendrier.client';
import { CalendrierWorkerService } from './calendrier-worker.service';

@Module({
  imports: [AccessControlModule],
  controllers: [CalendrierController],
  providers: [CalendrierService, CalendrierSyncService, GoogleCalendrierClient, CalendrierWorkerService],
  exports: [CalendrierService, CalendrierSyncService],
})
export class CalendrierModule {}
