export interface MailRecord {
  id: number;
  project_id: number;

  record: string;
  to: string;
  subject: string;
}

export type CreateMailRecordDto = Omit<MailRecord, 'id' | 'project_id'>;
export type UpdateMailRecordDto = Partial<Omit<MailRecord, 'id' | 'project_id'>>;
