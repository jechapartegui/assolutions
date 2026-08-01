import { Module } from '@nestjs/common';

import { HelloAssoConfigGuard } from './helloasso-config.guard';
import { HelloAssoController } from './helloasso.controller';
import { HelloAssoService } from './helloasso.service';

@Module({
  controllers: [HelloAssoController],
  providers: [HelloAssoService, HelloAssoConfigGuard],
  exports: [HelloAssoService],
})
export class HelloAssoModule {}
