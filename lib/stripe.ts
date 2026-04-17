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

/**
 * Updates the seat line-item quantity on an existing Pro subscription.
 *
 * Proration behavior:
 *   - 'always_invoice' (use on add): Stripe generates and pays a prorated invoice
 *     immediately for the remaining days in the current period.
 *   - 'create_prorations' (use on remove): Stripe credits unused time as a proration
 *     item that reduces the next invoice; quantity drops immediately.
 */
export async function updateSeatQuantity(
  stripeSubId: string,
  newQuantity: number,
  prorationBehavior: "always_invoice" | "create_prorations"
): Promise<void> {
  const stripe = await getStripeClient();
  const seatPriceId = await getSetting("stripe.seatPriceId");
  if (!seatPriceId) throw new Error("Stripe Seat price ID not configured.");

  const subscription = await stripe.subscriptions.retrieve(stripeSubId, {
    expand: ["items.data"],
  });

  const seatItem = subscription.items.data.find(
    (item) => item.price.id === seatPriceId
  );

  if (!seatItem) {
    // Create the line item if it doesn't exist yet (handles the quantity:0 checkout fallback)
    await stripe.subscriptionItems.create({
      subscription: stripeSubId,
      price: seatPriceId,
      quantity: newQuantity,
      proration_behavior: prorationBehavior,
    });
    return;
  }

  await stripe.subscriptionItems.update(seatItem.id, {
    quantity: newQuantity,
    proration_behavior: prorationBehavior,
  });
}

/**
 * Reads the current seat line-item quantity from the live subscription.
 * Returns 0 if no seat line item exists.
 */
export async function getSubscriptionSeatQuantity(
  stripeSubId: string
): Promise<number> {
  const stripe = await getStripeClient();
  const seatPriceId = await getSetting("stripe.seatPriceId");
  if (!seatPriceId) return 0;

  const subscription = await stripe.subscriptions.retrieve(stripeSubId, {
    expand: ["items.data"],
  });

  const seatItem = subscription.items.data.find(
    (item) => item.price.id === seatPriceId
  );

  return seatItem?.quantity ?? 0;
}
