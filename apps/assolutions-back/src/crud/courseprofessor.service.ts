
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { CourseProfessor } from '../entities/cours_professeur.entity';

@Injectable()
export class CourseProfessorService {
  constructor(
    @InjectRepository(CourseProfessor)
    private readonly repo: Repository<CourseProfessor>,
  ) {}

  async get(id: number): Promise<CourseProfessor> {
    const item = await this.repo.findOne({ where: { id },
    relations: [
      'contract',                         // 1er niveau
      'contract.professor',           // 2ᵉ niveau
      'contract.professor.person',    // 3ᵉ niveau (votre “season”)
    ] });
    if (!item) throw new NotFoundException('COURSE_PROFESSOR_NOT_FOUND');
    return item;
  }

 async getBy(courseId: number, professorId: number): Promise<CourseProfessor> {
  const item = await this.repo.findOne({
    where: {
      courseId,
      contract: {
        professorId,
      },
    },
    relations: [
      'contract',
      'contract.professor',
      'contract.professor.person',
    ],
  });

  if (!item) {
    throw new NotFoundException('COURSE_PROFESSOR_NOT_FOUND');
  }

  return item;
}


  async getAll(courseId:number): Promise<CourseProfessor[]> {
    return this.repo.find({ where: { courseId },
    relations: [
      'contract',                         // 1er niveau
      'contract.professor',           // 2ᵉ niveau
      'contract.professor.person',    // 3ᵉ niveau (votre “season”)
    ], });
  }

  async create(data: Partial<CourseProfessor>): Promise<CourseProfessor> {

    try {
      const created = this.repo.create(data);
      return await this.repo.save(created);
    } catch (err) {
      if (err instanceof QueryFailedError) throw new BadRequestException('INTEGRITY_ERROR');
      throw err;
    }
  }

  async update(id: number, data: Partial<CourseProfessor>): Promise<CourseProfessor> {
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
