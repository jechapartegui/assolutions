import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { Note, CreateNoteDto, UpdateNoteDto } from '@shared/lib/note.interface';

@Injectable({ providedIn: 'root' })
export class NoteApiService {
  private readonly base = '/notes';

  constructor(private api: ApiClientService) {}

  listMine(): Promise<Note[]> {
    return this.api.GET<Note[]>(this.base);
  }

  get(id: number): Promise<Note> {
    return this.api.GET<Note>(`${this.base}/${id}`);
  }

  create(dto: CreateNoteDto): Promise<Note> {
    return this.api.POST<Note>(this.base, dto);
  }

  update(id: number, dto: UpdateNoteDto): Promise<Note> {
    return this.api.POST<Note>(`${this.base}/${id}/update`, dto);
  }

  remove(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/${id}/delete`, {});
  }
}
