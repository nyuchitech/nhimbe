import type { Env } from "../types";
import { generateId } from "./ids";

export type AuditAction =
  | "event.created"
  | "event.updated"
  | "event.deleted"
  | "event.cancelled"
  | "user.created"
  | "user.updated"
  | "user.deleted"
  | "user.suspended"
  | "user.activated"
  | "user.role_changed"
  | "registration.created"
  | "registration.cancelled"
  | "registration.status_changed"
  | "admin.index_events";

export async function logAudit(
  env: Env,
  params: {
    actorId?: string;
    action: AuditAction;
    resourceType: string;
    resourceId: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
  }
): Promise<void> {
  try {
    await env.DB.prepare(`
      INSERT INTO audit_logs (id, actor_id, action, resource_type, resource_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      generateId(),
      params.actorId || null,
      params.action,
      params.resourceType,
      params.resourceId,
      params.details ? JSON.stringify(params.details) : null,
      params.ipAddress || null
    ).run();
  } catch (error) {
    // Audit logging should never break the main flow
    console.error("[mukoko:audit] Failed to log audit event:", error);
  }
}
