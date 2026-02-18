import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistryService } from '../registry/registry.service';
import { CreatePersonneDto, UpdatePersonneDto } from './personne.dto';
import { PersonneEntity } from './personne.entity';

@Injectable()
export class PersonneService {
  constructor(
    @InjectRepository(PersonneEntity)
    private readonly repo: Repository<PersonneEntity>,
    private readonly registry: RegistryService,
  ) {}

  listForCompte(compteId: number) {
    return this.repo.find({
      where: { compte: compteId },
      order: { id: 'ASC' },
    });
  }

  async get(id: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`personne ${id} introuvable`);
    return item;
  }

  async create(dto: CreatePersonneDto) {
    const entity = this.repo.create(dto as CreatePersonneDto);
    const saved = await this.repo.save(entity);

    await this.registry.ensure('personne', saved.id);
    return saved;
  }

  async update(id: number, dto: UpdatePersonneDto) {
    const item = await this.get(id);
    Object.assign(item, dto, { date_maj: new Date() });
    const saved = await this.repo.save(item);

    await this.registry.ensure('personne', id);
    return saved;
  }

  async remove(id: number) {
    const item = await this.get(id);
    await this.repo.remove(item);

    await this.registry.remove('personne', id);
    return { ok: true };
  }
}
