import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { AccessControlService } from '../common/access-control.service';
import { CreatePersonneDto, UpdatePersonneDto } from './personne.dto';
import { PersonneEntity } from './personne.entity';

@Injectable()
export class PersonneService {
  constructor(
    @InjectRepository(PersonneEntity)
    private readonly repo: Repository<PersonneEntity>,
    private readonly access: AccessControlService,
  ) {}

  listForCompte(compteId: number) {
    return this.repo.find({
      where: { compte: compteId },
      order: { id: 'ASC' },
    });
  }

  async listForCompteAuthorized(
    requesterId: number,
    compteId: number,
    projectId?: number | null,
  ) {
    await this.access.assertAccountAccess(requesterId, compteId, projectId);
    return this.listForCompte(compteId);
  }

  async listLight(
    ids: number[],
    withPhotos: boolean,
    requesterId: number,
    projectId?: number | null,
  ) {
    const authorized = await this.access.assertPersonIdsAccess(requesterId, ids, projectId);
    const authorizedIds = authorized.map((person) => person.id);
    if (!authorizedIds.length) return [];

    const items = await this.repo.find({
      where: { id: In(authorizedIds) },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        nickname: true,
        date_naissance: true,
        gender: true,
      },
      order: { id: 'ASC' },
    });

    return items.map((p) => ({
      id: p.id,
      nom: p.last_name,
      prenom: p.first_name,
      surnom: p.nickname ?? '',
      date_naissance: p.date_naissance,
      sexe: !!p.gender,
      ...(withPhotos ? { photo: '' } : {}),
    }));
  }

  async getAuthorized(id: number, requesterId: number, projectId?: number | null) {
    return this.access.getAuthorizedPerson(requesterId, id, projectId);
  }

  async create(dto: CreatePersonneDto, requesterId: number, projectId?: number | null) {
    const targetCompteId = Number(dto.compte || requesterId);
    await this.access.assertAccountAccess(requesterId, targetCompteId, projectId);

    return this.repo.save(this.repo.create({
      ...dto,
      compte: targetCompteId,
    }));
  }

  async update(
    id: number,
    dto: UpdatePersonneDto,
    requesterId: number,
    projectId?: number | null,
  ) {
    const item = await this.access.getAuthorizedPerson(requesterId, id, projectId);

    if (dto.compte !== undefined && Number(dto.compte) !== Number(item.compte)) {
      await this.access.assertAccountAccess(requesterId, Number(dto.compte), projectId);
    }

    Object.assign(item, dto, { date_maj: new Date() });
    return this.repo.save(item);
  }

  async remove(id: number, requesterId: number, projectId?: number | null) {
    const item = await this.access.getAuthorizedPerson(requesterId, id, projectId);
    await this.repo.remove(item);
    return { ok: true };
  }

  async listByIds(ids: number[], requesterId: number, projectId?: number | null) {
    const authorized = await this.access.assertPersonIdsAccess(requesterId, ids, projectId);
    const authorizedIds = authorized.map((person) => person.id);
    if (!authorizedIds.length) return [];

    const personnes = await this.repo.find({
      where: { id: In(authorizedIds) },
      relations: { compte_rel: true },
      order: { id: 'ASC' },
    });

    return personnes.map((person) => {
      const { compte_rel, ...safePerson } = person;
      return {
        ...safePerson,
        login: compte_rel?.login ?? null,
      };
    });
  }
}
