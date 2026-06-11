import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { CreatePersonneDto, UpdatePersonneDto } from './personne.dto';
import { PersonneEntity } from './personne.entity';

@Injectable()
export class PersonneService {
  constructor(
    @InjectRepository(PersonneEntity)
    private readonly repo: Repository<PersonneEntity>,
    
  ) {}

  listForCompte(compteId: number) {
    return this.repo.find({
      where: { compte: compteId },
      order: { id: 'ASC' },
    });
  }
  async listLight(ids: number[], withPhotos: boolean) {
  const items = await this.repo.find({
    where: {
      id: In(ids),
    },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      nickname: true,
      date_naissance: true,
      gender: true,
      
    },
     order: { id: 'ASC'
    }
  });
    return items.map(p => ({
      id: p.id,
      nom: p.last_name,
      prenom: p.first_name,
      surnom: p.nickname ?? '',
      date_naissance: p.date_naissance, // string YYYY-MM-DD (ton entity le stocke en string)
      sexe: !!p.gender,
      ...(withPhotos ? { photo: '' } : {}),
    }));
  }



  async get(id: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`personne ${id} introuvable`);
    return item;
  }

  async create(dto: CreatePersonneDto) {
    const entity = this.repo.create(dto as CreatePersonneDto);
    const saved = await this.repo.save(entity);

    return saved;
  }

  async update(id: number, dto: UpdatePersonneDto) {
    const item = await this.get(id);
    Object.assign(item, dto, { date_maj: new Date() });
    const saved = await this.repo.save(item);

    return saved;
  }

  async remove(id: number) {
    const item = await this.get(id);
    await this.repo.remove(item);

    return { ok: true };
  }

 async listByIds(ids: number[]) {
  const personnes = await this.repo.find({
    where: {
      id: In(ids),
    },
    relations: {
      compte_rel: true,
    },
    order: { id: 'ASC' },
  });

  return personnes.map(p => ({
    ...p,
    login: p.compte_rel?.login ?? null
  }));
}
}
