import { BadRequestException, Injectable,  UnauthorizedException } from '@nestjs/common';
import { KeyValuePair, LienGroupe_VM } from '@shared/src';
import { LinkGroup } from '../../entities/lien_groupe.entity';
import { LinkGroupService } from '../../crud/linkgroup.service';
import { GroupService } from '../../crud/group.service';
import { Group } from '../../entities/groupe.entity';

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


  async GetAll(saison_id: number): Promise<KeyValuePair[]> {
    const gr =  await this.groupe_serv.getAll(saison_id);
     if (!gr) {
      return [];
      }
    return gr.map((x) => { 
      return {
        key: x.id,
        value: x.name,
      };
    });
  }

async add(s: KeyValuePair, seasonId :number):Promise<number> {
    if (!s) {
      throw new BadRequestException('INVALID_GROUP');
    }
    const objet_base = toGroup(s, seasonId);
  
    const objet_insere = await this.groupe_serv.create(objet_base);
    return objet_insere.id;
  }
  async update(s: KeyValuePair, seasonId :number) {
       if (!s) {
      throw new BadRequestException('INVALID_GROUP');
    }
    const objet_base = toGroup(s, seasonId);
  
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
     } catch{
      return false;
     }
  }
}

export function toGroup(v:KeyValuePair,seasonId:number):Group{
  const entity = new Group();
  entity.id = Number(v.key);
  entity.name = v.value;
  entity.seasonId=seasonId;
  return entity;
}
