import { db } from "@/lib/db";

/**
 * Tracks a user activity event. Fire-and-forget — never blocks the caller.
 */
export function trackActivity(
  userId: string,
  action: string,
  metadata?: Record<string, unknown>
): void {
  db.userActivity
    .create({
      data: {
        userId,
        action,
        metadata: metadata ? (metadata as object) : undefined,
      },
    })
    .catch((error) => {
      console.error("[ACTIVITY] Failed to track:", action, error);
    });
}
