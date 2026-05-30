import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';

export type ContactList = 'liste_contact' | 'liste_contact_prevenir';

export type ContactDto = {
  id: number;
  object_type: string;
  object_id: number;
  contact_type: string;
  contact_value?: string | null;
  diffusion?: boolean | null;
  contact_list: ContactList | string;
  info?: string | null;
  pref: boolean;
};

export type CreateContactDto = {
  object_type: string;
  object_id: number;
  contact_type: string;
  contact_value?: string | null;
  diffusion?: boolean | null;
  contact_list?: ContactList | string;
  info?: string | null;
  pref: boolean;
};

export type UpdateContactDto = CreateContactDto;

@Injectable({ providedIn: 'root' })
export class ContactApiService {
  private readonly base = '/contact';

  constructor(private api: ApiClientService) {}

  list_by_id(ids: number[]): Promise<ContactDto[]> {
    return this.api.POST<ContactDto[]>(`${this.base}/list`, { ids });
  }

  get(id: number): Promise<ContactDto> {
    return this.api.GET<ContactDto>(`${this.base}/${id}`);
  }

  create(dto: CreateContactDto): Promise<ContactDto> {
    return this.api.POST<ContactDto>(this.base, dto);
  }

  update(id: number, dto: UpdateContactDto): Promise<ContactDto> {
    return this.api.POST<ContactDto>(`${this.base}/${id}/update`, dto);
  }

  remove(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/${id}/delete`, {});
  }
}