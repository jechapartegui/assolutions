export interface MailAddressVm {
  email: string;
  name?: string | null;
}

export interface OutgoingMessageVm {
  to: MailAddressVm;
  subject: string;
  html: string;

  cc?: MailAddressVm[];
  bcc?: MailAddressVm[];

  /**
   * Identifiant métier libre pour tracer l'origine :
   * ex: "adherent:123", "seance:456", "facture:789"
   */
  record?: string | null;
}

export interface SendMessagesDto {
  messages: OutgoingMessageVm[];
}

export interface SentMessageResultVm {
  to: string;
  subject: string;
  success: boolean;
  error?: string | null;
}

export interface SendMessagesResultVm {
  total: number;
  sent: number;
  failed: number;
  results: SentMessageResultVm[];
}