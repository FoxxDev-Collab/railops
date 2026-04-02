"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { issueRefund } from "@/app/actions/admin/stripe-revenue";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  customerEmail: string;
  description: string | null;
  created: string;
  refunded: boolean;
  refundedAmount: number;
}

interface Payout {
  id: string;
  amount: number;
  currency: string;
  status: string;
  arrivalDate: string;
  created: string;
  method: string;
}

interface Dispute {
  id: string;
  amount: number;
  currency: string;
  status: string;
  reason: string;
  chargeId: string | object;
  created: string;
}

interface RevenueClientProps {
  payments: Payment[];
  failedPayments: Array<{
    id: string;
    amount: number;
    currency: string;
    customerEmail: string;
    failureMessage: string | null;
    failureCode: string | null;
    created: string;
  }>;
  payouts: Payout[];
  disputes: Dispute[];
}

function statusBadge(status: string) {
  const variant =
    status === "succeeded" || status === "paid"
      ? "default"
      : status === "failed"
        ? "destructive"
        : "secondary";
  return <Badge variant={variant} className="text-[10px] font-normal">{status}</Badge>;
}

export function RevenueClient({ payments, failedPayments, payouts, disputes }: RevenueClientProps) {
  const [isPending, startTransition] = useTransition();
  const [refundingId, setRefundingId] = useState<string | null>(null);

  function handleRefund(chargeId: string, amount: number) {
    if (!confirm(`Refund $${amount} for charge ${chargeId}?`)) return;
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
    <div className="space-y-6">
      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recent Payments</CardTitle>
          <CardDescription>Last 20 charges from Stripe</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No payments found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium text-muted-foreground">Customer</th>
                    <th className="text-right p-2 font-medium text-muted-foreground">Amount</th>
                    <th className="text-center p-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-right p-2 font-medium text-muted-foreground">Date</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-border/50">
                      <td className="p-2">{p.customerEmail}</td>
                      <td className="p-2 text-right tabular-nums font-medium">
                        ${p.amount.toFixed(2)} {p.currency}
                      </td>
                      <td className="p-2 text-center">{statusBadge(p.status)}</td>
                      <td className="p-2 text-right text-muted-foreground">
                        {new Date(p.created).toLocaleDateString()}
                      </td>
                      <td className="p-2">
                        {p.status === "succeeded" && !p.refunded && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleRefund(p.id, p.amount)}
                            disabled={isPending && refundingId === p.id}
                          >
                            {isPending && refundingId === p.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Refund"
                            )}
                          </Button>
                        )}
                        {p.refunded && (
                          <span className="text-xs text-muted-foreground">Refunded</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Failed Payments */}
      {failedPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-destructive">Failed Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {failedPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded border border-destructive/20 bg-destructive/5">
                  <div>
                    <p className="text-sm font-medium">{p.customerEmail}</p>
                    <p className="text-xs text-muted-foreground">{p.failureMessage ?? p.failureCode ?? "Unknown failure"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium tabular-nums">${p.amount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(p.created).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Payouts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            {payouts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No payouts found</p>
            ) : (
              <div className="space-y-2">
                {payouts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium tabular-nums">${p.amount.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        Arrives {new Date(p.arrivalDate).toLocaleDateString()}
                      </p>
                    </div>
                    {statusBadge(p.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Disputes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Disputes & Chargebacks</CardTitle>
          </CardHeader>
          <CardContent>
            {disputes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No disputes</p>
            ) : (
              <div className="space-y-2">
                {disputes.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-sm p-2 rounded border">
                    <div>
                      <p className="font-medium tabular-nums">${d.amount.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{d.reason}</p>
                    </div>
                    {statusBadge(d.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
