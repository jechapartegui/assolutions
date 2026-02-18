import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistryModule } from '../registry/registry.module';
import { CompteBancaireController } from './compte_bancaire.controller';
import { CompteBancaireEntity } from './compte_bancaire.entity';
import { CompteBancaireService } from './compte_bancaire.service';
import { AccessControlModule } from '../common/access-control.module'; // ✅

@Module({
  imports: [TypeOrmModule.forFeature([CompteBancaireEntity]), RegistryModule, AccessControlModule],
  controllers: [CompteBancaireController],
  providers: [CompteBancaireService],
})
export class CompteBancaireModule {}
