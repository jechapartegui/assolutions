import {
    Injectable,
    UnauthorizedException
  } from '@nestjs/common';
import { Project } from '../../entities/projet.entity';
import { ProjectService } from '../../crud/project.service';
import { hashPasswordWithPepper } from '../auth/auth.services';
import { Projet_VM} from "@shared/lib/projet.interface";
import { ConfigService } from '@nestjs/config';
import { Adresse } from '@shared/lib/adresse.interface';
import { toSaison_VM } from '../saison/saison.services';
import { Season } from '../../entities/saison.entity';
  
  
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

      async login(username:string, password:string) : Promise<Projet_VM> {
        const pr = await this.projectSer.getByLogin(username);
        if(!pr){
          throw new UnauthorizedException('INCORRECT_LOGIN');
        }
        const storedPassword = (await pr).password;
         const hashed = hashPasswordWithPepper(password, this.pepper);
            if (storedPassword !== hashed) {
              throw new UnauthorizedException('INCORRECT_PASSWORD');
            }
        return to_Project_VM(pr);
      }
    
    }

    export function to_Project_VM(entity: Project): Projet_VM {
      const vm = new Projet_VM();
      vm.actif = entity.isActive;
      vm.activite = entity.activity ?? '';
  vm.adresse = entity.address ?? new Adresse();
  vm.contacts = entity.contacts?? [];
  vm.couleur = entity.color?? '#FFFFFF';
  vm.login = entity.login;
  vm.date_debut = entity.startDate;
  vm.date_fin = entity.endDate;
  vm.id =  entity.id;
  vm.langue = entity.language ?? 'FR';
vm.logo = entity.logo ?? null;
vm.nom = entity.name;
vm.token = entity.activationToken ?? null;
if(entity.seasons && entity.seasons.length >0 && entity.seasons.find(x => x.isActive) ){

vm.saison_active = toSaison_VM(entity.seasons.find(x => x.isActive));
}
      return vm;
    }

