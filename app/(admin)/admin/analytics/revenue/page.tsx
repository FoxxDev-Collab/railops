import { adminAuth } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import {
  getStripeRevenue,
  getStripePayments,
  getStripeFailedPayments,
  getStripePayouts,
  getStripeDisputes,
} from "@/app/actions/admin/stripe-revenue";
import {
  listSubscriptionsForAdmin,
  listStripeEvents,
  getRevenueByLineItem,
  listProductsWithPrices,
} from "@/lib/stripe-admin";
import { getSetting } from "@/lib/settings";
import { db } from "@/lib/db";
import { MetricCard } from "@/components/admin/analytics/metric-card";
import { RevenueClient } from "@/components/admin/analytics/revenue-client";
import { RevenueByLineItem } from "@/components/admin/analytics/revenue-by-line-item";
import { SubscriptionsTable } from "@/components/admin/analytics/subscriptions-table";
import { EventsTable } from "@/components/admin/analytics/events-table";
import { ProductsPrices } from "@/components/admin/analytics/products-prices";
import { DollarSign, TrendingUp, CreditCard, Banknote } from "lucide-react";

export default async function RevenuePage() {
  const session = await adminAuth();
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const [
    revenue,
    payments,
    failed,
    payouts,
    disputes,
    subsResult,
    eventsResult,
    lineItemsResult,
    productsResult,
    proPriceId,
    seatPriceId,
  ] = await Promise.all([
    getStripeRevenue(),
    getStripePayments(),
    getStripeFailedPayments(),
    getStripePayouts(),
    getStripeDisputes(),
    listSubscriptionsForAdmin({ status: "all", limit: 100 }),
    listStripeEvents({ limit: 50 }),
    getRevenueByLineItem(),
    listProductsWithPrices(),
    getSetting("stripe.proPriceId"),
    getSetting("stripe.seatPriceId"),
  ]);

  const hasError = "error" in revenue && revenue.error;

  // Map customer IDs to our internal user IDs (for "Go to user" links)
  const customerIds = subsResult.subscriptions.map((s) => s.customer.id);
  const users =
    customerIds.length > 0
      ? await db.user.findMany({
          where: { stripeCustomerId: { in: customerIds } },
          select: { id: true, stripeCustomerId: true },
        })
      : [];
  const userIdByCustomerId: Record<string, string> = {};
  for (const u of users) {
    if (u.stripeCustomerId) userIdByCustomerId[u.stripeCustomerId] = u.id;
  }

  // livemode flag — infer from any returned event. Default to false (safer link).
  const livemode = eventsResult.events[0]?.livemode ?? false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Revenue</h1>
        <p className="text-sm text-muted-foreground">
          Stripe revenue, subscriptions, webhook events, and catalog
        </p>
      </div>

      {hasError && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
          <p className="text-sm text-amber-600">
            Stripe connection issue: {revenue.error}. Showing cached/zero data.
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="MRR"
          value={`$${revenue.mrr.toFixed(2)}`}
          subtitle={`${revenue.activeSubscriptions} active subscriptions`}
          icon={DollarSign}
        />
        <MetricCard
          title="ARR"
          value={`$${revenue.arr.toFixed(2)}`}
          subtitle="annualized"
          icon={TrendingUp}
        />
        <MetricCard
          title="Available Balance"
          value={`$${revenue.availableBalance.toFixed(2)}`}
          subtitle={`$${revenue.pendingBalance.toFixed(2)} pending`}
          icon={CreditCard}
        />
        <MetricCard
          title="Next Payout"
          value={
            revenue.nextPayout
              ? `$${revenue.nextPayout.amount.toFixed(2)}`
              : "—"
          }
          subtitle={
            revenue.nextPayout
              ? new Date(revenue.nextPayout.arrivalDate).toLocaleDateString()
              : "No pending payouts"
          }
          icon={Banknote}
        />
      </div>

      <RevenueByLineItem
        basePro={lineItemsResult.basePro}
        seatAddOn={lineItemsResult.seatAddOn}
        error={lineItemsResult.error}
      />

      <RevenueClient
        payments={payments.payments}
        failedPayments={failed.payments}
        payouts={payouts.payouts}
        disputes={disputes.disputes}
      />

      <SubscriptionsTable
        subscriptions={subsResult.subscriptions}
        userIdByCustomerId={userIdByCustomerId}
        error={subsResult.error}
        livemode={livemode}
      />

      <EventsTable events={eventsResult.events} error={eventsResult.error} />

      <ProductsPrices
        products={productsResult.products}
        proPriceId={proPriceId}
        seatPriceId={seatPriceId}
        error={productsResult.error}
        livemode={livemode}
      />
    </div>
  );
}
