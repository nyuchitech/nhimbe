import type { PaymentProvider, CreatePaymentParams, PaymentResult, PaymentStatus, WebhookResult } from "./types";

/**
 * Paynow payment provider for Zimbabwean mobile money.
 * Supports EcoCash, OneMoney, Telecash, Visa, Mastercard.
 *
 * TODO: Implement when Paynow API credentials are available.
 * This is the provider abstraction — swap implementations as needed.
 */
export class PaynowProvider implements PaymentProvider {
  name = "paynow";
  private integrationId: string;
  private integrationKey: string;

  constructor(integrationId: string, integrationKey: string) {
    this.integrationId = integrationId;
    this.integrationKey = integrationKey;
  }

  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    // TODO: Implement Paynow API call
    console.log(`[mukoko:payments] Paynow createPayment: ${params.reference} for ${params.amount} ${params.currency}`);
    void this.integrationId;
    void this.integrationKey;
    return { success: false, error: "Payment provider not yet configured" };
  }

  async checkStatus(_reference: string): Promise<PaymentStatus> {
    return "pending";
  }

  async handleWebhook(_payload: unknown): Promise<WebhookResult> {
    return { valid: false };
  }
}
