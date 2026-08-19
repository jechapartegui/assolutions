import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccessControlService } from '../common/access-control.service';
import { LoginProjectEntity } from './login_project.entity';
import { CreateLoginProjectDto, DeleteLoginProjectDto } from './login_project.dto';

@Injectable()
export class LoginProjectService {
  constructor(
    @InjectRepository(LoginProjectEntity)
    private readonly repo: Repository<LoginProjectEntity>,
    private readonly access: AccessControlService,
  ) {}

  async listByLoginAuthorized(
    requesterId: number,
    loginId: number,
    projectId?: number | null,
  ): Promise<LoginProjectEntity[]> {
    if (Number(requesterId) === Number(loginId)) {
      const items = await this.repo.find({
        where: { login_id: loginId },
        relations: ['project'],
        order: { project_id: 'ASC' },
      });
      return items.map((item) => this.hideProjectSecrets(item));
    }

    if (!projectId) throw new ForbiddenException('PROJECT_ID_REQUIRED');
    await this.access.assertProjectAdmin(requesterId, projectId);
    await this.access.assertAccountAccess(requesterId, loginId, projectId);

    const items = await this.repo.find({
      where: { login_id: loginId, project_id: projectId },
      relations: ['project'],
      order: { project_id: 'ASC' },
    });
    return items.map((item) => this.hideProjectSecrets(item));
  }

  async create(
    dto: CreateLoginProjectDto,
    requesterId: number,
    guardedProjectId: number,
  ): Promise<LoginProjectEntity> {
    this.assertMatchingProject(dto.project_id, guardedProjectId);
    await this.access.assertProjectAdmin(requesterId, guardedProjectId);

    const existing = await this.repo.findOne({
      where: {
        login_id: dto.login_id,
        project_id: guardedProjectId,
      },
    });
    if (existing) return existing;

    return this.repo.save(this.repo.create({
      login_id: dto.login_id,
      project_id: guardedProjectId,
    }));
  }

  async delete(
    dto: DeleteLoginProjectDto,
    requesterId: number,
    guardedProjectId: number,
  ): Promise<{ deleted: boolean }> {
    this.assertMatchingProject(dto.project_id, guardedProjectId);
    await this.access.assertProjectAdmin(requesterId, guardedProjectId);

    const result = await this.repo.delete({
      login_id: dto.login_id,
      project_id: guardedProjectId,
    });
    return { deleted: (result.affected ?? 0) > 0 };
  }

  private assertMatchingProject(bodyProjectId: number, guardedProjectId: number): void {
    if (Number(bodyProjectId) !== Number(guardedProjectId)) {
      throw new ForbiddenException('PROJECT_MISMATCH');
    }
  }

  private hideProjectSecrets(item: LoginProjectEntity): LoginProjectEntity {
    if (item.project) {
      item.project.password = '';
      item.project.activation_token = null;
    }
    return item;
  }
}
