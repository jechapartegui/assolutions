
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError, In } from 'typeorm';
import { Contact } from '../entities/contacts.entity';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private readonly repo: Repository<Contact>,
  ) {}

  async get(id: number): Promise<Contact> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('CONTACT_NOT_FOUND');
    return item;
  }

  async getAll(objectId:number, objectType:string): Promise<Contact[]> {
    
  if (!objectId) {
    throw new NotFoundException(`OBJECTID_NOT_FOUND`);
  }
  if(!objectType) {
    throw new NotFoundException(`OBJECTTYPE_NOT_FOUND`);
  }
    return this.repo.find({
      where: { objectId, objectType },
    });
  }
   
  async getAllForObjects(objectType: string, objectIds: number[]) {
  if (!objectIds?.length) return [];
  return this.repo.find({
    where: { objectType, objectId: In(objectIds) },
    order: { id: 'DESC' },
  });
}


  async create(data: Partial<Contact>): Promise<Contact> {
    try {
      const created = this.repo.create(data);
      return await this.repo.save(created);
    } catch (err) {
      if (err instanceof QueryFailedError) throw new BadRequestException('INTEGRITY_ERROR');
      throw err;
    }
  }

  async update(id: number, data: Partial<Contact>): Promise<Contact> {
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

  async deleteAllForObject(objectType: string, objectId: number): Promise<void> {
    await this.repo.delete({ objectType, objectId });
  } 
}
