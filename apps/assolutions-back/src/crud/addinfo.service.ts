import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AddInfo } from '../entities/addinfo.entity';


@Injectable()
export class AddInfoService {
constructor(@InjectRepository(AddInfo) private repo: Repository<AddInfo>) {}


async get(id: number) { const e = await this.repo.findOne({ where: { id } }); if (!e) throw new NotFoundException('ADDINFO_NOT_FOUND'); return e; }
async getAllByType(objectType: string, projectId:number | null) { return this.repo.findOne({ where: { objectType, projectId } }); }
async getAllByProject(projectId: number) { return this.repo.find({ where: { projectId } }); }
async getAll() { return this.repo.find(); }
async create(data: Partial<AddInfo>) { const e = this.repo.create(data); return this.repo.save(e); }
async update(id: number, data: Partial<AddInfo>) { await this.repo.update({ id }, data); return this.get(id); }
async delete(id: number) { await this.repo.delete(id); }
}