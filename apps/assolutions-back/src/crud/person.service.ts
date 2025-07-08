
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { Person } from '../entities/personne.entity';

@Injectable()
export class PersonService {
  constructor(
    @InjectRepository(Person)
    private readonly repo: Repository<Person>,
  ) {}

  async get(id: number): Promise<Person> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('PERSON_NOT_FOUND');
    return item;
  }

  async getAll(): Promise<Person[]> {
    return this.repo.find();
  }

  async create(data: Partial<Person>): Promise<Person> {
    try {
      const created = this.repo.create(data);
      return await this.repo.save(created);
    } catch (err) {
      if (err instanceof QueryFailedError) throw new BadRequestException('INTEGRITY_ERROR');
      throw err;
    }
  }

  async update(id: number, data: Partial<Person>): Promise<Person> {
    await this.get(id);
    try {
      await this.repo.update({ id }, data);
    } catch (err) {
      if (err instanceof QueryFailedError) throw new BadRequestException('INTEGRITY_ERROR');
      throw err;
    }
    return this.get(id);
  }

  async delete(id: number): Promise<void> {
    await this.get(id);
    await this.repo.delete({ id });
  }
}
