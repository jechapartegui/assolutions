import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistryModule } from '../registry/registry.module';
import { ContactController } from './contact.controller';
import { Contact } from './contact.entity';
import { ContactService } from './contact.service';
import { AccessControlModule } from '../common/access-control.module'; // ✅

@Module({
  imports: [TypeOrmModule.forFeature([Contact]), RegistryModule, AccessControlModule],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
