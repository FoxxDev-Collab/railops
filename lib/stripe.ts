import Stripe from "stripe";
import { getSetting } from "@/lib/settings";

let stripeInstance: Stripe | null = null;
let stripeKeyHash: string | null = null;

/**
 * Returns a Stripe client initialized from DB settings (with env fallback).
 * Caches the instance until the secret key changes.
 */
export async function getStripeClient(): Promise<Stripe> {
  const secretKey = await getSetting("stripe.secretKey");

  if (!secretKey) {
    throw new Error(
      "Stripe secret key not configured. Set it in Admin → System Settings or STRIPE_SECRET_KEY env var."
    );
  }

  // Reuse instance if key hasn't changed
  if (stripeInstance && stripeKeyHash === secretKey) {
    return stripeInstance;
  }

  stripeInstance = new Stripe(secretKey, {
    apiVersion: "2026-03-25.dahlia",
    typescript: true,
  });
  stripeKeyHash = secretKey;
  return stripeInstance;
}

/**
 * Creates a Stripe Checkout session for the Pro plan.
 * Includes both the base Pro line item and the seat add-on (initial quantity 0).
 */
export async function createCheckoutSession(
  userId: string,
  userEmail: string,
  customerId?: string | null
): Promise<string> {
  const stripe = await getStripeClient();
  const [priceId, seatPriceId, appUrl] = await Promise.all([
    getSetting("stripe.proPriceId"),
    getSetting("stripe.seatPriceId"),
    getSetting("app.url"),
  ]);

  if (!priceId) {
    throw new Error("Stripe Pro price ID not configured.");
  }
  if (!seatPriceId) {
    throw new Error("Stripe Seat price ID not configured.");
  }

  const resolvedAppUrl = appUrl ?? "http://localhost:3000";

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      { price: priceId, quantity: 1 },
      { price: seatPriceId, quantity: 0, adjustable_quantity: { enabled: false } },
    ],
    success_url: `${resolvedAppUrl}/dashboard/billing?success=true`,
    cancel_url: `${resolvedAppUrl}/dashboard/billing?canceled=true`,
    client_reference_id: userId,
    metadata: { userId },
  };

  if (customerId) {
    sessionParams.customer = customerId;
  } else {
    sessionParams.customer_email = userEmail;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  return session.url!;
}

/**
 * Creates a Stripe Customer Portal session for subscription management.
 */
export async function createCustomerPortalSession(
  customerId: string
): Promise<string> {
  const stripe = await getStripeClient();
  const appUrl = await getSetting("app.url") ?? "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/dashboard/billing`,
  });

  return session.url;
}
