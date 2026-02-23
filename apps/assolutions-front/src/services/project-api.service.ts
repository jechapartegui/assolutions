import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { Project, CreateProjectDto, UpdateProjectDto } from '@shared/lib/project.interface';
import { ProjetView } from '@shared/index';

@Injectable({ providedIn: 'root' })
export class ProjectApiService {
  private readonly base = '/projects';

  constructor(private api: ApiClientService) {}

  listMine(): Promise<ProjetView[]> {
    return this.api.GET<ProjetView[]>(this.base);
  }

  get(id: number): Promise<Project> {
    return this.api.GET<Project>(`${this.base}/${id}`);
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
