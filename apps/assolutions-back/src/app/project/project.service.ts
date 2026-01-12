import {
  BadRequestException,
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
import { ProjetView } from '@shared/lib/compte.interface';
  
  
  @Injectable()
  export class ProjetService {
  private readonly pepper: string;
  
    constructor(private projectSer:ProjectService,  private readonly configService: ConfigService,
       ) {
    this.pepper = this.configService.get<string>('PEPPER') ?? '';
    }
      async get(id: number) : Promise<Projet_VM> {
         const pv = await this.projectSer.get(id);
               if (!pv) {
                 throw new UnauthorizedException('PROJECT_NOT_FOUND');
               }
               //transformer plieu en lieu ou id =id nom= nom mais ou on deserialise adresse .
               return to_Project_VM(pv);
      }

      async checkpsw(id:number, password:string) : Promise<boolean> {
        const pr =  await this.projectSer.get(id);
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

      async login(compte:number) : Promise<ProjetView[]> {
        const pr = await this.projectSer.getByLogin(compte);
        if(!pr){
          throw new UnauthorizedException('INCORRECT_LOGIN');
        }
        return [toProjectView(pr)];
      }
      async Add(s: Projet_VM) {
        if (!s) {
          throw new BadRequestException('INVALID_ITEM');
        }
      
        const objet_base = toProject(s);
         const objet_insere = await this.projectSer.create(objet_base);
          return objet_insere.id;
      }
      
      async Update(s: Projet_VM) {
        
        if (!s) {
          throw new BadRequestException('INVALID_ITEM');
        }
      
        const objet_base = toProject(s);
        return this.projectSer.update(objet_base.id, objet_base);
      }
      
      async RendreInactif(id:number) { 
        const pr =  await this.projectSer.get(id);
        if (!pr) {
          throw new BadRequestException('INVALID_ITEM');
        }
        pr.isActive = false;

        return this.projectSer.update(pr.id, pr);
      }
    
    }

    export function toProjectView(entity: Project): ProjetView {
      const vm:ProjetView ={
        id: entity.id,
        nom: entity.name,
        rights: {
          adherent:true,
          prof:true,
          essai:false
        },
        saison_active: entity.seasons && entity.seasons.length >0 && entity.seasons.find(x => x.isActive) ? toSaison_VM(entity.seasons.find(x => x.isActive)) : null
      };
      return vm;
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

    // Hypothèses :
// - Project et Projet_VM sont des classes (sinon remplace "new Project()" par un littéral).
// - Vous avez un convertisseur de saison VM -> entity : toSeason(...) ou toSaison_Entity(...).
//   Adaptez le nom si besoin.

export function toProject(vm: Projet_VM): Project {
  const entity = new Project();

  entity.id = vm.id ?? undefined as any; // laissez undefined si création
  entity.isActive = !!vm.actif;
  entity.activity = (vm.activite ?? '').trim() || null;

  // Adresse/contacts : on renvoie null/[] si absent pour rester cohérent
  entity.address = vm.adresse ?? null;
  entity.contacts = vm.contacts ?? [];

  entity.color = vm.couleur ?? '#FFFFFF';
  entity.login = vm.login ?? null;

  entity.startDate = vm.date_debut ?? null;
  entity.endDate   = vm.date_fin ?? null;

  entity.language = vm.langue ?? 'FR';
  entity.logo = vm.logo ?? null;
  entity.name = (vm.nom ?? '').trim();
  entity.activationToken = vm.token ?? null;

  // Saison active -> seasons (unique et marquée active)

  return entity;
}


