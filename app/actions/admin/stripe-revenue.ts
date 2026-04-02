"use server";

import { adminAuth } from "@/lib/admin-auth";
import { getStripeClient } from "@/lib/stripe";

async function requireAdmin() {
  const session = await adminAuth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function getStripeRevenue() {
  await requireAdmin();

  try {
    const stripe = await getStripeClient();

    const [subscriptions, balance, payouts] = await Promise.all([
      stripe.subscriptions.list({ status: "active", limit: 100 }),
      stripe.balance.retrieve(),
      stripe.payouts.list({ limit: 1, status: "pending" }),
    ]);

    // Calculate MRR from active subscriptions
    let mrr = 0;
    for (const sub of subscriptions.data) {
      for (const item of sub.items.data) {
        if (item.price.recurring?.interval === "month") {
          mrr += (item.price.unit_amount ?? 0) / 100;
        } else if (item.price.recurring?.interval === "year") {
          mrr += (item.price.unit_amount ?? 0) / 100 / 12;
        }
      }
    }

    const arr = mrr * 12;
    const available = balance.available.reduce((sum, b) => sum + b.amount, 0) / 100;
    const pending = balance.pending.reduce((sum, b) => sum + b.amount, 0) / 100;
    const nextPayout = payouts.data[0]
      ? {
          amount: payouts.data[0].amount / 100,
          arrivalDate: new Date(payouts.data[0].arrival_date * 1000).toISOString(),
          status: payouts.data[0].status,
        }
      : null;

    return {
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(arr * 100) / 100,
      availableBalance: available,
      pendingBalance: pending,
      activeSubscriptions: subscriptions.data.length,
      nextPayout,
    };
  } catch (error) {
    return {
      mrr: 0, arr: 0, availableBalance: 0, pendingBalance: 0,
      activeSubscriptions: 0, nextPayout: null,
      error: error instanceof Error ? error.message : "Failed to connect to Stripe",
    };
  }
}

export async function getStripePayments() {
  await requireAdmin();
  const pageSize = 20;

  try {
    const stripe = await getStripeClient();
    const charges = await stripe.charges.list({
      limit: pageSize,
    });

    return {
      payments: charges.data.map((charge) => ({
        id: charge.id,
        amount: charge.amount / 100,
        currency: charge.currency.toUpperCase(),
        status: charge.status,
        customerEmail: charge.billing_details?.email ?? charge.receipt_email ?? "Unknown",
        description: charge.description,
        created: new Date(charge.created * 1000).toISOString(),
        refunded: charge.refunded,
        refundedAmount: charge.amount_refunded / 100,
      })),
      hasMore: charges.has_more,
    };
  } catch (error) {
    return {
      payments: [],
      hasMore: false,
      error: error instanceof Error ? error.message : "Failed to fetch payments",
    };
  }
}

export async function getStripeFailedPayments() {
  await requireAdmin();

  try {
    const stripe = await getStripeClient();
    const charges = await stripe.charges.list({
      limit: 20,
    });

    const failed = charges.data.filter((c) => c.status === "failed");

    return {
      payments: failed.map((charge) => ({
        id: charge.id,
        amount: charge.amount / 100,
        currency: charge.currency.toUpperCase(),
        customerEmail: charge.billing_details?.email ?? "Unknown",
        failureMessage: charge.failure_message,
        failureCode: charge.failure_code,
        created: new Date(charge.created * 1000).toISOString(),
      })),
    };
  } catch (error) {
    return {
      payments: [],
      error: error instanceof Error ? error.message : "Failed to fetch",
    };
  }
}

export async function getStripePayouts() {
  await requireAdmin();

  try {
    const stripe = await getStripeClient();
    const payouts = await stripe.payouts.list({ limit: 20 });

    return {
      payouts: payouts.data.map((p) => ({
        id: p.id,
        amount: p.amount / 100,
        currency: p.currency.toUpperCase(),
        status: p.status,
        arrivalDate: new Date(p.arrival_date * 1000).toISOString(),
        created: new Date(p.created * 1000).toISOString(),
        method: p.method,
      })),
    };
  } catch (error) {
    return {
      payouts: [],
      error: error instanceof Error ? error.message : "Failed to fetch payouts",
    };
  }
}

export async function getStripeDisputes() {
  await requireAdmin();

  try {
    const stripe = await getStripeClient();
    const disputes = await stripe.disputes.list({ limit: 20 });

    return {
      disputes: disputes.data.map((d) => ({
        id: d.id,
        amount: d.amount / 100,
        currency: d.currency.toUpperCase(),
        status: d.status,
        reason: d.reason,
        chargeId: d.charge,
        created: new Date(d.created * 1000).toISOString(),
      })),
    };
  } catch (error) {
    return {
      disputes: [],
      error: error instanceof Error ? error.message : "Failed to fetch disputes",
    };
  }
}

export async function issueRefund(chargeId: string, amount?: number) {
  const session = await requireAdmin();

  try {
    const stripe = await getStripeClient();
    const refund = await stripe.refunds.create({
      charge: chargeId,
      ...(amount ? { amount: Math.round(amount * 100) } : {}),
    });

    // Log audit
    const { logAudit } = await import("@/lib/audit");
    await logAudit({
      action: "stripe.refund",
      adminId: session.user.id,
      adminEmail: session.user.email!,
      entityType: "Charge",
      entityId: chargeId,
      metadata: { refundId: refund.id, amount: refund.amount / 100 },
    });

    return { success: true, refundId: refund.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Refund failed" };
  }
}
