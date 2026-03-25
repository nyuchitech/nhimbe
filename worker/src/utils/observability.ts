/**
 * Structured logging with [mukoko] prefix — backend version.
 * Mirrors the frontend observability pattern from the Mukoko registry.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  module?: string;
  data?: Record<string, unknown>;
  error?: Error;
  traceId?: string;
}

function formatPrefix(level: LogLevel, module?: string): string {
  const tag = module ? `[mukoko:${module}]` : "[mukoko]";
  return `${tag} ${level.toUpperCase()}`;
}

function emit(level: LogLevel, message: string, ctx?: LogContext) {
  const prefix = formatPrefix(level, ctx?.module);
  const parts: unknown[] = [`${prefix} ${message}`];

  if (ctx?.traceId) parts.push(`[trace:${ctx.traceId}]`);
  if (ctx?.data) parts.push(JSON.stringify(ctx.data));
  if (ctx?.error) parts.push(ctx.error.message);

  const logFn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  logFn(...parts);
}

export const log = {
  debug: (message: string, ctx?: LogContext) => emit("debug", message, ctx),
  info: (message: string, ctx?: LogContext) => emit("info", message, ctx),
  warn: (message: string, ctx?: LogContext) => emit("warn", message, ctx),
  error: (message: string, ctx?: LogContext) => emit("error", message, ctx),
};

export function createLogger(module: string) {
  return {
    debug: (message: string, ctx?: Omit<LogContext, "module">) => log.debug(message, { ...ctx, module }),
    info: (message: string, ctx?: Omit<LogContext, "module">) => log.info(message, { ...ctx, module }),
    warn: (message: string, ctx?: Omit<LogContext, "module">) => log.warn(message, { ...ctx, module }),
    error: (message: string, ctx?: Omit<LogContext, "module">) => log.error(message, { ...ctx, module }),
  };
}

export function trackError(error: unknown, ctx?: LogContext) {
  const err = error instanceof Error ? error : new Error(String(error));
  log.error(err.message, { ...ctx, error: err });
}

export async function measure<T>(
  label: string,
  fn: () => T | Promise<T>,
  ctx?: LogContext
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    log.info(`${label} completed in ${duration}ms`, {
      ...ctx,
      module: ctx?.module ?? "perf",
      data: { ...ctx?.data, duration, label },
    });
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    log.error(`${label} failed after ${duration}ms`, {
      ...ctx,
      module: ctx?.module ?? "perf",
      data: { ...ctx?.data, duration, label },
      error: error instanceof Error ? error : new Error(String(error)),
    });
    throw error;
  }
}
