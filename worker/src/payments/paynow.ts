import type { PaymentProvider, CreatePaymentParams, PaymentResult, PaymentStatus, WebhookResult } from "./types";

/**
 * Paynow payment provider for Zimbabwean mobile money.
 * Supports EcoCash, OneMoney, Telecash, Visa, Mastercard.
 *
 * Paynow webhook payloads include an HMAC hash field computed over the
 * concatenated values (sorted by key) using the integration key as the
 * HMAC-SHA512 secret. We verify this before trusting the payload.
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
    console.log(`[mukoko:payments] Paynow createPayment: ${params.reference} for ${params.amount} ${params.currency}`);
    void this.integrationId;
    void this.integrationKey;
    return { success: false, error: "Payment provider not yet configured" };
  }

  async checkStatus(_reference: string): Promise<PaymentStatus> {
    return "pending";
  }

  /**
   * Verify Paynow webhook HMAC signature and extract payment status.
   *
   * Paynow sends a URL-encoded body with fields including a `hash` field.
   * The hash is HMAC-SHA512 of all other field values concatenated
   * (sorted alphabetically by key), using the integration key as secret.
   */
  async handleWebhook(payload: unknown): Promise<WebhookResult> {
    if (!payload || typeof payload !== "object") {
      return { valid: false };
    }

    const data = payload as Record<string, string>;
    const receivedHash = data.hash;

    if (!receivedHash) {
      return { valid: false };
    }

    // Build the string to hash: values of all fields except 'hash', sorted by key
    const fieldsToHash = Object.keys(data)
      .filter((k) => k.toLowerCase() !== "hash")
      .sort()
      .map((k) => data[k])
      .join("");

    const isValid = await this.verifyHmac(fieldsToHash, receivedHash);
    if (!isValid) {
      console.warn("[mukoko:payments] Paynow webhook HMAC verification failed");
      return { valid: false };
    }

    // Map Paynow status to our status
    const paynowStatus = (data.status || "").toLowerCase();
    let status: PaymentStatus;
    switch (paynowStatus) {
      case "paid":
      case "awaiting delivery":
      case "delivered":
        status = "completed";
        break;
      case "refunded":
        status = "refunded";
        break;
      case "cancelled":
      case "disputed":
      case "failed":
        status = "failed";
        break;
      default:
        status = "pending";
    }

    return {
      valid: true,
      reference: data.reference || data.paynowreference,
      status,
    };
  }

  private async verifyHmac(message: string, expectedHash: string): Promise<boolean> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(this.integrationKey),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
    const computedHash = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();

    // Timing-safe comparison (timingSafeEqual available in Workers runtime)
    const upperExpected = expectedHash.toUpperCase();
    if (computedHash.length !== upperExpected.length) return false;
    const a = encoder.encode(computedHash);
    const b = encoder.encode(upperExpected);
    if (typeof crypto.subtle.timingSafeEqual === "function") {
      return crypto.subtle.timingSafeEqual(a, b);
    }
    // Fallback for environments without timingSafeEqual (constant-time via XOR)
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= a[i] ^ b[i];
    }
    return diff === 0;
  }
}
