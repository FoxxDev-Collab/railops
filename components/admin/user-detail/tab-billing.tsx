"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, ExternalLink, FileText, Loader2, Users } from "lucide-react";
import { issueRefund } from "@/app/actions/admin/stripe-revenue";
import type {
  AdminSubscription,
  AdminInvoice,
  AdminPaymentMethod,
  AdminCharge,
} from "@/lib/stripe-admin";

interface TabBillingProps {
  stripeCustomerId: string | null;
  deepDive: {
    subscription: AdminSubscription | null;
    invoices: AdminInvoice[];
    paymentMethods: AdminPaymentMethod[];
    charges: AdminCharge[];
    error?: string;
  };
  purchasedSeats: number;
  seatsUsed: number;
  livemode: boolean;
}

function statusBadge(status: string) {
  const variant =
    status === "active" || status === "paid" || status === "succeeded"
      ? "default"
      : status === "past_due" || status === "failed"
        ? "destructive"
        : "secondary";
  return (
    <Badge variant={variant} className="text-[10px] font-normal">
      {status}
    </Badge>
  );
}

export function TabBilling({
  stripeCustomerId,
  deepDive,
  purchasedSeats,
  seatsUsed,
  livemode,
}: TabBillingProps) {
  const [isPending, startTransition] = useTransition();
  const [refundingId, setRefundingId] = useState<string | null>(null);

  if (!stripeCustomerId) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-sm text-muted-foreground">
            No Stripe customer linked to this account
          </p>
        </CardContent>
      </Card>
    );
  }

  const stripeBase = `https://dashboard.stripe.com/${livemode ? "" : "test/"}`;

  function handleRefund(chargeId: string, amount: number) {
    if (!confirm(`Refund $${amount.toFixed(2)} for charge ${chargeId}?`)) return;
    setRefundingId(chargeId);
    startTransition(async () => {
      const result = await issueRefund(chargeId);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Refund issued");
      }
      setRefundingId(null);
    });
  }

  return (
    <div className="space-y-4">
      {deepDive.error && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
          <p className="text-sm text-amber-700">
            Stripe connection issue: {deepDive.error}
          </p>
        </div>
      )}

      {/* Subscription */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-medium">Subscription</CardTitle>
              <CardDescription className="font-mono text-[10px]">
                Customer {stripeCustomerId}
              </CardDescription>
            </div>
            {deepDive.subscription && (
              <a
                href={`${stripeBase}subscriptions/${deepDive.subscription.id}`}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  Open in Stripe
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Button>
              </a>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!deepDive.subscription ? (
            <p className="text-sm text-muted-foreground">No active subscription.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {statusBadge(deepDive.subscription.status)}
                {deepDive.subscription.cancelAtPeriodEnd && (
                  <Badge variant="outline" className="text-[10px] font-normal">
                    cancels at period end
                  </Badge>
                )}
                <span className="text-muted-foreground">
                  Period ends{" "}
                  {deepDive.subscription.currentPeriodEnd
                    ? new Date(deepDive.subscription.currentPeriodEnd).toLocaleDateString()
                    : "—"}
                </span>
                <span className="ml-auto font-medium tabular-nums">
                  ${deepDive.subscription.mrr.toFixed(2)} MRR
                </span>
              </div>
              <div className="space-y-1">
                {deepDive.subscription.lineItems.map((li) => (
                  <div
                    key={li.id}
                    className="flex items-center justify-between rounded border border-border px-3 py-2 text-xs"
                  >
                    <div>
                      <p className="font-medium">
                        {li.priceNickname ?? "(unnamed price)"} × {li.quantity}
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground">{li.priceId}</p>
                    </div>
                    <span className="tabular-nums text-muted-foreground">
                      ${li.unitAmount.toFixed(2)} / {li.interval}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Seats */}
      {deepDive.subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-3.5 w-3.5" />
              Seats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Purchased</p>
                <p className="text-xl font-bold tabular-nums">{purchasedSeats}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Used</p>
                <p className="text-xl font-bold tabular-nums">{seatsUsed}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Available</p>
                <p className="text-xl font-bold tabular-nums">
                  {Math.max(0, purchasedSeats + 1 - seatsUsed)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-3.5 w-3.5" />
            Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deepDive.invoices.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No invoices</p>
          ) : (
            <div className="space-y-1">
              {deepDive.invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded border border-border px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{inv.number ?? inv.id.slice(0, 12)}</span>
                    {statusBadge(inv.status)}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tabular-nums font-medium">
                      ${inv.amountPaid.toFixed(2)}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(inv.created).toLocaleDateString()}
                    </span>
                    {inv.invoicePdf && (
                      <a
                        href={inv.invoicePdf}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                        title="Download PDF"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <CreditCard className="h-3.5 w-3.5" />
            Payment Methods
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deepDive.paymentMethods.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No payment methods</p>
          ) : (
            <div className="space-y-1">
              {deepDive.paymentMethods.map((pm) => (
                <div
                  key={pm.id}
                  className="flex items-center justify-between rounded border border-border px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">
                      {pm.card?.brand ?? pm.type}
                    </span>
                    {pm.card && <span className="font-mono text-muted-foreground">•••• {pm.card.last4}</span>}
                    {pm.isDefault && (
                      <Badge variant="outline" className="text-[10px] font-normal">
                        default
                      </Badge>
                    )}
                  </div>
                  {pm.card && (
                    <span className="text-muted-foreground tabular-nums">
                      {String(pm.card.expMonth).padStart(2, "0")}/{String(pm.card.expYear).slice(-2)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent charges */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recent Charges</CardTitle>
        </CardHeader>
        <CardContent>
          {deepDive.charges.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No charges</p>
          ) : (
            <div className="space-y-1">
              {deepDive.charges.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded border border-border px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums font-medium">${c.amount.toFixed(2)}</span>
                    <span className="text-muted-foreground">{c.currency}</span>
                    {statusBadge(c.status)}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">
                      {new Date(c.created).toLocaleDateString()}
                    </span>
                    {c.status === "succeeded" && !c.refunded && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px]"
                        onClick={() => handleRefund(c.id, c.amount)}
                        disabled={isPending && refundingId === c.id}
                      >
                        {isPending && refundingId === c.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Refund"
                        )}
                      </Button>
                    )}
                    {c.refunded && (
                      <span className="text-[11px] text-muted-foreground">refunded</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
