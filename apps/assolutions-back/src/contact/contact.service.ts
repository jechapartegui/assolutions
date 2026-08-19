import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { AccessControlService } from '../common/access-control.service';
import { CreateContactDto, UpdateContactDto } from './contact.dto';
import { Contact } from './contact.entity';

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(Contact)
    private readonly repo: Repository<Contact>,
    private readonly access: AccessControlService,
  ) {}

  async list(ids: number[], requesterId: number, projectId?: number | null) {
    await this.access.assertPersonIdsAccess(requesterId, ids, projectId);
    const cleanIds = [...new Set((ids ?? [])
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0))];
    if (!cleanIds.length) return [];

    return this.repo.find({
      where: { object_id: In(cleanIds), object_type: 'rider' },
    });
  }

  async get(id: number, requesterId: number, projectId?: number | null) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`Contact ${id} introuvable`);

    await this.assertObjectAccess(
      item.object_type,
      item.object_id,
      requesterId,
      projectId,
    );
    return item;
  }

  async create(
    dto: CreateContactDto,
    requesterId: number,
    projectId?: number | null,
  ) {
    await this.assertObjectAccess(dto.object_type, dto.object_id, requesterId, projectId);
    return this.repo.save(this.repo.create({ ...dto }));
  }

  async update(
    id: number,
    dto: UpdateContactDto,
    requesterId: number,
    projectId?: number | null,
  ) {
    const item = await this.get(id, requesterId, projectId);

    if (dto.object_id !== item.object_id || dto.object_type !== item.object_type) {
      await this.assertObjectAccess(dto.object_type, dto.object_id, requesterId, projectId);
    }

    Object.assign(item, dto);
    return this.repo.save(item);
  }

  async remove(id: number, requesterId: number, projectId?: number | null) {
    const item = await this.get(id, requesterId, projectId);
    await this.repo.remove(item);
    return { ok: true };
  }

  private async assertObjectAccess(
    objectType: string,
    objectId: number,
    requesterId: number,
    projectId?: number | null,
  ): Promise<void> {
    const normalizedType = String(objectType ?? '').trim().toLowerCase();
    const personTypes = new Set(['rider', 'member', 'person', 'personne']);
    if (!personTypes.has(normalizedType)) {
      throw new ForbiddenException('UNSUPPORTED_CONTACT_OBJECT_TYPE');
    }

    await this.access.getAuthorizedPerson(requesterId, Number(objectId), projectId);
  }
}
