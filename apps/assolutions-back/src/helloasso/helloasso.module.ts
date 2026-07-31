import { Module } from '@nestjs/common';
import { HelloAssoController } from './helloasso.controller';
import { HelloAssoService } from './helloasso.service';

@Module({
  controllers: [HelloAssoController],
  providers: [HelloAssoService],
  exports: [HelloAssoService],
})
export class HelloAssoModule {}
