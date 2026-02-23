export interface Document {
  id: number;

  titre: string;
  objet_id: number;
  objet_type: string;   // max 25
  typedoc: string;      // max 25
  storage_type: string; // enum DB (string)
  mimetype: string;

  file_path?: string | null;
  commentaire?: string | null;
  auteur?: string | null;
}

export type CreateDocumentDto = Omit<Document, 'id'>;
export type UpdateDocumentDto = Partial<Omit<Document, 'id'>>;
