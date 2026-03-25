type LogLevel = "debug" | "info" | "warn" | "error"

interface LogContext {
  /** Module or component name (e.g., "registry", "weather-chart") */
  module?: string
  /** Additional structured data */
  data?: Record<string, unknown>
  /** Error object if applicable */
  error?: Error
  /** Unique identifier for tracing (e.g., request ID, session ID) */
  traceId?: string
}

const LOG_METHODS: Record<LogLevel, (...args: unknown[]) => void> = {
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
}

function formatPrefix(level: LogLevel, module?: string): string {
  const tag = module ? `[mukoko:${module}]` : "[mukoko]"
  return `${tag} ${level.toUpperCase()}`
}

/**
 * Structured logger with [mukoko] prefix.
 *
 * @example
 * ```ts
 * import { log } from "@/lib/observability"
 *
 * log.info("Server started", { module: "api", data: { port: 3000 } })
 * log.error("Failed to fetch", { module: "weather", error: new Error("timeout") })
 * log.warn("Cache miss", { module: "registry", traceId: "req-123" })
 * ```
 */
export const log = {
  debug(message: string, ctx?: LogContext) {
    emit("debug", message, ctx)
  },
  info(message: string, ctx?: LogContext) {
    emit("info", message, ctx)
  },
  warn(message: string, ctx?: LogContext) {
    emit("warn", message, ctx)
  },
  error(message: string, ctx?: LogContext) {
    emit("error", message, ctx)
  },
}

function emit(level: LogLevel, message: string, ctx?: LogContext) {
  const prefix = formatPrefix(level, ctx?.module)
  const parts: unknown[] = [`${prefix} ${message}`]

  if (ctx?.traceId) {
    parts.push(`[trace:${ctx.traceId}]`)
  }
  if (ctx?.data) {
    parts.push(ctx.data)
  }
  if (ctx?.error) {
    parts.push(ctx.error)
  }

  LOG_METHODS[level](...parts)
}

/**
 * Measure execution time of a sync or async function.
 *
 * @example
 * ```ts
 * import { measure } from "@/lib/observability"
 *
 * const result = await measure("fetch-weather", async () => {
 *   return await fetch("/api/weather")
 * })
 *
 * // Logs: [mukoko] PERF fetch-weather completed in 142ms
 * ```
 */
export async function measure<T>(
  label: string,
  fn: () => T | Promise<T>,
  ctx?: LogContext
): Promise<T> {
  const start = performance.now()
  try {
    const result = await fn()
    const duration = Math.round(performance.now() - start)
    log.info(`${label} completed in ${duration}ms`, {
      ...ctx,
      module: ctx?.module ?? "perf",
      data: { ...ctx?.data, duration, label },
    })
    return result
  } catch (error) {
    const duration = Math.round(performance.now() - start)
    log.error(`${label} failed after ${duration}ms`, {
      ...ctx,
      module: ctx?.module ?? "perf",
      data: { ...ctx?.data, duration, label },
      error: error instanceof Error ? error : new Error(String(error)),
    })
    throw error
  }
}

/**
 * Track an error with structured context, without throwing.
 *
 * @example
 * ```ts
 * import { trackError } from "@/lib/observability"
 *
 * try {
 *   await riskyOperation()
 * } catch (error) {
 *   trackError(error, { module: "checkout", data: { userId: "123" } })
 * }
 * ```
 */
export function trackError(error: unknown, ctx?: LogContext) {
  const err = error instanceof Error ? error : new Error(String(error))
  log.error(err.message, { ...ctx, error: err })
}

/**
 * Create a scoped logger bound to a specific module.
 *
 * @example
 * ```ts
 * import { createLogger } from "@/lib/observability"
 *
 * const logger = createLogger("registry")
 * logger.info("Component served", { data: { name: "button" } })
 * // Logs: [mukoko:registry] INFO Component served { name: "button" }
 *
 * logger.error("File not found", { error: new Error("ENOENT") })
 * // Logs: [mukoko:registry] ERROR File not found Error: ENOENT
 * ```
 */
export function createLogger(module: string) {
  return {
    debug(message: string, ctx?: Omit<LogContext, "module">) {
      log.debug(message, { ...ctx, module })
    },
    info(message: string, ctx?: Omit<LogContext, "module">) {
      log.info(message, { ...ctx, module })
    },
    warn(message: string, ctx?: Omit<LogContext, "module">) {
      log.warn(message, { ...ctx, module })
    },
    error(message: string, ctx?: Omit<LogContext, "module">) {
      log.error(message, { ...ctx, module })
    },
  }
}
