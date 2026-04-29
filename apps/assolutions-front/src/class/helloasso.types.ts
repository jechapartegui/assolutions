// helloasso.types.ts
export interface HelloAssoPayer {
  firstName: string;
  lastName: string;
  email: string;
  address?: string;
  city?: string;
  zipCode?: string;
  country?: string;
  dateOfBirth?: string;
}

export interface HelloAssoCheckoutIntentRequest {
  totalAmount: number;
  initialAmount: number;
  itemName: string;
  backUrl: string;
  errorUrl: string;
  returnUrl: string;
  containsDonation: boolean;
  payer?: HelloAssoPayer;
  metadata?: Record<string, any>;
  terms?: Array<{
    amount: number;
    date: string;
  }>;
}

export interface HelloAssoCheckoutIntentResponse {
  id?: string;
  checkoutIntentId?: string;
  redirectUrl: string;
  metadata?: Record<string, any>;
}

export interface HelloAssoCheckoutIntentDetails {
  id?: string;
  checkoutIntentId?: string;
  state?: string;
  order?: {
    id?: number | string;
    date?: string;
  };
  payments?: Array<any>;
  metadata?: Record<string, any>;
}