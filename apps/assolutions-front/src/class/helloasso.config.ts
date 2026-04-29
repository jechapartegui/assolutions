// helloasso.config.ts
export interface HelloAssoConfig {
  baseUrl: string; // https://api.helloasso.com/v5 ou sandbox
  oauthUrl: string; // https://api.helloasso.com/oauth2/token ou sandbox
  clientId: string;
  clientSecret: string;
  organizationSlug: string;
  returnUrl: string;
  backUrl: string;
  errorUrl: string;
  webhookSignatureKey?: string; // utile surtout si partenaire
  webhookAllowedIps?: string[]; // optionnel
}