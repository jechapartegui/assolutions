import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { AddInfo, AddInfoFormItem_VM, CreateAddInfoDto, UpdateAddInfoDto } from '@shared/index';

@Injectable({ providedIn: 'root' })
export class AddInfoApiService {
  private readonly base = '/addinfo';

  constructor(private api: ApiClientService) {}

  list(): Promise<AddInfo[]> {
    return this.api.GET<AddInfo[]>(this.base);
  }

  get(id: number): Promise<AddInfo> {
    return this.api.GET<AddInfo>(`${this.base}/${id}`);
  }

  create(dto: CreateAddInfoDto): Promise<AddInfo> {
    return this.api.POST<AddInfo>(this.base, dto);
  }

  // ✅ UPDATE via POST
  update(id: number, dto: UpdateAddInfoDto): Promise<AddInfo> {
    return this.api.POST<AddInfo>(`${this.base}/${id}/update`, dto);
  }

  // ✅ DELETE via POST
  remove(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/${id}/delete`, {});
  }

  listFields(objectType: string): Promise<AddInfo[]> {
  return this.api.GET<AddInfo[]>(`${this.base}/fields/${objectType}`);
}

listValues(objectType: string, objectId: number): Promise<AddInfo[]> {
  return this.api.GET<AddInfo[]>(`${this.base}/values/${objectType}/${objectId}`);
}

getForm(objectType: string, objectId: number): Promise<AddInfoFormItem_VM[]> {
  return this.api.GET<AddInfoFormItem_VM[]>(`${this.base}/form/${objectType}/${objectId}`);
}

setValue(dto: {
  object_type: string;
  object_id: number;
  field_id: number;
  text: string;
}): Promise<AddInfo> {
  return this.api.POST<AddInfo>(`${this.base}/values`, dto);
}

getLov<T = unknown>(code: string, lang = 'FR'): Promise<AddInfo | null> {
  return this.api.GET<AddInfo | null>(`${this.base}/lov/${code}/${lang}`);
}

createValue(dto: {
  object_type: string;
  object_id: number;
  field_id: number;
  text: string;
}): Promise<AddInfo> {
  return this.api.POST<AddInfo>(`${this.base}/values`, dto);
}

updateValue(id: number, dto: { text: string }): Promise<AddInfo> {
  return this.api.POST<AddInfo>(`${this.base}/values/${id}/update`, dto);
}

deleteValue(id: number): Promise<void> {
  return this.api.POST<void>(`${this.base}/values/${id}/delete`, {});
}
}
