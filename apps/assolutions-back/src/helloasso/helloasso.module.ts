import { Module } from '@nestjs/common';

import { HelloAssoConfigGuard } from './helloasso-config.guard';
import { HelloAssoService } from './helloasso.service';

@Module({
  providers: [HelloAssoService, HelloAssoConfigGuard],
  exports: [HelloAssoService, HelloAssoConfigGuard],
})
export class HelloAssoModule {}
