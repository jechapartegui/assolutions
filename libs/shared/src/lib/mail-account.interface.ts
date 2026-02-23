export interface MailAccount {
  id: number;

  label: string;

  host?: string;
  port?: number;
  secure?: boolean;

  username: string;
  password_enc: string;

  from_email: string;
  from_name?: string | null;

  max_per_minute?: number;
}

export type CreateMailAccountDto = MailAccount; // ton Create DTO exige id + tout (comme back)
export type UpdateMailAccountDto = Partial<Omit<MailAccount, 'id'>>;
