import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import {
  AddInfo,
  AddInfoFormItem_VM,
  CreateAddInfoDto,
  UpdateAddInfoDto,
} from '@shared/index';

export type AddInfoFieldKind =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'select'
  | 'email'
  | 'phone'
  | 'url'
  | 'textarea';

export interface AddInfoListFieldVm {
  field: AddInfo;
  options: string[];
  usage: Record<string, number>;
}

export interface AddInfoAdminFieldVm extends AddInfoListFieldVm {
  kind: AddInfoFieldKind;
  usageCount: number;
}

export interface AddInfoAdminFieldPayload {
  object_type?: string;
  label: string;
  kind: AddInfoFieldKind;
  options?: string[];
}

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

  update(id: number, dto: UpdateAddInfoDto): Promise<AddInfo> {
    return this.api.POST<AddInfo>(`${this.base}/${id}/update`, dto);
  }

  remove(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/${id}/delete`, {});
  }

  listAdminFields(objectType: string): Promise<AddInfoAdminFieldVm[]> {
    return this.api.GET<AddInfoAdminFieldVm[]>(
      `${this.base}/admin/fields/${encodeURIComponent(objectType)}`,
    );
  }

  createAdminField(
    dto: AddInfoAdminFieldPayload & { object_type: string },
  ): Promise<AddInfoAdminFieldVm> {
    return this.api.POST<AddInfoAdminFieldVm>(`${this.base}/admin/fields`, dto);
  }

  updateAdminField(
    id: number,
    dto: Partial<AddInfoAdminFieldPayload>,
  ): Promise<AddInfoAdminFieldVm> {
    return this.api.POST<AddInfoAdminFieldVm>(
      `${this.base}/admin/fields/${id}/update`,
      dto,
    );
  }

  deleteAdminField(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/admin/fields/${id}/delete`, {});
  }

  listSelectableFields(): Promise<AddInfoListFieldVm[]> {
    return this.api.GET<AddInfoListFieldVm[]>(`${this.base}/admin/list-fields`);
  }

  updateSelectableFieldOptions(
    id: number,
    options: string[],
  ): Promise<AddInfoListFieldVm> {
    return this.api.POST<AddInfoListFieldVm>(
      `${this.base}/admin/list-fields/${id}/options`,
      { options },
    );
  }

  listFields(objectType: string): Promise<AddInfo[]> {
    return this.api.GET<AddInfo[]>(`${this.base}/fields/${encodeURIComponent(objectType)}`);
  }

  listValues(objectType: string, objectId: number): Promise<AddInfo[]> {
    return this.api.GET<AddInfo[]>(
      `${this.base}/values/${encodeURIComponent(objectType)}/${objectId}`,
    );
  }

  getForm(objectType: string, objectId: number): Promise<AddInfoFormItem_VM[]> {
    return this.api.GET<AddInfoFormItem_VM[]>(
      `${this.base}/form/${encodeURIComponent(objectType)}/${objectId}`,
    );
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
