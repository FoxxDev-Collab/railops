import { adminAuth } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import {
  getStripeRevenue,
  getStripePayments,
  getStripeFailedPayments,
  getStripePayouts,
  getStripeDisputes,
} from "@/app/actions/admin/stripe-revenue";
import { MetricCard } from "@/components/admin/analytics/metric-card";
import { RevenueClient } from "@/components/admin/analytics/revenue-client";
import { DollarSign, TrendingUp, CreditCard, Banknote } from "lucide-react";

export default async function RevenuePage() {
  const session = await adminAuth();
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const [revenue, payments, failed, payouts, disputes] = await Promise.all([
    getStripeRevenue(),
    getStripePayments(),
    getStripeFailedPayments(),
    getStripePayouts(),
    getStripeDisputes(),
  ]);

  const hasError = "error" in revenue && revenue.error;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Revenue</h1>
        <p className="text-sm text-muted-foreground">
          Stripe revenue, payments, payouts, and disputes
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

      <RevenueClient
        payments={payments.payments}
        failedPayments={failed.payments}
        payouts={payouts.payouts}
        disputes={disputes.disputes}
      />
    </div>
  );
}
