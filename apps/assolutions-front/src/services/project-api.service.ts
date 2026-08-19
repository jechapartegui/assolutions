import { Injectable } from '@angular/core';
import { Project, CreateProjectDto, UpdateProjectDto } from '@shared/lib/project.interface';
import { ApiClientService } from './api-client.service';
import { getAuthToken } from './auth-token.storage';

@Injectable({ providedIn: 'root' })
export class ProjectApiService {
  private readonly base = '/projects';

  constructor(private api: ApiClientService) {}

  async listPublicProjects(): Promise<Project[]> {
    return this.api.GET<Project[]>(`${this.base}/public`);
  }

  getPublic(id: number): Promise<Project> {
    return this.api.GET<Project>(`${this.base}/public/${id}`);
  }

  async getAll(): Promise<Project[]> {
    return this.api.GET<Project[]>(this.base);
  }

  get(id: number): Promise<Project> {
    // Le mode CREATE charge le projet avant connexion ; une session authentifiée
    // conserve, elle, l'accès complet contrôlé par le back.
    return getAuthToken()
      ? this.api.GET<Project>(`${this.base}/${id}`)
      : this.getPublic(id);
  }

  create(dto: CreateProjectDto): Promise<Project> {
    return this.api.POST<Project>(this.base, dto);
  }

  update(id: number, dto: UpdateProjectDto): Promise<Project> {
    return this.api.POST<Project>(`${this.base}/${id}/update`, dto);
  }

  remove(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/${id}/delete`, {});
  }
}
