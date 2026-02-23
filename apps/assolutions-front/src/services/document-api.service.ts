import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { Document, CreateDocumentDto, UpdateDocumentDto } from '@shared/lib/document.interface';

@Injectable({ providedIn: 'root' })
export class DocumentApiService {
  private readonly base = '/documents';

  constructor(private api: ApiClientService) {}

  get(id: number): Promise<Document> {
    return this.api.GET<Document>(`${this.base}/${id}`);
  }

  create(dto: CreateDocumentDto): Promise<Document> {
    return this.api.POST<Document>(this.base, dto);
  }

  update(id: number, dto: UpdateDocumentDto): Promise<Document> {
    return this.api.POST<Document>(`${this.base}/${id}/update`, dto);
  }

  remove(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/${id}/delete`, {});
  }
}
