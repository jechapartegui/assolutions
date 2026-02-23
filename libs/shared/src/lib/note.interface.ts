export interface Note {
  id: number;
  account_id: number;

  object_id: number;
  object_type: string; // max 50
}

export type CreateNoteDto = Omit<Note, 'id' | 'account_id'>;
export type UpdateNoteDto = Partial<Omit<Note, 'id' | 'account_id'>>;
