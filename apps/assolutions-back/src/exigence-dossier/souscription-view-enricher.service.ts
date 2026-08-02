import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { PersonneEntity } from '../personne/personne.entity';
import { SouscriptionPersonneEntity } from '../souscription/souscription-personne.entity';

@Injectable()
export class SouscriptionViewEnricherService {
  constructor(
    @InjectRepository(PersonneEntity)
    private readonly personneRepo: Repository<PersonneEntity>,
    @InjectRepository(SouscriptionPersonneEntity)
    private readonly ligneRepo: Repository<SouscriptionPersonneEntity>,
  ) {}

  async context<T extends { personnes?: any[] }>(value: T): Promise<T> {
    const people = value.personnes ?? [];
    if (!people.length) return value;
    const entities = await this.personneRepo.find({
      where: { id: In(people.map((item) => Number(item.id))) },
    });
    const byId = new Map(entities.map((item) => [item.id, item]));
    value.personnes = people.map((item) => {
      const entity = byId.get(Number(item.id));
      const pays = entity?.pays?.trim() || 'France';
      const missing = Array.isArray(item.champs_manquants)
        ? item.champs_manquants.filter((field: string) => field !== 'pays')
        : [];
      if (!pays) missing.push('pays');
      return {
        ...item,
        pays,
        champs_manquants: missing,
        informations_completes: missing.length === 0,
      };
    });
    return value;
  }

  async subscription<T extends { id: number; personnes?: any[] }>(
    value: T,
  ): Promise<T> {
    const lines = await this.ligneRepo.find({
      where: { souscription_id: Number(value.id) },
      order: { id: 'ASC' },
    });
    const byId = new Map(lines.map((item) => [item.id, item]));
    value.personnes = (value.personnes ?? []).map((item) => {
      const entity = byId.get(Number(item.id));
      return {
        ...item,
        type_licence: entity?.type_licence ?? 'LOISIR',
        dossier_complet: entity?.dossier_complet ?? false,
      };
    });
    return value;
  }
}
