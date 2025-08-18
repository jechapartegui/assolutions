export class MailInput  {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  headers?: Record<string, string>;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType?: string;
  }>;
};