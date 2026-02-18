import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistryModule } from '../registry/registry.module';
import { AddinfoController } from './addinfo.controller';
import { AddinfoEntity } from './addinfo.entity';
import { AddinfoService } from './addinfo.service';
import { AccessControlModule } from '../common/access-control.module'; // ✅

@Module({
  imports: [TypeOrmModule.forFeature([AddinfoEntity]), RegistryModule,
    AccessControlModule],
  controllers: [AddinfoController],
  providers: [AddinfoService],
})
export class AddinfoModule {}
