export interface PaymentProvider {
  name: string;
  createPayment(params: CreatePaymentParams): Promise<PaymentResult>;
  checkStatus(reference: string): Promise<PaymentStatus>;
  handleWebhook(payload: unknown): Promise<WebhookResult>;
}

export interface CreatePaymentParams {
  amount: number;
  currency: string;
  reference: string;
  description: string;
  returnUrl: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface PaymentResult {
  success: boolean;
  providerReference?: string;
  redirectUrl?: string;
  error?: string;
}

export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

export interface WebhookResult {
  valid: boolean;
  reference?: string;
  status?: PaymentStatus;
}
