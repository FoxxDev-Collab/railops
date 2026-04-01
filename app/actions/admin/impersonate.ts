"use server";

import { signIn } from "@/auth";
import { adminAuth } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { logAudit } from "@/lib/audit";
import { redirect } from "next/navigation";

async function requireAdmin() {
  const session = await adminAuth();
  if (!session?.user) throw new Error("Unauthorized");

  // Must be a real admin — impersonating sessions cannot call admin actions
  if (session.user.role !== "ADMIN" || session.user.impersonatingFrom) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function startImpersonation(targetUserId: string) {
  const session = await requireAdmin();

  // Can't impersonate yourself
  if (session.user.id === targetUserId) {
    return { error: "Cannot impersonate yourself" };
  }

  // Can't impersonate if already impersonating
  if (session.user.impersonatingFrom) {
    return { error: "Already impersonating a user. Stop first." };
  }

  const targetUser = await db.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true, name: true },
  });

  if (!targetUser) return { error: "User not found" };

  // Set the impersonation cookie
  const cookieStore = await cookies();
  cookieStore.set("impersonate_target", targetUserId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60, // 1 hour max
  });

  await logAudit({
    action: "impersonate.start",
    adminId: session.user.id,
    adminEmail: session.user.email!,
    entityType: "User",
    entityId: targetUserId,
    metadata: { targetEmail: targetUser.email },
  });

  redirect("/dashboard");
}

export async function stopImpersonation() {
  const session = await adminAuth();
  if (!session?.user) throw new Error("Unauthorized");

  const adminId = session.user.impersonatingFrom ?? session.user.id;

  // Clear the impersonation cookie
  const cookieStore = await cookies();
  cookieStore.delete("impersonate_target");

  await logAudit({
    action: "impersonate.stop",
    adminId,
    adminEmail: "admin",
    entityType: "User",
    entityId: session.user.id,
  });

  redirect("/admin/users");
}
