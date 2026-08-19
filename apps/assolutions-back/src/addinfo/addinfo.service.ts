import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccessControlService } from '../common/access-control.service';
import {
  CreateAddinfoFieldDto,
  CreateAddInfoValueDto,
  SetAddinfoValueDto,
  UpdateAddinfoFieldDto,
  UpdateAddInfoValueDto,
} from './addinfo.dto';
import { AddinfoEntity } from './addinfo.entity';

@Injectable()
export class AddinfoService {
  constructor(
    @InjectRepository(AddinfoEntity)
    private readonly repo: Repository<AddinfoEntity>,
    private readonly access: AccessControlService,
  ) {}

  listForProject(projectId: number) {
    return this.repo.find({
      where: { project_id: projectId },
      order: { id: 'ASC' },
    });
  }

  async getForProject(id: number, projectId: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`addinfo ${id} introuvable`);
    if (Number(item.project_id) !== Number(projectId)) {
      throw new ForbiddenException('WRONG_PROJECT');
    }
    return item;
  }

  async create(dto: CreateAddinfoFieldDto, projectId: number) {
    return this.repo.save(this.repo.create({
      ...dto,
      object_id: 0,
      project_id: projectId,
    }));
  }

  async update(id: number, dto: UpdateAddinfoFieldDto, projectId: number) {
    const item = await this.getForProject(id, projectId);
    if (item.object_id !== 0) {
      throw new ForbiddenException('ADDINFO_FIELD_EXPECTED');
    }
    Object.assign(item, dto, { project_id: projectId, object_id: 0 });
    return this.repo.save(item);
  }

  async remove(id: number, projectId: number) {
    const item = await this.getForProject(id, projectId);
    if (item.object_id !== 0) {
      throw new ForbiddenException('ADDINFO_FIELD_EXPECTED');
    }
    await this.repo.remove(item);
    return { ok: true };
  }

  listFields(objectType: string, projectId: number) {
    return this.repo.find({
      where: {
        object_id: 0,
        object_type: objectType,
        project_id: projectId,
      },
      order: { id: 'ASC' },
    });
  }

  async listValues(
    objectType: string,
    objectId: number,
    projectId: number,
    requesterId: number,
  ) {
    await this.assertObjectAccess(objectType, objectId, projectId, requesterId);
    return this.repo.find({
      where: {
        object_type: objectType,
        object_id: objectId,
        project_id: projectId,
      },
      order: { id: 'ASC' },
    });
  }

  async getForm(
    objectType: string,
    objectId: number,
    projectId: number,
    requesterId: number,
  ) {
    const [fields, values] = await Promise.all([
      this.listFields(objectType, projectId),
      this.listValues(objectType, objectId, projectId, requesterId),
    ]);

    return fields.map((field) => {
      const value = values.find((candidate) => candidate.value_type === String(field.id));
      return {
        field,
        value: value ?? null,
        field_id: field.id,
        object_type: field.object_type,
        object_id: objectId,
        value_id: value?.id ?? 0,
        value_type: field.value_type,
        label: field.text,
        text: value?.text ?? '',
      };
    });
  }

  async setValue(
    dto: SetAddinfoValueDto | CreateAddInfoValueDto,
    projectId: number,
    requesterId: number,
  ) {
    await this.assertObjectAccess(dto.object_type, dto.object_id, projectId, requesterId);
    await this.assertFieldInProject(dto.field_id, dto.object_type, projectId);

    const existing = await this.repo.findOne({
      where: {
        object_type: dto.object_type,
        object_id: dto.object_id,
        value_type: String(dto.field_id),
        project_id: projectId,
      },
    });

    const entity = existing ?? this.repo.create({
      object_type: dto.object_type,
      object_id: dto.object_id,
      value_type: String(dto.field_id),
      project_id: projectId,
    });
    entity.text = dto.text ?? '';
    return this.repo.save(entity);
  }

  async getLov(code: string, lang: string, projectId: number) {
    const objectType = `LV_${code}_${lang}`;
    const projectLov = await this.repo.findOne({
      where: { object_id: 0, object_type: objectType, project_id: projectId },
    });
    if (projectLov) return projectLov;

    return this.repo.findOne({
      where: [
        { object_id: 0, object_type: objectType, project_id: 0 },
        { object_id: 0, object_type: objectType, project_id: undefined },
      ],
    });
  }

  async updateValue(
    id: number,
    dto: UpdateAddInfoValueDto,
    projectId: number,
    requesterId: number,
  ): Promise<AddinfoEntity> {
    const entity = await this.getForProject(id, projectId);
    if (entity.object_id === 0) throw new ForbiddenException('ADDINFO_VALUE_EXPECTED');
    await this.assertObjectAccess(
      entity.object_type,
      entity.object_id,
      projectId,
      requesterId,
    );
    if (dto.text !== undefined) entity.text = dto.text;
    return this.repo.save(entity);
  }

  async deleteValue(
    id: number,
    projectId: number,
    requesterId: number,
  ): Promise<{ ok: true }> {
    const entity = await this.getForProject(id, projectId);
    if (entity.object_id === 0) throw new ForbiddenException('ADDINFO_VALUE_EXPECTED');
    await this.assertObjectAccess(
      entity.object_type,
      entity.object_id,
      projectId,
      requesterId,
    );
    await this.repo.remove(entity);
    return { ok: true };
  }

  private async assertFieldInProject(
    fieldId: number,
    objectType: string,
    projectId: number,
  ): Promise<void> {
    const field = await this.repo.findOne({
      where: {
        id: Number(fieldId),
        object_id: 0,
        object_type: objectType,
        project_id: projectId,
      },
    });
    if (!field) throw new ForbiddenException('ADDINFO_FIELD_NOT_IN_PROJECT');
  }

  private async assertObjectAccess(
    objectType: string,
    objectId: number,
    projectId: number,
    requesterId: number,
  ): Promise<void> {
    const normalized = String(objectType ?? '').trim().toLowerCase();
    if (['personne', 'person', 'member', 'rider'].includes(normalized)) {
      await this.access.getPersonSelfOrStaff(requesterId, Number(objectId), projectId);
      return;
    }

    // Les informations complémentaires d'autres objets restent de la configuration admin.
    await this.access.assertProjectAdmin(requesterId, projectId);
  }
}
