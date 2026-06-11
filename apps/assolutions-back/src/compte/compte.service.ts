import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompteEntity } from './compte.entity';
import { CreateCompteDto, UpdateCompteDto } from './compte.dto';


@Injectable()
export class CompteService {
  constructor(
    @InjectRepository(CompteEntity)
    private readonly repo: Repository<CompteEntity>,
    
  ) {}

  list(id:number) {
    if (!id) throw new NotFoundException(`projet introuvable`);
    return this.repo.find({ order: { id: 'ASC' } });
  }

  async get(id: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`compte ${id} introuvable`);
    return item;
  }

  async create(dto: CreateCompteDto) {
    const entity = this.repo.create(dto);
    const saved = await this.repo.save(entity);


    return saved;
  }

  async check_token(login: string, token: string) {
    const item = await this.repo.findOne({ where: { login } });
    if (!item) throw new NotFoundException(`compte ${login} introuvable`);
    if(item.activation_token !== token) throw new NotFoundException(`token incorrect pour le compte ${login}`);
    return item;
  }

  async update(id: number, dto: UpdateCompteDto) {
    const item = await this.get(id);
    Object.assign(item, dto, { date_maj: new Date() });
    const saved = await this.repo.save(item);


    return saved;
  }

  async remove(id: number) {
    const item = await this.get(id);
    await this.repo.remove(item);
    return { ok: true };
  }
}
