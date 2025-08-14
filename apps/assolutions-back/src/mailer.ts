
import nodemailer from 'nodemailer';

export function createTransport() {
  const host = process.env.SMTP_HOST ?? 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = (process.env.SMTP_SECURE ?? 'false') === 'true';

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,               // false pour 587 (STARTTLS)
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
    pool: true,           // pooling pour de meilleurs perfs
    maxConnections: 3,
    maxMessages: 100,
    tls: { ciphers: 'TLSv1.2' },
  });

  return transporter;
}

export type MailInput = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  headers?: Record<string, string>;
  attachments?: Array<{   // optionnel
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
};

export async function sendMail(input: MailInput) {
  const transporter = createTransport();
  const from = input.from ?? process.env.MAIL_FROM ?? process.env.SMTP_USER!;

  const info = await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    headers: input.headers,
    attachments: input.attachments,
  });

  return info; // info.messageId, etc.
}
