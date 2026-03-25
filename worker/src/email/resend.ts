/**
 * Resend email client — fetch-based for Cloudflare Workers.
 * No SDK needed; uses the Resend REST API directly.
 */

interface SendEmailParams {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

interface ResendResponse {
  id: string;
}

interface ResendError {
  statusCode: number;
  message: string;
  name: string;
}

export async function sendEmail(
  apiKey: string,
  params: SendEmailParams
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: params.from,
        to: Array.isArray(params.to) ? params.to : [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
        reply_to: params.replyTo,
      }),
    });

    if (!response.ok) {
      const error = await response.json() as ResendError;
      console.error(`[mukoko:email] Resend API error: ${error.message}`);
      return { success: false, error: error.message };
    }

    const data = await response.json() as ResendResponse;
    console.log(`[mukoko:email] Email sent successfully: ${data.id}`);
    return { success: true, id: data.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[mukoko:email] Failed to send email: ${message}`);
    return { success: false, error: message };
  }
}
