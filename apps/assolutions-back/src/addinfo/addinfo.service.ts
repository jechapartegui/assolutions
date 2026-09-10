import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ADDINFO_ADMIN_FIELD_KINDS,
  AddinfoAdminFieldKind,
  CreateAdminAddinfoFieldDto,
  CreateAddinfoFieldDto,
  CreateAddInfoValueDto,
  SetAddinfoValueDto,
  UpdateAdminAddinfoFieldDto,
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
    const objectType = this.normalizeObjectType(dto.object_type);
    this.assertSupportedValueType(dto.value_type);

    const entity = this.repo.create({
      object_id: 0,
      object_type: objectType,
      value_type: dto.value_type,
      text: this.normalizeLabel(dto.text),
      project_id: projectId,
    });
    return this.repo.save(entity);
  }

  async update(id: number, dto: UpdateAddinfoFieldDto, projectId: number) {
    const item = await this.getForProject(id, projectId);

    if (dto.object_type !== undefined) {
      item.object_type = this.normalizeObjectType(dto.object_type);
    }

    if (dto.text !== undefined) {
      item.text = this.normalizeLabel(dto.text);
    }

    if (dto.value_type !== undefined && dto.value_type !== item.value_type) {
      this.assertSupportedValueType(dto.value_type);
      if (item.object_id === 0) {
        const usageCount = await this.getFieldUsageCount(item, projectId);
        if (
          usageCount > 0 &&
          this.kindFromValueType(dto.value_type) !==
            this.kindFromValueType(item.value_type)
        ) {
          throw new BadRequestException(
            'Le type d’un champ déjà utilisé ne peut pas être modifié.',
          );
        }
      }
      item.value_type = dto.value_type;
    }

    item.project_id = projectId;
    return this.repo.save(item);
  }

  async remove(id: number, projectId: number) {
    const item = await this.getForProject(id, projectId);

    if (item.object_id === 0) {
      const usageCount = await this.getFieldUsageCount(item, projectId);
      if (usageCount > 0) {
        throw new BadRequestException(
          `Ce champ est utilisé par ${usageCount} réponse(s). Il ne peut pas être supprimé.`,
        );
      }
    }

    await this.repo.remove(item);
    return { ok: true };
  }

  listFields(objectType: string, projectId: number) {
    return this.repo.find({
      where: {
        object_id: 0,
        object_type: this.normalizeObjectType(objectType),
        project_id: projectId,
      },
      order: { id: 'ASC' },
    });
  }

  async listAdminFields(objectType: string, projectId: number) {
    const fields = await this.listFields(objectType, projectId);
    return Promise.all(fields.map((field) => this.toAdminField(field, projectId)));
  }

  async createAdminField(
    dto: CreateAdminAddinfoFieldDto,
    projectId: number,
  ) {
    const objectType = this.normalizeObjectType(dto.object_type);
    const label = this.normalizeLabel(dto.label);
    const valueType = this.buildValueType(dto.kind, dto.options ?? []);

    const fields = await this.listFields(objectType, projectId);
    const duplicate = fields.some(
      (field) =>
        field.text.trim().toLocaleLowerCase('fr') ===
        label.toLocaleLowerCase('fr'),
    );
    if (duplicate) {
      throw new BadRequestException(`Un champ « ${label} » existe déjà.`);
    }

    const saved = await this.repo.save(
      this.repo.create({
        object_id: 0,
        object_type: objectType,
        value_type: valueType,
        text: label,
        project_id: projectId,
      }),
    );

    return this.toAdminField(saved, projectId);
  }

  async updateAdminField(
    id: number,
    dto: UpdateAdminAddinfoFieldDto,
    projectId: number,
  ) {
    const field = await this.getForProject(id, projectId);
    if (field.object_id !== 0) {
      throw new BadRequestException('Cette ligne addinfo n’est pas une définition de champ.');
    }

    if (dto.label !== undefined) {
      field.text = this.normalizeLabel(dto.label);
    }

    if (dto.kind !== undefined || dto.options !== undefined) {
      const currentKind = this.kindFromValueType(field.value_type);
      const targetKind = dto.kind ?? currentKind;
      const usageCount = await this.getFieldUsageCount(field, projectId);

      if (usageCount > 0 && targetKind !== currentKind) {
        throw new BadRequestException(
          'Le type d’un champ déjà utilisé ne peut pas être modifié. Les réponses existantes sont conservées.',
        );
      }

      const options =
        targetKind === 'select'
          ? dto.options ?? this.extractSelectOptions(field.value_type)
          : [];
      field.value_type = this.buildValueType(targetKind, options);
    }

    const saved = await this.repo.save(field);
    return this.toAdminField(saved, projectId);
  }

  async deleteAdminField(id: number, projectId: number) {
    const field = await this.getForProject(id, projectId);
    if (field.object_id !== 0) {
      throw new BadRequestException('Cette ligne addinfo n’est pas une définition de champ.');
    }

    const usageCount = await this.getFieldUsageCount(field, projectId);
    if (usageCount > 0) {
      throw new BadRequestException(
        `Ce champ possède ${usageCount} réponse(s). Supprimez ou migrez ces valeurs avant de retirer sa définition.`,
      );
    }

    await this.repo.remove(field);
    return { ok: true };
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
    field.value_type = this.buildValueType('select', normalized);
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
        object_type: this.normalizeObjectType(objectType),
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
    const objectType = this.normalizeObjectType(dto.object_type);
    await this.assertFieldBelongsToObjectType(dto.field_id, objectType, projectId);

    const existing = await this.repo.findOne({
      where: {
        object_type: objectType,
        object_id: dto.object_id,
        value_type: String(dto.field_id),
        project_id: projectId,
      },
    });

    const entity =
      existing ??
      this.repo.create({
        object_type: objectType,
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
    return this.setValue(dto, projectId);
  }

  async updateValue(
    id: number,
    dto: UpdateAddInfoValueDto,
    projectId: number,
  ): Promise<AddinfoEntity> {
    const entity = await this.getForProject(id, projectId);
    if (entity.object_id === 0) {
      throw new BadRequestException('Une définition de champ ne peut pas être modifiée comme une valeur.');
    }

    if (dto.text !== undefined) {
      entity.text = dto.text;
    }

    return this.repo.save(entity);
  }

  async deleteValue(id: number, projectId: number): Promise<void> {
    const entity = await this.getForProject(id, projectId);
    if (entity.object_id === 0) {
      throw new BadRequestException('Une définition de champ ne peut pas être supprimée comme une valeur.');
    }
    await this.repo.remove(entity);
  }

  private async toAdminField(field: AddinfoEntity, projectId: number) {
    const usage = await this.getFieldUsage(field, projectId);
    return {
      field,
      kind: this.kindFromValueType(field.value_type),
      options: this.extractSelectOptions(field.value_type),
      usage,
      usageCount: Object.values(usage).reduce((sum, count) => sum + count, 0),
    };
  }

  private async assertFieldBelongsToObjectType(
    fieldId: number,
    objectType: string,
    projectId: number,
  ): Promise<AddinfoEntity> {
    const field = await this.getForProject(fieldId, projectId);
    if (field.object_id !== 0 || field.object_type !== objectType) {
      throw new BadRequestException('Champ complémentaire incompatible avec cet objet.');
    }
    return field;
  }

  private normalizeObjectType(value: string): string {
    const normalized = String(value ?? '').trim().toUpperCase();
    if (!normalized || normalized.length > 50 || !/^[A-Z0-9_-]+$/.test(normalized)) {
      throw new BadRequestException('Type d’objet addinfo invalide.');
    }
    return normalized;
  }

  private normalizeLabel(value: string): string {
    const label = String(value ?? '').trim();
    if (!label) throw new BadRequestException('Le libellé du champ est obligatoire.');
    if (label.length > 120) {
      throw new BadRequestException('Le libellé du champ est trop long.');
    }
    return label;
  }

  private assertSupportedValueType(valueType: string): void {
    const kind = this.kindFromValueType(valueType);
    if (!ADDINFO_ADMIN_FIELD_KINDS.includes(kind as AddinfoAdminFieldKind)) {
      throw new BadRequestException(`Type de champ addinfo non supporté : ${valueType}`);
    }
    if (String(valueType ?? '').length > 50) {
      throw new BadRequestException('La configuration du champ dépasse 50 caractères.');
    }
  }

  private buildValueType(kind: AddinfoAdminFieldKind, options: string[]): string {
    if (!ADDINFO_ADMIN_FIELD_KINDS.includes(kind)) {
      throw new BadRequestException(`Type de champ addinfo non supporté : ${kind}`);
    }

    if (kind !== 'select') return kind;

    const normalized = this.normalizeOptions(options);
    const valueType = `select:${JSON.stringify(normalized)}`;
    if (valueType.length > 50) {
      throw new BadRequestException(
        'La liste est trop longue pour le modèle addinfo actuel (50 caractères maximum).',
      );
    }
    return valueType;
  }

  private kindFromValueType(valueType: string): AddinfoAdminFieldKind {
    if (this.isSelectType(valueType)) return 'select';
    const raw = String(valueType ?? '').trim();
    if (ADDINFO_ADMIN_FIELD_KINDS.includes(raw as AddinfoAdminFieldKind)) {
      return raw as AddinfoAdminFieldKind;
    }
    return 'string';
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

  private async getFieldUsageCount(
    field: AddinfoEntity,
    projectId: number,
  ): Promise<number> {
    return this.repo.count({
      where: {
        project_id: projectId,
        object_type: field.object_type,
        value_type: String(field.id),
      },
    });
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
