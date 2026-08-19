import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CompteEntity } from '../compte/compte.entity';
import { LoginProjectEntity } from '../login_project/login_project.entity';
import { MailRecordEntity } from '../mail_record/mail_record.entity';
import { MessageService } from '../message/message.service';
import { PersonneEntity } from '../personne/personne.entity';
import { ProjectEntity } from '../project/project.entity';
import { SaisonEntity } from '../saison/saison.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.services';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET')?.trim();
        if (!secret || secret.length < 32) {
          throw new Error('JWT_SECRET is required and must contain at least 32 characters');
        }

        return {
          secret,
          signOptions: {
            expiresIn: (config.get<string>('JWT_EXPIRES_IN') || '12h') as any,
          },
        };
      },
    }),
    TypeOrmModule.forFeature([
      CompteEntity,
      ProjectEntity,
      PersonneEntity,
      LoginProjectEntity,
      SaisonEntity,
      MailRecordEntity,
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, MessageService],
  exports: [AuthService],
})
export class AuthModule {}
