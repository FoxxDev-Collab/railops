"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { createCheckoutSession, createCustomerPortalSession } from "@/lib/stripe";
import { db } from "@/lib/db";

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
    },
  });

  return user;
}
