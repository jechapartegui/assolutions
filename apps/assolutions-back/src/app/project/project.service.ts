import {
    Injectable,
    UnauthorizedException
  } from '@nestjs/common';
import { Project } from '../../entities/projet.entity';
import { ProjectService } from '../../crud/project.service';
import { hashPasswordWithPepper } from '../auth/auth.services';
import { ConfigService } from '@nestjs/config';
  
  
  @Injectable()
  export class ProjetService {
  private readonly pepper: string;
  
    constructor(private projectSer:ProjectService,  private readonly configService: ConfigService,
       ) {
    this.pepper = this.configService.get<string>('PEPPER') ?? '';
    }
      async get(id: number) : Promise<Project> {
        return await this.projectSer.get(id);
      }

      async checkpsw(id:number, password:string) : Promise<boolean> {
        const pr =  this.get(id);
        if(!pr){
          throw new UnauthorizedException('PROJECT_NOT_FOUND');
        }
        const storedPassword = (await pr).password;
         const hashed = hashPasswordWithPepper(password, this.pepper);
            if (storedPassword !== hashed) {
              throw new UnauthorizedException('INCORRECT_PASSWORD');
            }
        return true;
      }

      async login(username:string, password:string) : Promise<boolean> {
        const pr =  this.projectSer.getByLogin(username);
        if(!pr){
          throw new UnauthorizedException('INCORRECT_LOGIN');
        }
        const storedPassword = (await pr).password;
         const hashed = hashPasswordWithPepper(password, this.pepper);
            if (storedPassword !== hashed) {
              throw new UnauthorizedException('INCORRECT_PASSWORD');
            }
        return true;
      }
  
  
    
    }