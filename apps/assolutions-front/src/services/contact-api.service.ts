import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { ItemContact } from '@shared/index';


export type CreateContactDto = Omit<ItemContact, 'id'>;
export type UpdateContactDto = Partial<Omit<ItemContact, 'id'>> & {
  id?: number;
};
export type ContactDto= {
    id: number;
    object_type: string;
    object_id: number;
    contact_type: string;
    contact_value?: string | null;
    diffusion?: boolean | null;
    contact_list: string;
    info?: string | null;
    pref: boolean;
}
@Injectable({ providedIn: 'root' })
export class ContactApiService {
  private readonly base = '/contact';

  constructor(private api: ApiClientService) {}

  list_by_id(ids: number[]): Promise<ContactDto[]> {
    return this.api.POST<ContactDto[]>(`${this.base}/list`, { ids });
  }

  get(id: number): Promise<ItemContact> {
    return this.api.GET<ItemContact>(`${this.base}/${id}`);
  }

  create(dto: CreateContactDto): Promise<ItemContact> {
    return this.api.POST<ItemContact>(this.base, dto);
  }

  update(id: number, dto: UpdateContactDto): Promise<ItemContact> {
    return this.api.POST<ItemContact>(`${this.base}/${id}/update`, dto);
  }

  remove(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/${id}/delete`, {});
  }
}
