import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiClientService } from './api-client.service';
import { Project, CreateProjectDto, UpdateProjectDto } from '@shared/lib/project.interface';

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

  async get(id: number): Promise<Project> {
    try {
      return await this.api.GET<Project>(`${this.base}/${id}`);
    } catch (error) {
      const http = error as HttpErrorResponse;
      if (http?.status === 401 || http?.status === 403) {
        // Les écrans qui n'ont besoin que des informations publiques du club
        // (création de compte, contact club...) ne doivent pas nécessiter les
        // droits administrateur du projet.
        return this.getPublic(id);
      }
      throw error;
    }
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
