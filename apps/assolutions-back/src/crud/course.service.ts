
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { Course } from '../entities/cours.entity';
import { LinkGroupService } from './linkgroup.service';

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course)
    private readonly repo: Repository<Course>,
    private linkgroup_serv :LinkGroupService,
  ) {}

  async get(id: number): Promise<Course> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('COURSE_NOT_FOUND');
     // on va chercher tous les LinkGroup qui matche notre cours   
    item.groups = await this.linkgroup_serv.getGroupsForObject('cours', id);
    return item;
  }

   async getAll(seasonId:number): Promise<Course[]> {
    let courses = await this.repo.find({ where: {seasonId}});
    // pour chaque cours, on va chercher ses liens “cours”
    return Promise.all(
      courses.map(async course => {
        course.groups = await this.linkgroup_serv.getGroupsForObject('cours', course.id);
        return course;
      })
    );
  }
  async create(data: Partial<Course>): Promise<Course> {
    try {
      const created = this.repo.create(data);
      return await this.repo.save(created);
    } catch (err) {
      if (err instanceof QueryFailedError) throw new BadRequestException('INTEGRITY_ERROR');
      throw err;
    }
  }

  async update(id: number, data: Partial<Course>): Promise<Course> {
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
