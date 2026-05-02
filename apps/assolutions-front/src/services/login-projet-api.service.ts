import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { CreateLoginProjectDto, DeleteLoginProjectDto } from '@shared/index';
import { Projet_VM } from '@shared/lib/projet.interface';

@Injectable({ providedIn: 'root' })
export class LoginProjectApiService {
  private readonly base = '/login-project';

  constructor(private api: ApiClientService) {}

  get(): Promise<Projet_VM[]> {
    return this.api.GET<Projet_VM[]>(`${this.base}`);
  }

  joinWithToken(token: string): Promise<void> {
    return this.api.POST<void>(`${this.base}/join-with-token`, { token });
  }

  create(dto: CreateLoginProjectDto): Promise<CreateLoginProjectDto> {
    return this.api.POST<CreateLoginProjectDto>(this.base, dto);
  }

  remove(dto: DeleteLoginProjectDto): Promise<void> {
    return this.api.POST<void>(`${this.base}/${dto.login_id}/delete`, {});
  }
}
