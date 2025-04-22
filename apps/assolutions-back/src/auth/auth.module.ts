import { Module } from '@nestjs/common';
import { AuthService } from './auth.services';
import { AuthController } from './auth.controller';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Compte } from '../compte/compte';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Compte]), // ✅ indispensable
  ],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
