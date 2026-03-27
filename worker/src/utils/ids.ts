export function generateId(): string {
  return crypto.randomUUID();
}

// Unbiased random character selection using rejection sampling.
// Avoids modulo bias by discarding values >= the largest multiple of charset length.
function randomChar(chars: string): string {
  const range = 256 - (256 % chars.length);
  let byte: number;
  do {
    byte = crypto.getRandomValues(new Uint8Array(1))[0];
  } while (byte >= range);
  return chars.charAt(byte % chars.length);
}

export function generateShortCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += randomChar(chars);
  }
  return result;
}

export function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += randomChar(chars);
  }
  return result;
}

export function generateHandle(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += randomChar(chars);
  }
  return `@${base}${suffix}`;
}
