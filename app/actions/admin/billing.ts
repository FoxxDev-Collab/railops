"use server";

import { adminAuth } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await adminAuth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function getRevenueStats() {
  await requireAdmin();

  const [totalUsers, freeUsers, proUsers, recentSignups] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { plan: "FREE" } }),
    db.user.count({ where: { plan: "PRO" } }),
    db.user.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      select: { id: true, email: true, plan: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const mrr = proUsers * 5; // $5/mo per Pro subscriber

  return {
    totalUsers,
    freeUsers,
    proUsers,
    mrr,
    recentSignups,
  };
}

export async function adminCancelSubscription(userId: string) {
  const session = await requireAdmin();

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found" };

  if (user.stripeSubId) {
    try {
      const { getStripeClient } = await import("@/lib/stripe");
      const stripe = await getStripeClient();
      await stripe.subscriptions.cancel(user.stripeSubId);
    } catch (error) {
      console.error("Failed to cancel Stripe subscription:", error);
    }
  }

  await db.user.update({
    where: { id: userId },
    data: { plan: "FREE", stripeSubId: null, planExpiresAt: null },
  });

  await logAudit({
    action: "billing.admin.cancel",
    adminId: session.user.id,
    adminEmail: session.user.email!,
    entityType: "User",
    entityId: userId,
    metadata: { email: user.email, previousPlan: user.plan },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { success: true };
}

export async function adminGrantPlan(userId: string) {
  const session = await requireAdmin();

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found" };

  await db.user.update({
    where: { id: userId },
    data: { plan: "PRO", planExpiresAt: null },
  });

  await logAudit({
    action: "billing.admin.grant",
    adminId: session.user.id,
    adminEmail: session.user.email!,
    entityType: "User",
    entityId: userId,
    metadata: { email: user.email, grantedPlan: "PRO" as const },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { success: true };
}
