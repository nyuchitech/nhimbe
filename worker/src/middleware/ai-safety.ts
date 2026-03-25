import { createMiddleware } from "hono/factory";
import type { Env } from "../types";

/**
 * AI safety middleware — Mukoko mandatory pattern.
 * Validates and sanitizes user input before sending to AI models.
 * Detects prompt injection attempts and blocks malicious patterns.
 */

// Patterns that attempt to override system prompts or extract instructions
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)/i,
  /you\s+are\s+now\s+(a|an|the)\s/i,
  /forget\s+(all\s+)?(your|previous)\s+(instructions|training|rules)/i,
  /system\s*prompt/i,
  /\bDAN\b.*\bjailbreak\b/i,
  /pretend\s+(to\s+be|you\s+are)/i,
  /act\s+as\s+(if|though)\s+you/i,
  /reveal\s+(your|the)\s+(system|initial)\s+(prompt|instructions)/i,
  /what\s+(are|were)\s+your\s+(instructions|initial\s+prompt)/i,
  /\[\s*SYSTEM\s*\]/i,
  /\<\s*\|?\s*system\s*\|?\s*\>/i,
];

// Maximum input length to prevent resource exhaustion
const MAX_INPUT_LENGTH = 5000;

function detectInjection(input: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(input));
}

function sanitizeInput(input: string): string {
  // Trim to max length
  let sanitized = input.substring(0, MAX_INPUT_LENGTH);
  // Remove control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  return sanitized.trim();
}

/**
 * Middleware that validates AI route inputs.
 * Checks request body for prompt injection and sanitizes.
 */
export const aiSafety = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  if (c.req.method !== "POST") {
    await next();
    return;
  }

  try {
    const body = await c.req.json();
    const fieldsToCheck = ["message", "query", "prompt", "description", "input", "text"];

    for (const field of fieldsToCheck) {
      const value = body[field];
      if (typeof value === "string" && value.length > 0) {
        if (detectInjection(value)) {
          return c.json({ error: "Input contains disallowed patterns" }, 400);
        }
        // Sanitize in place
        body[field] = sanitizeInput(value);
      }
    }

    // Also check messages array (for chat-style endpoints)
    if (Array.isArray(body.messages)) {
      for (const msg of body.messages) {
        if (typeof msg.content === "string" && detectInjection(msg.content)) {
          return c.json({ error: "Input contains disallowed patterns" }, 400);
        }
      }
    }
  } catch {
    // If body parse fails, let the route handler deal with it
  }

  await next();
});
