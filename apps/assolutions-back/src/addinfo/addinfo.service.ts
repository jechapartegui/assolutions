import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

    if (item.project_id !== projectId) {
      throw new ForbiddenException('WRONG_PROJECT');
    }

    return item;
  }

  async create(dto: CreateAddinfoFieldDto, projectId: number) {
    const entity = this.repo.create({
      ...(dto as CreateAddinfoFieldDto),
      project_id: projectId,
    });
    return this.repo.save(entity);
  }

  async update(id: number, dto: UpdateAddinfoFieldDto, projectId: number) {
    const item = await this.getForProject(id, projectId);
    Object.assign(item, dto, { project_id: projectId });
    return this.repo.save(item);
  }

  async remove(id: number, projectId: number) {
    const item = await this.getForProject(id, projectId);
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

  async listSelectableFields(projectId: number) {
    const fields = await this.repo.find({
      where: { object_id: 0, project_id: projectId },
      order: { object_type: 'ASC', id: 'ASC' },
    });

    const selectableFields = fields.filter((field) =>
      this.isSelectType(field.value_type),
    );

    return Promise.all(
      selectableFields.map(async (field) => ({
        field,
        options: this.extractSelectOptions(field.value_type),
        usage: await this.getFieldUsage(field, projectId),
      })),
    );
  }

  async updateSelectableFieldOptions(
    id: number,
    options: string[],
    projectId: number,
  ) {
    const field = await this.getForProject(id, projectId);

    if (field.object_id !== 0 || !this.isSelectType(field.value_type)) {
      throw new BadRequestException(
        `Le champ addinfo ${id} n'est pas une définition de liste`,
      );
    }

    const normalized = this.normalizeOptions(options);
    const valueType = `select:${JSON.stringify(normalized)}`;

    if (valueType.length > 50) {
      throw new BadRequestException(
        'La liste est trop longue pour le modèle addinfo actuel (50 caractères maximum).',
      );
    }

    field.value_type = valueType;
    const saved = await this.repo.save(field);

    return {
      field: saved,
      options: normalized,
      usage: await this.getFieldUsage(saved, projectId),
    };
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

    return fields.map((field) => {
      const value = values.find((v) => v.value_type === String(field.id));

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

    const entity =
      existing ??
      this.repo.create({
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

  async createValue(
    dto: CreateAddInfoValueDto,
    projectId: number,
  ): Promise<AddinfoEntity> {
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
      return this.repo.save(existing);
    }

    const entity = this.repo.create({
      object_type: dto.object_type,
      object_id: dto.object_id,
      value_type: String(dto.field_id),
      text: dto.text ?? '',
      project_id: projectId,
    });

    return this.repo.save(entity);
  }

  async updateValue(
    id: number,
    dto: UpdateAddInfoValueDto,
  ): Promise<AddinfoEntity> {
    const entity = await this.repo.findOne({ where: { id } });

    if (!entity) {
      throw new NotFoundException(`AddInfo value ${id} introuvable`);
    }

    if (dto.text !== undefined) {
      entity.text = dto.text;
    }

    return this.repo.save(entity);
  }

  async deleteValue(id: number): Promise<void> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) return;
    await this.repo.remove(entity);
  }

  private isSelectType(valueType: string): boolean {
    return (
      String(valueType ?? '').startsWith('select:') ||
      String(valueType ?? '').startsWith('select[')
    );
  }

  private extractSelectOptions(valueType: string): string[] {
    const source = String(valueType ?? '');
    let raw = '';

    if (source.startsWith('select:')) {
      raw = source.substring('select:'.length);
    } else if (source.startsWith('select[')) {
      raw = source.substring('select'.length);
    } else {
      return [];
    }

    if (!raw.startsWith('[')) return [];

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.map((value) => String(value).trim()).filter(Boolean)
        : [];
    } catch {
      return [];
    }
  }

  private normalizeOptions(options: string[]): string[] {
    const result: string[] = [];
    const seen = new Set<string>();

    for (const raw of options ?? []) {
      const value = String(raw ?? '').trim();
      if (!value) continue;

      const key = value.toLocaleLowerCase('fr');
      if (seen.has(key)) {
        throw new BadRequestException(`Valeur de liste en doublon : ${value}`);
      }

      seen.add(key);
      result.push(value);
    }

    return result;
  }

  private async getFieldUsage(
    field: AddinfoEntity,
    projectId: number,
  ): Promise<Record<string, number>> {
    const rows = await this.repo
      .createQueryBuilder('addinfo')
      .select('addinfo.text', 'text')
      .addSelect('COUNT(*)', 'count')
      .where('addinfo.project_id = :projectId', { projectId })
      .andWhere('addinfo.object_type = :objectType', {
        objectType: field.object_type,
      })
      .andWhere('addinfo.value_type = :fieldId', {
        fieldId: String(field.id),
      })
      .groupBy('addinfo.text')
      .getRawMany<{ text: string; count: string }>();

    return rows.reduce<Record<string, number>>((usage, row) => {
      const value = String(row.text ?? '');
      if (value) usage[value] = Number(row.count ?? 0);
      return usage;
    }, {});
  }
}
