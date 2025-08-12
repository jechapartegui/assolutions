
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { LinkGroup } from '../entities/lien_groupe.entity';

@Injectable()
export class LinkGroupService {
  constructor(
    @InjectRepository(LinkGroup)
    private readonly repo: Repository<LinkGroup>,
  ) {}

  async get(id: number): Promise<LinkGroup> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('LINKGROUP_NOT_FOUND');
    return item;
  }

  async getAll(): Promise<LinkGroup[]> {
    return this.repo.find();
  }

  async create(data: Partial<LinkGroup>): Promise<LinkGroup> {
    try {
      const created = this.repo.create(data);
      return await this.repo.save(created);
    } catch (err) {
      console.warn(err);
      if (err instanceof QueryFailedError) throw new BadRequestException('INTEGRITY_ERROR');
      throw err;
    }
  }

  async update(id: number, data: Partial<LinkGroup>): Promise<LinkGroup> {
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
  async getGroupsForObject(
    objectType: 'cours' | 'séance' | 'rider',
    objectId: number
  ): Promise<LinkGroup[]> {
    const links = await this.repo.find({
      where: { objectType, objectId }, relations: ['group'],
    });

    return links;
  }
}


