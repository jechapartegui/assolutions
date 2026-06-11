import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateMailRecordDto, UpdateMailRecordDto } from './mail_record.dto';
import { MailRecordEntity } from './mail_record.entity';

@Injectable()
export class MailRecordService {
  constructor(
    @InjectRepository(MailRecordEntity) private readonly repo: Repository<MailRecordEntity>,
    
  ) {}

  listForProject(projectId: number) {
    return this.repo.find({ where: { project_id: projectId }, order: { id: 'DESC' } });
  }

  async getForProject(id: number, projectId: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`mail_record ${id} introuvable`);
    if (item.project_id !== projectId) throw new ForbiddenException('WRONG_PROJECT');
    return item;
  }

  async create(dto: CreateMailRecordDto, projectId: number) {
    const saved = await this.repo.save(this.repo.create({ ...dto as CreateMailRecordDto, project_id: projectId }));
    return saved;
  }

  async update(id: number, dto: UpdateMailRecordDto, projectId: number) {
    const item = await this.getForProject(id, projectId);
    Object.assign(item, dto, { project_id: projectId });
    const saved = await this.repo.save(item);
    return saved;
  }

  async remove(id: number, projectId: number) {
    const item = await this.getForProject(id, projectId);
    await this.repo.remove(item);
    return { ok: true };
  }
}
