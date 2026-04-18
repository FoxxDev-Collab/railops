"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, User } from "lucide-react";
import type { AdminSubscription } from "@/lib/stripe-admin";

interface SubscriptionsTableProps {
  subscriptions: AdminSubscription[];
  userIdByCustomerId: Record<string, string>;
  error?: string;
  livemode: boolean;
}

type Filter = "all" | "active" | "past_due" | "canceled" | "trialing";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "past_due", label: "Past Due" },
  { value: "canceled", label: "Canceled" },
  { value: "trialing", label: "Trialing" },
];

function statusVariant(status: string) {
  if (status === "active" || status === "trialing") return "default" as const;
  if (status === "past_due") return "destructive" as const;
  return "secondary" as const;
}

export function SubscriptionsTable({
  subscriptions,
  userIdByCustomerId,
  error,
  livemode,
}: SubscriptionsTableProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let rows = subscriptions;
    if (filter !== "all") {
      rows = rows.filter((s) => s.status === filter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((s) => (s.customer.email ?? "").toLowerCase().includes(q));
    }
    return rows;
  }, [subscriptions, filter, search]);

  const stripeBase = `https://dashboard.stripe.com/${livemode ? "" : "test/"}`;

  if (error) {
    return (
      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Subscriptions</CardTitle>
          <CardDescription className="text-amber-700">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Subscriptions</CardTitle>
        <CardDescription>All Stripe subscriptions regardless of status</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
          <div className="flex-1" />
          <Input
            type="search"
            placeholder="Search by email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 max-w-xs text-xs"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No subscriptions match your filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left font-medium text-muted-foreground">Customer</th>
                  <th className="p-2 text-center font-medium text-muted-foreground">Status</th>
                  <th className="p-2 text-left font-medium text-muted-foreground">Line Items</th>
                  <th className="p-2 text-right font-medium text-muted-foreground">MRR</th>
                  <th className="p-2 text-right font-medium text-muted-foreground">Period End</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const userId = userIdByCustomerId[s.customer.id];
                  return (
                    <tr key={s.id} className="border-b border-border/50">
                      <td className="p-2">
                        {s.customer.email ?? <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="p-2 text-center">
                        <Badge variant={statusVariant(s.status)} className="text-[10px] font-normal">
                          {s.status}
                        </Badge>
                        {s.cancelAtPeriodEnd && (
                          <Badge variant="outline" className="ml-1 text-[10px] font-normal">
                            canceling
                          </Badge>
                        )}
                      </td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          {s.lineItems.map((li) => (
                            <Badge
                              key={li.id}
                              variant="secondary"
                              className="font-mono text-[10px] font-normal"
                            >
                              {li.priceNickname ?? li.priceId.slice(0, 14)} × {li.quantity}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-2 text-right tabular-nums">${s.mrr.toFixed(2)}</td>
                      <td className="p-2 text-right text-muted-foreground">
                        {s.currentPeriodEnd
                          ? new Date(s.currentPeriodEnd).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="p-2">
                        <div className="flex justify-end gap-1">
                          <Button asChild variant="ghost" size="sm" className="h-7 px-2">
                            <a
                              href={`${stripeBase}subscriptions/${s.id}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Open in Stripe"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                          {userId && (
                            <Button asChild variant="ghost" size="sm" className="h-7 px-2">
                              <Link href={`/admin/users/${userId}`} title="Go to user">
                                <User className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {subscriptions.length} loaded. Older subscriptions may require
          refresh with cursor pagination (not yet implemented).
        </p>
      </CardContent>
    </Card>
  );
}
