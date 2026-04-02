import { db } from "@/lib/db";

interface LogErrorParams {
  level?: "error" | "warn" | "fatal";
  message: string;
  stack?: string;
  source?: "server-action" | "api-route" | "middleware";
  action?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Logs an error to the ErrorLog table. Fire-and-forget — never blocks the caller.
 */
export function logError({
  level = "error",
  message,
  stack,
  source,
  action,
  userId,
  metadata,
}: LogErrorParams): void {
  db.errorLog
    .create({
      data: {
        level,
        message,
        stack,
        source,
        action,
        userId,
        metadata: metadata ? (metadata as object) : undefined,
      },
    })
    .catch((err) => {
      console.error("[ERROR_LOG] Failed to log error:", err);
    });
}
