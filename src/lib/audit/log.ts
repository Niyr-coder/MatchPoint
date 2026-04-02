import { createServiceClient } from "@/lib/supabase/server"

/**
 * Audit log entry shape — mirrors the `audit_log` table from migration 030.
 * `entity_id` is typed as string (UUID) but stored as UUID in the DB; the
 * service client accepts strings for UUID columns.
 */
export interface AuditEntry {
  /** Descriptive action name, e.g. "user.created", "club.deleted" */
  action: string
  /** Table / domain being acted on, e.g. "users", "clubs" */
  entityType?: string
  /** Primary key of the affected row */
  entityId?: string
  /** UUID of the admin performing the action */
  actorId: string
  /** Arbitrary context — never include PII or secrets */
  details?: Record<string, unknown>
}

/**
 * Inserts a row into `audit_log` via the service-role client.
 *
 * This function NEVER throws. Audit failures are logged server-side but must
 * not block or roll back the primary operation.
 */
export async function logAdminAction(entry: AuditEntry): Promise<void> {
  try {
    const supabase = createServiceClient()

    const { error } = await supabase.from("audit_log").insert({
      action: entry.action,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId ?? null,
      actor_id: entry.actorId,
      details: entry.details ?? {},
    })

    if (error) {
      console.error("[audit_log] insert failed:", error.message, { entry })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[audit_log] unexpected error:", message, { entry })
  }
}
