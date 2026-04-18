"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import type { AdminEvent } from "@/lib/stripe-admin";

interface EventsTableProps {
  events: AdminEvent[];
  error?: string;
}

const EVENT_TYPES = [
  "all",
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
  "charge.refunded",
  "charge.dispute.created",
] as const;

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

export function EventsTable({ events, error }: EventsTableProps) {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (typeFilter === "all") return events;
    return events.filter((e) => e.type === typeFilter);
  }, [events, typeFilter]);

  if (error) {
    return (
      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Webhook Events</CardTitle>
          <CardDescription className="text-amber-700">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Webhook Events</CardTitle>
        <CardDescription>
          Last 50 events received by Stripe (retained ~30 days). Click any row to expand its payload.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-[320px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t === "all" ? "All event types" : t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No events match your filter.
          </p>
        ) : (
          <div className="space-y-1">
            {filtered.map((e) => {
              const isOpen = expanded === e.id;
              return (
                <div
                  key={e.id}
                  className="rounded-md border border-border bg-card"
                >
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : e.id)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted/50"
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span
                      className="font-mono text-xs text-muted-foreground"
                      title={new Date(e.createdAt).toLocaleString()}
                    >
                      {timeAgo(e.createdAt)}
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      {e.type}
                    </Badge>
                    {!e.livemode && (
                      <Badge variant="outline" className="text-[10px] font-normal">
                        test
                      </Badge>
                    )}
                    <span className="flex-1 truncate font-mono text-xs text-muted-foreground">
                      {e.objectType ?? ""} {e.objectId ?? ""}
                    </span>
                    <a
                      href={`https://dashboard.stripe.com/${e.livemode ? "" : "test/"}events/${e.id}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(ev) => ev.stopPropagation()}
                      className="text-muted-foreground hover:text-foreground"
                      title="Open in Stripe"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </button>
                  {isOpen && (
                    <div className="border-t border-border bg-muted/30 px-3 py-2">
                      <pre className="max-h-80 overflow-auto whitespace-pre-wrap font-mono text-[10px]">
                        {JSON.stringify(e.payload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
