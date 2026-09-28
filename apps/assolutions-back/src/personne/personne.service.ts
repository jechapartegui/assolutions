import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { CreatePersonneDto, UpdatePersonneDto } from './personne.dto';
import { PersonneEntity } from './personne.entity';
import { RepresentantLegalEntity } from './representant-legal.entity';
import { RepresentantLegalDto } from './representant-legal.dto';

@Injectable()
export class PersonneService {
  constructor(
    @InjectRepository(PersonneEntity)
    private readonly repo: Repository<PersonneEntity>,
    @InjectRepository(RepresentantLegalEntity)
    private readonly representantRepo: Repository<RepresentantLegalEntity>,
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

  async create(dto: CreatePersonneDto, compteId: number) {
    if(!dto.compte) {
      dto.compte = compteId;
    }
    const entity = this.repo.create(dto);
    const saved = await this.repo.save(entity);

    return saved;
  }

  async update(id: number, dto: UpdatePersonneDto) {
    const item = await this.get(id);
    Object.assign(item, dto, { date_maj: new Date() });
    const saved = await this.repo.save(item);

    return saved;
  }

  listRepresentants(id: number) {
    return this.representantRepo.find({
      where: { personne_id: id },
      order: { ordre: 'ASC', id: 'ASC' },
    });
  }

  async listRepresentantsForPeople(ids: number[]) {
    const cleanIds = [...new Set((ids ?? []).map(Number).filter((id) => Number.isInteger(id) && id > 0))];
    if (!cleanIds.length) return {};
    const rows = await this.representantRepo.find({
      where: { personne_id: In(cleanIds) },
      order: { personne_id: 'ASC', ordre: 'ASC', id: 'ASC' },
    });
    return rows.reduce((acc: Record<number, RepresentantLegalEntity[]>, row) => {
      (acc[row.personne_id] ??= []).push(row);
      return acc;
    }, {});
  }

  async replaceRepresentants(id: number, items: RepresentantLegalDto[]) {
    await this.get(id);
    if ((items ?? []).length > 2) {
      throw new Error('Deux représentants légaux maximum.');
    }

    const clean = (items ?? []).map((item, index) => ({
      personne_id: id,
      nom: item.nom.trim(),
      prenom: item.prenom.trim(),
      email: item.email.trim(),
      telephone: item.telephone.trim(),
      ordre: index + 1,
    }));

    if (clean.some((item) => !item.nom || !item.prenom || !item.email || !item.telephone)) {
      throw new Error('Nom, prénom, email et téléphone sont obligatoires pour chaque représentant légal.');
    }

    await this.representantRepo.manager.transaction(async (manager) => {
      await manager.delete(RepresentantLegalEntity, { personne_id: id });
      if (clean.length) await manager.save(RepresentantLegalEntity, clean);
    });
    return this.listRepresentants(id);
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
