export class CreateAddinfoFieldDto {
  object_type: string;
  value_type: string;
  text: string;
}

export class UpdateAddinfoFieldDto {
  object_type?: string;
  value_type?: string;
  text?: string;
}

export class SetAddinfoValueDto {
  object_type: string;
  object_id: number;
  field_id: number;
  text: string;
}

export class UpdateAddinfoValueDto {
  text?: string;
}

export class UpsertLovDto {
  code: string; // STOCK, COMPTE...
  lang: string; // FR, EN...
  text: string; // JSON sérialisé
  project_specific?: boolean;
}

export class CreateAddInfoValueDto {
  object_type: string;
  object_id: number;
  field_id: number;
  text: string;
}

export class UpdateAddInfoValueDto {
  text?: string;
}