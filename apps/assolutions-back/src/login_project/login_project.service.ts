import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoginProjectEntity } from './login_project.entity';
import { CreateLoginProjectDto, DeleteLoginProjectDto } from './login_project.dto';

@Injectable()
export class LoginProjectService {
  constructor(
    @InjectRepository(LoginProjectEntity)
    private readonly repo: Repository<LoginProjectEntity>,
  ) {}

  async listByLogin(loginId: number): Promise<LoginProjectEntity[]> {
    return this.repo.find({
      where: { login_id: loginId },
      relations: ['project'],
      order: { project_id: 'ASC' },
    });
  }

  async create(dto: CreateLoginProjectDto): Promise<LoginProjectEntity> {
    const existing = await this.repo.findOne({
      where: {
        login_id: dto.login_id,
        project_id: dto.project_id,
      },
    });

    if (existing) return existing;

    return this.repo.save(
      this.repo.create({
        login_id: dto.login_id,
        project_id: dto.project_id,
      }),
    );
  }

  async delete(dto: DeleteLoginProjectDto): Promise<{ deleted: boolean }> {
    const result = await this.repo.delete({
      login_id: dto.login_id,
      project_id: dto.project_id,
    });

    return { deleted: (result.affected ?? 0) > 0 };
  }
}