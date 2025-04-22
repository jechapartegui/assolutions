import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { Compte } from '../compte/compte';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost', // ou distant
      port: 3306,
      username: 'root',
      password: '',
      database: 'maseance',
      entities: [Compte],
      synchronize: false, // true uniquement si tu veux que TypeORM crée/modifie les tables tout seul
    }),
    AuthModule
  ],
})
export class AppModule {}
