import {
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Compte } from '../compte/compte';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class AuthService {
  private readonly pepper: string;

  constructor(
    @InjectRepository(Compte)
    private readonly compteRepo: Repository<Compte>,
    private readonly configService: ConfigService
  ) {
    this.pepper = this.configService.get<string>('PEPPER') ?? '';
  }

  async prelogin(login: string): Promise<boolean> {
  
    const compte = await this.compteRepo.findOne({ where: { login } });
  
    if (!compte) {
      console.warn('[prelogin] compte introuvable pour', login); // 👈
      throw new UnauthorizedException ('NO_USER_FOUND');
    }
    if(compte.password === null || compte.password === '') {
      return false;
    } else {
      return true;
    }
  
  }

  async validatepassword(login: string, password:string = ""): Promise<Compte> {
  
    const compte = await this.compteRepo.findOne({ where: { login } });
  
    if (!compte) {
      console.warn('[prelogin] compte introuvable pour', login); // 👈
      throw new UnauthorizedException ('NO_USER_FOUND');
    }
    if(compte.password === null || compte.password === '') {     
      return compte;
    } else{
      console.warn(this.hashPasswordWithPepper(password));
      let psw = this.hashPasswordWithPepper(password);
      if (compte.password !== psw) {
        throw new UnauthorizedException('INCORRECT_PASSWORD');
      } else {
        console.warn('[prelogin] mot de passe correct pour', login); // 👈
        compte.password = "";
        return compte;
      }
    }
  
  }


  private hashPasswordWithPepper(password: string): string {
    return crypto
      .createHmac('sha256', this.pepper)
      .update(password)
      .digest('hex');
  }

  
}
