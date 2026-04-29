import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RegistryService } from '../registry/registry.service';
import { Contact } from './contact.entity';
import { CreateContactDto, UpdateContactDto } from './contact.dto';

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(Contact)
    private readonly repo: Repository<Contact>,
    private readonly registry: RegistryService,
  ) {}

    async list(ids: number[]) {
        return  this.repo.find({ where: { object_id: In(ids), object_type: 'rider' } });
       
    }

    async get(id: number) {
        return this.repo.findOne({ where: { id } });
    }

  async create(dto: CreateContactDto,) {
    const entity = this.repo.create({ ...dto as CreateContactDto });
    const saved = await this.repo.save(entity);

    await this.registry.ensure('contact', saved.id);
    return saved;
  }

  async update(id: number, dto: UpdateContactDto) {
    const item = await this.get(id);
    Object.assign(item, dto);
    const saved = await this.repo.save(item);

    await this.registry.ensure('contact', id);
    return saved;
  }

  async remove(id: number) {
    const item = await this.get(id);
    await this.repo.remove(item);

    await this.registry.remove('contact', id);
    return { ok: true };
  }
}
