import { BadRequestException, Injectable,  UnauthorizedException } from '@nestjs/common';
import { LinkGroup } from '../../entities/lien_groupe.entity';
import { LinkGroupService } from '../../crud/linkgroup.service';
import { GroupService } from '../../crud/group.service';
import { Group } from '../../entities/groupe.entity';
import { Groupe_VM, LienGroupe_VM } from '@shared/lib/groupe.interface';
import { KeyValuePair } from '@shared/lib/autres.interface';
import { error } from 'console';

@Injectable()
export class GroupeService {
  constructor(
  private liengroupe_serv:LinkGroupService, private groupe_serv:GroupService
  ) // @InjectRepository(Projet)
  // private readonly projetRepo: Repository<Projet>,
  {}
  async getGroupeObjet(
    id: number,
    type: 'cours' | 'séance' | 'rider'
  ): Promise<LienGroupe_VM[]> {
   return (await this.liengroupe_serv.getGroupsForObject(type,id)).map(x => new LienGroupe_VM(x.id, x.group.name, x.groupId));
  }

  async Get(id: number): Promise<KeyValuePair> {
      const gr = await this.groupe_serv.get(id);
        if (!gr) {
          throw new UnauthorizedException('GROUP_NOT_FOUND');
        }
        //transformer plieu en lieu ou id =id nom= nom mais ou on deserialise adresse .
         return {
        key: gr.id,
        value: gr.name,
      };
     
  }


  async GetAll(saison_id: number, prive:boolean): Promise<Groupe_VM[]> {
    const gr =  await this.groupe_serv.getAll(saison_id, prive);
     if (!gr) {
      return [];
      }
    return gr.map((x) => { 
     return toGroupe_VM(x);
    });
  }

async add(s: Groupe_VM):Promise<number> {
    if (!s) {
      throw new BadRequestException('INVALID_GROUP');
    }
    const objet_base = toGroup(s);
  
    const objet_insere = await this.groupe_serv.create(objet_base);
    return objet_insere.id;
  }
  async update(s: Groupe_VM) {
       if (!s) {
      throw new BadRequestException('INVALID_GROUP');
    }
    const objet_base = toGroup(s);
  
     await this.groupe_serv.update(objet_base.id, objet_base);
  
  }
  
  async delete(id: number):Promise<boolean> {
     try{
    await this.groupe_serv.delete(id);
    return true;
     } catch{
      return false;
     }
  }

    async AddLien( id_objet: number, type_objet: string, id_groupe: number ): Promise<number> {
       if (!id_objet || !type_objet || !id_groupe) {
      throw new BadRequestException('INVALID_GROUP');
    }
    const objet_base = new LinkGroup();
    objet_base.objectId = id_objet;
    objet_base.objectType = type_objet;
    objet_base.groupId = id_groupe;
    const objet_insere = await this.liengroupe_serv.create(objet_base);
    return objet_insere.id;
    }
    async DeleteLien(id: number):Promise<boolean> {
     try{
    await this.liengroupe_serv.delete(id);
    return true;
     } catch(error:any) {
      console.log(error);
      return false;
     }
  }
}

export function toGroup(v:Groupe_VM):Group{
  const entity = new Group();
  entity.id = Number(v.id);
  entity.name = v.nom;
  entity.saisonId=v.saison_id;
  entity.whatsapp=v.whatsapp;
  entity.visible = v.prive;
  return entity;
}

export function toGroupe_VM(entity:Group):Groupe_VM{
  const vm = new Groupe_VM();
  vm.id = entity.id;
  vm.nom = entity.name;
  vm.saison_id=entity.saisonId;
  vm.whatsapp=entity.whatsapp;
  vm.prive=entity.visible;
  return vm;
}


