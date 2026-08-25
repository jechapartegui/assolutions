import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CompteEntity } from '../compte/compte.entity';
import { LoginProjectEntity } from '../login_project/login_project.entity';
import { MessageModule } from '../message/message.module';
import { PersonneEntity } from '../personne/personne.entity';
import { ProjectEntity } from '../project/project.entity';
import { SaisonEntity } from '../saison/saison.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.services';
import { JwtStrategy } from './jwt.strategy';

const MIN_SECRET_LENGTH = 32;

@Module({
  imports: [
    ConfigModule,
    MessageModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET')?.trim();
        if (
          !secret ||
          secret.startsWith('CHANGE_ME') ||
          secret.length < MIN_SECRET_LENGTH
        ) {
          throw new Error(
            `JWT_SECRET must be configured with at least ${MIN_SECRET_LENGTH} characters`,
          );
        }

        return {
          secret,
          signOptions: {
            expiresIn: (config.get<string>('JWT_EXPIRES_IN') ?? '12h') as any,
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
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
