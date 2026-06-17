import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.services';
import { JwtStrategy } from './jwt.strategy';

import { CompteEntity } from '../compte/compte.entity';
import { ProjectEntity } from '../project/project.entity';
import { PersonneEntity } from '../personne/personne.entity';
import { LoginProjectEntity } from '../login_project/login_project.entity';
import { SaisonEntity } from '../saison/saison.entity';
import { MessageService } from '../message/message.service';
import { MailRecordEntity } from '../mail_record/mail_record.entity';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'CHANGE_ME',
        signOptions: { expiresIn: '30d' },
      }),
    }),
    TypeOrmModule.forFeature([CompteEntity, ProjectEntity, PersonneEntity, LoginProjectEntity, SaisonEntity, MailRecordEntity]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, MessageService],
  exports: [AuthService],
})
export class AuthModule {}
