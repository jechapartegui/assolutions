import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistryEntity } from './registry.entity';

@Injectable()
export class RegistryService {
  constructor(
    @InjectRepository(RegistryEntity)
    private readonly repo: Repository<RegistryEntity>,
  ) {}

  /**
   * Crée l'entrée registry si elle n'existe pas, sinon met à jour updated_at.
   * Retourne l'id de registry.
   */
  async ensure(entityType: string, entityId: number): Promise<string> {
    const res = await this.repo.query(
      `
      INSERT INTO public.registry(entity_type, entity_id)
      VALUES ($1, $2)
      ON CONFLICT (entity_type, entity_id)
      DO UPDATE SET updated_at = now()
      RETURNING id
      `,
      [entityType, entityId],
    );

    return String(res?.[0]?.id);
  }

  async touch(entityType: string, entityId: number): Promise<void> {
    await this.repo.query(
      `
      UPDATE public.registry
      SET updated_at = now()
      WHERE entity_type = $1 AND entity_id = $2
      `,
      [entityType, entityId],
    );
  }

  async remove(entityType: string, entityId: number): Promise<void> {
    await this.repo.query(
      `
      DELETE FROM public.registry
      WHERE entity_type = $1 AND entity_id = $2
      `,
      [entityType, entityId],
    );
  }
}
