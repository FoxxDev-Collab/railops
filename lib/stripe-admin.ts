import { getStripeClient } from "@/lib/stripe";
import { getSetting } from "@/lib/settings";
import type Stripe from "stripe";

// ─── Shared types ────────────────────────────────────────────────────────

export interface AdminSubscription {
  id: string;
  customer: { id: string; email: string | null };
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  mrr: number;
  lineItems: Array<{
    id: string;
    priceId: string;
    priceNickname: string | null;
    quantity: number;
    unitAmount: number;
    interval: "month" | "year" | string;
  }>;
  createdAt: string;
}

export interface AdminEvent {
  id: string;
  type: string;
  createdAt: string;
  livemode: boolean;
  objectType: string | null;
  objectId: string | null;
  payload: unknown;
}

export interface AdminProduct {
  id: string;
  name: string;
  active: boolean;
  description: string | null;
  prices: Array<{
    id: string;
    nickname: string | null;
    unitAmount: number;
    currency: string;
    interval: "month" | "year" | null;
    active: boolean;
  }>;
}

export interface AdminInvoice {
  id: string;
  number: string | null;
  status: string;
  amountPaid: number;
  amountDue: number;
  currency: string;
  created: string;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
}

export interface AdminPaymentMethod {
  id: string;
  type: string;
  card: { brand: string; last4: string; expMonth: number; expYear: number } | null;
  isDefault: boolean;
}

export interface AdminCharge {
  id: string;
  amount: number;
  currency: string;
  status: string;
  refunded: boolean;
  refundedAmount: number;
  created: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function centsToDollars(cents: number | null | undefined): number {
  return Math.round((cents ?? 0)) / 100;
}

function mapSubscription(sub: Stripe.Subscription): AdminSubscription {
  const customer = typeof sub.customer === "string" ? null : sub.customer;
  const email = customer && "email" in customer ? (customer.email ?? null) : null;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const periodEnd = sub.items?.data?.[0]?.current_period_end;

  const lineItems = sub.items.data.map((item) => {
    const price = item.price;
    const interval = price.recurring?.interval ?? "month";
    const monthlyEquivalent =
      interval === "year"
        ? (price.unit_amount ?? 0) / 12
        : (price.unit_amount ?? 0);
    return {
      id: item.id,
      priceId: price.id,
      priceNickname: price.nickname,
      quantity: item.quantity ?? 0,
      unitAmount: centsToDollars(price.unit_amount),
      interval,
      _monthlyCents: monthlyEquivalent * (item.quantity ?? 0),
    };
  });

  const mrr = lineItems.reduce((sum, li) => sum + li._monthlyCents, 0) / 100;

  return {
    id: sub.id,
    customer: { id: customerId, email },
    status: sub.status,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    mrr: Math.round(mrr * 100) / 100,
    lineItems: lineItems.map(({ _monthlyCents, ...rest }) => rest),
    createdAt: new Date(sub.created * 1000).toISOString(),
  };
}

/**
 * Lists subscriptions for admin. Returns Stripe-paginated window.
 * Email search is NOT applied server-side (Stripe has no such filter);
 * callers filter client-side by email.
 */
export async function listSubscriptionsForAdmin(opts: {
  status?: Stripe.Subscription.Status | "all";
  startingAfter?: string;
  limit?: number;
}): Promise<{
  subscriptions: AdminSubscription[];
  hasMore: boolean;
  nextCursor: string | null;
  error?: string;
}> {
  try {
    const stripe = await getStripeClient();
    const params: Stripe.SubscriptionListParams = {
      limit: opts.limit ?? 50,
      expand: ["data.customer", "data.items.data.price"],
    };
    if (opts.status && opts.status !== "all") {
      params.status = opts.status;
    } else {
      params.status = "all";
    }
    if (opts.startingAfter) {
      params.starting_after = opts.startingAfter;
    }

    const page = await stripe.subscriptions.list(params);

    return {
      subscriptions: page.data.map(mapSubscription),
      hasMore: page.has_more,
      nextCursor: page.has_more ? page.data[page.data.length - 1]?.id ?? null : null,
    };
  } catch (error) {
    return {
      subscriptions: [],
      hasMore: false,
      nextCursor: null,
      error: error instanceof Error ? error.message : "Failed to list subscriptions",
    };
  }
}

/**
 * Lists recent Stripe events, optionally filtered by type.
 * Stripe retains ~30 days of events.
 */
export async function listStripeEvents(opts: {
  type?: string;
  startingAfter?: string;
  limit?: number;
}): Promise<{
  events: AdminEvent[];
  hasMore: boolean;
  nextCursor: string | null;
  error?: string;
}> {
  try {
    const stripe = await getStripeClient();
    const params: Stripe.EventListParams = {
      limit: opts.limit ?? 50,
    };
    if (opts.type) params.type = opts.type;
    if (opts.startingAfter) params.starting_after = opts.startingAfter;

    const page = await stripe.events.list(params);

    const events: AdminEvent[] = page.data.map((event) => {
      const obj = event.data.object as unknown as Record<string, unknown> | undefined;
      const objectType = obj && typeof obj.object === "string" ? obj.object : null;
      const objectId = obj && typeof obj.id === "string" ? obj.id : null;
      return {
        id: event.id,
        type: event.type,
        createdAt: new Date(event.created * 1000).toISOString(),
        livemode: event.livemode,
        objectType,
        objectId,
        payload: event.data.object,
      };
    });

    return {
      events,
      hasMore: page.has_more,
      nextCursor: page.has_more ? page.data[page.data.length - 1]?.id ?? null : null,
    };
  } catch (error) {
    return {
      events: [],
      hasMore: false,
      nextCursor: null,
      error: error instanceof Error ? error.message : "Failed to list events",
    };
  }
}

/**
 * Computes MRR breakdown by Pro-base vs seat add-on price IDs.
 * Reads the configured stripe.proPriceId and stripe.seatPriceId settings
 * to classify line items.
 */
export async function getRevenueByLineItem(): Promise<{
  basePro: { mrr: number; subscriptionCount: number };
  seatAddOn: { mrr: number; totalSeats: number };
  error?: string;
}> {
  try {
    const stripe = await getStripeClient();
    const [proPriceId, seatPriceId] = await Promise.all([
      getSetting("stripe.proPriceId"),
      getSetting("stripe.seatPriceId"),
    ]);

    let baseCents = 0;
    let baseSubscriptions = 0;
    let seatCents = 0;
    let totalSeats = 0;

    let startingAfter: string | undefined;
    // Paginate through all active subscriptions
    while (true) {
      const page: Stripe.ApiList<Stripe.Subscription> = await stripe.subscriptions.list({
        status: "active",
        limit: 100,
        expand: ["data.items.data.price"],
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });

      for (const sub of page.data) {
        let hasBase = false;
        for (const item of sub.items.data) {
          const priceId = item.price.id;
          const amount = item.price.unit_amount ?? 0;
          const qty = item.quantity ?? 0;
          const interval = item.price.recurring?.interval ?? "month";
          const monthly = interval === "year" ? (amount * qty) / 12 : amount * qty;

          if (priceId === proPriceId) {
            baseCents += monthly;
            hasBase = true;
          } else if (priceId === seatPriceId) {
            seatCents += monthly;
            totalSeats += qty;
          }
        }
        if (hasBase) baseSubscriptions += 1;
      }

      if (!page.has_more) break;
      startingAfter = page.data[page.data.length - 1]?.id;
      if (!startingAfter) break;
    }

    return {
      basePro: {
        mrr: Math.round(baseCents) / 100,
        subscriptionCount: baseSubscriptions,
      },
      seatAddOn: {
        mrr: Math.round(seatCents) / 100,
        totalSeats,
      },
    };
  } catch (error) {
    return {
      basePro: { mrr: 0, subscriptionCount: 0 },
      seatAddOn: { mrr: 0, totalSeats: 0 },
      error: error instanceof Error ? error.message : "Failed to compute line-item revenue",
    };
  }
}

/**
 * Lists all products and their prices. Single paginated call expanding prices.
 * Used by the Products & Prices admin card.
 */
export async function listProductsWithPrices(): Promise<{
  products: AdminProduct[];
  error?: string;
}> {
  try {
    const stripe = await getStripeClient();

    const products: AdminProduct[] = [];
    let startingAfter: string | undefined;

    while (true) {
      const page: Stripe.ApiList<Stripe.Product> = await stripe.products.list({
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });

      for (const product of page.data) {
        const pricesPage = await stripe.prices.list({
          product: product.id,
          limit: 100,
        });
        products.push({
          id: product.id,
          name: product.name,
          active: product.active,
          description: product.description,
          prices: pricesPage.data.map((price) => ({
            id: price.id,
            nickname: price.nickname,
            unitAmount: centsToDollars(price.unit_amount),
            currency: price.currency,
            interval: (price.recurring?.interval as "month" | "year" | null) ?? null,
            active: price.active,
          })),
        });
      }

      if (!page.has_more) break;
      startingAfter = page.data[page.data.length - 1]?.id;
      if (!startingAfter) break;
    }

    return { products };
  } catch (error) {
    return {
      products: [],
      error: error instanceof Error ? error.message : "Failed to list products",
    };
  }
}
