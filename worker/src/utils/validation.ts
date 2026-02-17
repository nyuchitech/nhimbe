// Safe integer parsing with bounds
export function safeParseInt(value: string | null, defaultValue: number, min: number = 0, max: number = 1000): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return defaultValue;
  return Math.min(Math.max(parsed, min), max);
}

// Validate required string fields
export function validateRequiredFields(obj: Record<string, unknown>, fields: string[]): string | null {
  for (const field of fields) {
    if (!obj[field] || (typeof obj[field] === 'string' && !(obj[field] as string).trim())) {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

// Safe JSON parse with error handling
export function safeParseJSON(value: string | null, defaultValue: unknown = []): unknown {
  if (!value) return defaultValue;
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-")
    .trim();
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}
