"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  createCheckoutSession,
  createCustomerPortalSession,
  updateSeatQuantity,
} from "@/lib/stripe";
import { db } from "@/lib/db";
import {
  BASE_SEATS_PRO,
  MAX_EXTRA_SEATS,
  MAX_TOTAL_CREW,
  checkRailroadLimit,
  checkTotalItemLimit,
} from "@/lib/limits";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

export async function startCheckout() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { stripeCustomerId: true, email: true },
  });

  if (!user) throw new Error("User not found");

  const url = await createCheckoutSession(
    session.user.id,
    user.email,
    user.stripeCustomerId
  );

  redirect(url);
}

export async function openCustomerPortal() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    throw new Error("No Stripe customer found. Please subscribe first.");
  }

  const url = await createCustomerPortalSession(user.stripeCustomerId);
  redirect(url);
}

export async function purchaseSeat() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true, purchasedSeats: true, stripeSubId: true },
  });

  if (!user) throw new Error("User not found");
  if (user.plan !== "PRO") {
    throw new Error("Upgrade to Pro before adding seats.");
  }
  if (!user.stripeSubId) {
    throw new Error("No active subscription found.");
  }
  if (user.purchasedSeats >= MAX_EXTRA_SEATS) {
    throw new Error(`Crew capped at ${MAX_TOTAL_CREW}. Contact support if you need more.`);
  }

  await updateSeatQuantity(
    user.stripeSubId,
    user.purchasedSeats + 1,
    "always_invoice"
  );

  await logAudit({
    action: "billing.seat.purchased",
    adminId: session.user.id,
    adminEmail: session.user.email ?? "",
    entityType: "User",
    entityId: session.user.id,
    metadata: { newSeatCount: user.purchasedSeats + 1 },
  });

  // DB row updates via webhook. Revalidate paths so fresh data appears after webhook fires.
  revalidatePath("/dashboard/billing");
  redirect("/dashboard/billing?seat=added");
}

export async function removeSeat() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true, purchasedSeats: true, stripeSubId: true, id: true },
  });

  if (!user) throw new Error("User not found");
  if (user.plan !== "PRO") {
    throw new Error("Not on Pro plan.");
  }
  if (!user.stripeSubId) {
    throw new Error("No active subscription found.");
  }
  if (user.purchasedSeats <= 0) {
    throw new Error("No purchased seats to remove.");
  }

  // Guard: don't allow removing a seat if all seats are currently occupied.
  const newLimit = Math.min(
    BASE_SEATS_PRO + (user.purchasedSeats - 1),
    MAX_TOTAL_CREW
  );
  const used = await db.crewMember.findMany({
    where: { layout: { userId: user.id }, removedAt: null },
    distinct: ["userId"],
    select: { userId: true },
  });
  if (used.length > newLimit) {
    throw new Error("Remove a crew member first — all seats are currently occupied.");
  }

  await updateSeatQuantity(
    user.stripeSubId,
    user.purchasedSeats - 1,
    "create_prorations"
  );

  await logAudit({
    action: "billing.seat.removed",
    adminId: session.user.id,
    adminEmail: session.user.email ?? "",
    entityType: "User",
    entityId: session.user.id,
    metadata: { newSeatCount: user.purchasedSeats - 1 },
  });

  revalidatePath("/dashboard/billing");
  redirect("/dashboard/billing?seat=removed");
}

export async function getBillingOverview() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      plan: true,
      stripeCustomerId: true,
      stripeSubId: true,
      planExpiresAt: true,
      purchasedSeats: true,
    },
  });

  if (!user) throw new Error("User not found");

  const totalSeats = user.plan === "PRO"
    ? Math.min(BASE_SEATS_PRO + user.purchasedSeats, MAX_TOTAL_CREW)
    : 0;

  // Count crew seats used across ALL of this owner's layouts
  const used = user.plan === "PRO"
    ? await db.crewMember.findMany({
        where: { layout: { userId: session.user.id }, removedAt: null },
        distinct: ["userId"],
        select: { userId: true },
      })
    : [];
  const seatsUsed = used.length;

  const [layoutsCheck, itemsCheck] = await Promise.all([
    checkRailroadLimit(session.user.id),
    checkTotalItemLimit(session.user.id),
  ]);

  return {
    plan: user.plan,
    renewalDate: user.planExpiresAt,
    stripeSubId: user.stripeSubId,
    purchasedSeats: user.purchasedSeats,
    totalSeats,
    seatsUsed,
    seatsAvailable: Math.max(0, totalSeats - seatsUsed),
    canAddSeat: user.plan === "PRO" && user.purchasedSeats < MAX_EXTRA_SEATS,
    canRemoveSeat: user.plan === "PRO" && user.purchasedSeats > 0,
    usage: {
      layouts: { current: layoutsCheck.current, limit: layoutsCheck.limit },
      items: { current: itemsCheck.current, limit: itemsCheck.limit },
    },
  };
}

export async function getUserBillingInfo() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      plan: true,
      stripeCustomerId: true,
      stripeSubId: true,
      planExpiresAt: true,
      purchasedSeats: true,
    },
  });

  return user;
}
