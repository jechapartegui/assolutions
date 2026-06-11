import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  InitMailProjectDto,
  MailProjectTemplateType,
  MailProjectTemplateVm,
  UpdateMailProjectBodylessTemplateDto,
  UpdateMailProjectTemplateDto,
} from './mail_project.dto';
import { MailProjectEntity } from './mail_project.entity';

type TemplateFieldConfig = {
  sujetField: keyof MailProjectEntity | null;
  mailField: keyof MailProjectEntity;
};

@Injectable()
export class MailProjectService {
  private readonly templateFields: Record<MailProjectTemplateType, TemplateFieldConfig> = {
    relance: {
      sujetField: 'sujet_relance',
      mailField: 'mail_relance',
    },
    annulation: {
      sujetField: 'sujet_annulation',
      mailField: 'mail_annulation',
    },
    convocation: {
      sujetField: 'sujet_convocation',
      mailField: 'mail_convocation',
    },
    essai: {
      sujetField: 'sujet_essai',
      mailField: 'mail_essai',
    },
    bienvenue: {
      sujetField: 'sujet_bienvenue',
      mailField: 'mail_bienvenue',
    },
    serie_seance: {
      sujetField: 'sujet_serie_seance',
      mailField: 'mail_serie_seance',
    },
    vide: {
      sujetField: null,
      mailField: 'mail_vide',
    },
  };

  constructor(
    @InjectRepository(MailProjectEntity)
    private readonly repo: Repository<MailProjectEntity>,
    
  ) {}

  async init(projectId: number, dto: InitMailProjectDto): Promise<MailProjectEntity> {
    const existing = await this.repo.findOne({ where: { id: projectId } });

    const entity = existing
      ? Object.assign(existing, dto)
      : this.repo.create({
          id: projectId,
          ...dto,
        });

    const saved = await this.repo.save(entity);

    return saved;
  }

  async get(projectId: number): Promise<MailProjectEntity> {
    const item = await this.repo.findOne({ where: { id: projectId } });
    if (!item) {
      throw new NotFoundException(`mail_project ${projectId} introuvable`);
    }
    return item;
  }

  async getTemplate(
    projectId: number,
    type: MailProjectTemplateType,
  ): Promise<MailProjectTemplateVm> {
    const item = await this.get(projectId);
    const config = this.templateFields[type];

    return {
      type,
      sujet: config.sujetField ? String(item[config.sujetField] ?? '') : null,
      mail: String(item[config.mailField] ?? ''),
    };
  }

  async updateTemplate(
    projectId: number,
    type: MailProjectTemplateType,
    dto: UpdateMailProjectTemplateDto | UpdateMailProjectBodylessTemplateDto,
  ): Promise<MailProjectTemplateVm> {
    const item = await this.get(projectId);
    const config = this.templateFields[type];

    item[config.mailField] = dto.mail as never;

    if (config.sujetField) {
      if (!('sujet' in dto)) {
        throw new BadRequestException(`Le template '${type}' nécessite un sujet`);
      }
      item[config.sujetField] = dto.sujet as never;
    }

    await this.repo.save(item);

    return this.getTemplate(projectId, type);
  }
}