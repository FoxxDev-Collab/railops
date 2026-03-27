import { db } from "@/lib/db";

interface LogAuditParams {
  action: string;
  adminId: string;
  adminEmail: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Logs an admin action to the audit trail.
 * Call this from server actions after mutations.
 */
export async function logAudit({
  action,
  adminId,
  adminEmail,
  entityType,
  entityId,
  metadata,
  ipAddress,
}: LogAuditParams): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        action,
        adminId,
        adminEmail,
        entityType,
        entityId,
        metadata: metadata ? (metadata as object) : undefined,
        ipAddress,
      },
    });
  } catch (error) {
    // Audit logging should never break the primary operation
    console.error("[AUDIT] Failed to log:", action, error);
  }
}
