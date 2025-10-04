
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError, IsNull } from 'typeorm';
import { Group } from '../entities/groupe.entity';

@Injectable()
export class GroupService {
  constructor(
    @InjectRepository(Group)
    private readonly repo: Repository<Group>,
  ) {}

  async get(id: number): Promise<Group> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('GROUP_NOT_FOUND');
    return item;
  }



  async getAll(saisonId :number, prive:boolean): Promise<Group[]> {
    if(!prive){
     return this.repo.find({
  where: [
    { saisonId, visible: false },
    { saisonId, visible: IsNull() }
  ]
});
    } else {
      return this.repo.find({where:{saisonId}});
    }
  }

  async create(data: Partial<Group>): Promise<Group> {
    try {
      const created = this.repo.create(data);
      return await this.repo.save(created);
    } catch (err) {
      if (err instanceof QueryFailedError) throw new BadRequestException('INTEGRITY_ERROR');
      throw err;
    }
  }

  async update(id: number, data: Partial<Group>): Promise<Group> {
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
