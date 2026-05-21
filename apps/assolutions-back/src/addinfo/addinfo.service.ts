import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistryService } from '../registry/registry.service';
import { CreateAddinfoFieldDto, CreateAddInfoValueDto, SetAddinfoValueDto,  UpdateAddinfoFieldDto, UpdateAddInfoValueDto } from './addinfo.dto';
import { AddinfoEntity } from './addinfo.entity';

@Injectable()
export class AddinfoService {
  constructor(
    @InjectRepository(AddinfoEntity)
    private readonly repo: Repository<AddinfoEntity>,
    private readonly registry: RegistryService,
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

    // sécurité stricte : si project_id est null -> interdit (évite fuites “globales”)
    if (item.project_id !== projectId) throw new ForbiddenException('WRONG_PROJECT');

    return item;
  }

  async create(dto: CreateAddinfoFieldDto, projectId: number) {
    // on force le project_id depuis le header (même si dto le contient)
    const entity = this.repo.create({ ...dto as CreateAddinfoFieldDto, project_id: projectId } );
    const saved = await this.repo.save(entity);

    await this.registry.ensure('addinfo', saved.id);
    return saved;
  }

  async update(id: number, dto: UpdateAddinfoFieldDto, projectId: number) {
    const item = await this.getForProject(id, projectId);
    Object.assign(item, dto, { project_id: projectId }); // on refixe
    const saved = await this.repo.save(item);

    await this.registry.ensure('addinfo', id);
    return saved;
  }

  async remove(id: number, projectId: number) {
    const item = await this.getForProject(id, projectId);
    await this.repo.remove(item);

    await this.registry.remove('addinfo', id);
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
async listValues(objectType: string, objectId: number, projectId: number) {
  return this.repo.find({
    where: {
      object_type: objectType,
      object_id: objectId,
      project_id: projectId,
    },
    order: { id: 'ASC' },
  });
}
async getForm(objectType: string, objectId: number, projectId: number) {
  const [fields, values] = await Promise.all([
    this.listFields(objectType, projectId),
    this.listValues(objectType, objectId, projectId),
  ]);

  return fields.map(field => {
    const value = values.find(v => v.value_type === String(field.id));

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
async setValue(dto: SetAddinfoValueDto, projectId: number) {
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

  const saved = await this.repo.save(entity);
  await this.registry.ensure('addinfo', saved.id);

  return saved;
}
async getLov(code: string, lang: string, projectId: number) {
  const objectType = `LV_${code}_${lang}`;

  const projectLov = await this.repo.findOne({
    where: {
      object_id: 0,
      object_type: objectType,
      project_id: projectId,
    },
  });

  if (projectLov) return projectLov;

  return this.repo.findOne({
    where: [
      { object_id: 0, object_type: objectType, project_id: 0 },
      { object_id: 0, object_type: objectType, project_id: undefined },
    ],
  });
}

async createValue(dto: CreateAddInfoValueDto, projectId: number): Promise<AddinfoEntity> {
  const existing = await this.repo.findOne({
    where: {
      object_type: dto.object_type,
      object_id: dto.object_id,
      value_type: String(dto.field_id),
      project_id: projectId,
    },
  });

  if (existing) {
    existing.text = dto.text ?? '';
    const saved = await this.repo.save(existing);
    await this.registry.ensure('addinfo', saved.id);
    return saved;
  }

  const entity = this.repo.create({
    object_type: dto.object_type,
    object_id: dto.object_id,
    value_type: String(dto.field_id),
    text: dto.text ?? '',
    project_id: projectId,
  });

  const saved = await this.repo.save(entity);
  await this.registry.ensure('addinfo', saved.id);

  return saved;
}
async updateValue(id: number, dto: UpdateAddInfoValueDto): Promise<AddinfoEntity> {
  const entity = await this.repo.findOne({ where: { id } });

  if (!entity) {
    throw new NotFoundException(`AddInfo value ${id} introuvable`);
  }

  if (dto.text !== undefined) {
    entity.text = dto.text;
  }

  const saved = await this.repo.save(entity);
  await this.registry.ensure('addinfo', saved.id);

  return saved;
}
async deleteValue(id: number): Promise<void> {
  const entity = await this.repo.findOne({ where: { id } });

  if (!entity) return;

  await this.repo.remove(entity);
  await this.registry.remove('addinfo', id);
}
}
