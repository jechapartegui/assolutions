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

  async listForProject(projectId: number) {
    try {
      return await this.repo.find({
        where: { project_id: projectId },
        order: { id: 'DESC' },
      });
    } catch (error: unknown) {
      // Compatibilité temporaire avec les bases qui n'ont pas encore reçu
      // la migration Fix 84 (created_at/status/error). Le suivi reste alors
      // utilisable pour l'historique existant au lieu de planter entièrement.
      if (!this.isLegacySchemaError(error)) throw error;

      return this.repo.query(
        `SELECT id,
                record,
                "to",
                subject,
                project_id,
                NULL::timestamptz AS created_at,
                'SENT'::varchar AS status,
                NULL::text AS error
           FROM mail_record
          WHERE project_id = $1
          ORDER BY id DESC`,
        [projectId],
      );
    }
  }

  async getForProject(id: number, projectId: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`mail_record ${id} introuvable`);
    if (item.project_id !== projectId) throw new ForbiddenException('WRONG_PROJECT');
    return item;
  }

  async create(dto: CreateMailRecordDto, projectId: number) {
    const saved = await this.repo.save(
      this.repo.create({ ...dto as CreateMailRecordDto, project_id: projectId }),
    );
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

  private isLegacySchemaError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error ?? '');
    const normalized = message.toLowerCase();
    return (
      normalized.includes('column') &&
      normalized.includes('does not exist') &&
      (normalized.includes('created_at') ||
        normalized.includes('status') ||
        normalized.includes('error'))
    );
  }
}
