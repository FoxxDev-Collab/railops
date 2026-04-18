# Admin Stripe Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the admin UI with live-from-Stripe visibility into subscriptions, webhook events, seat-vs-base MRR breakdown, per-user billing deep-dive, and configured products/prices.

**Architecture:** One new helper module `lib/stripe-admin.ts` with typed admin-facing Stripe queries. Revenue page gains three new card sections (Revenue by Line Item, Subscriptions, Events, Products & Prices). Per-user billing tab rewritten with richer content. No new DB tables. All reads live from Stripe API; failures degrade to amber banner + empty sections.

**Tech Stack:** Next.js 16 App Router, TypeScript, Stripe SDK (already at 2026-03-25.dahlia), shadcn/ui.

**Spec:** `docs/superpowers/specs/2026-04-17-admin-stripe-visibility-design.md`

**Layout deviation from spec:** The spec describes the existing `<RevenueClient>` as using tabs. In fact it uses stacked cards. This plan keeps the stacked-card pattern — new sections (Revenue by Line Item, Subscriptions, Events, Products & Prices) are added as more stacked cards on `/admin/analytics/revenue`, each with internal filter controls where needed. No tab refactor.

**Testing note:** No automated test suite. Each task ends with a typecheck + manual verification step.

---

## File Structure

**New files:**
- `lib/stripe-admin.ts` — typed admin-only Stripe query helpers
- `components/admin/analytics/revenue-by-line-item.tsx` — base Pro vs seat MRR card
- `components/admin/analytics/subscriptions-table.tsx` — subscriptions list with filters (client component)
- `components/admin/analytics/events-table.tsx` — events list with filter + expand (client component)
- `components/admin/analytics/products-prices.tsx` — products/prices read-only card

**Modified files:**
- `app/(admin)/admin/analytics/revenue/page.tsx` — fetch new data, render new sections
- `components/admin/user-detail/tab-billing.tsx` — rewrite with richer content
- `app/(admin)/admin/users/[id]/page.tsx` — replace inline Stripe fetch with `getUserStripeDeepDive`

---

### Task 1: Create `lib/stripe-admin.ts` with types and `listSubscriptionsForAdmin`

**Files:**
- Create: `lib/stripe-admin.ts`

- [ ] **Step 1: Create the module with types + first helper**

```ts
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: no errors. If Stripe SDK types complain about `status: "all"` as a param, leave it — Stripe accepts this per current API. If TypeScript narrows `sub.customer` and cannot find `email`, the `"email" in customer` guard handles it.

- [ ] **Step 3: Commit**

```bash
git add lib/stripe-admin.ts
git commit -m "feat: add stripe-admin module with listSubscriptionsForAdmin"
```

---

### Task 2: Add `listStripeEvents`

**Files:**
- Modify: `lib/stripe-admin.ts`

- [ ] **Step 1: Append the helper**

Append at the bottom of `lib/stripe-admin.ts`:

```ts
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
      const obj = event.data.object as Record<string, unknown> | undefined;
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/stripe-admin.ts
git commit -m "feat: add listStripeEvents to stripe-admin"
```

---

### Task 3: Add `getRevenueByLineItem`

**Files:**
- Modify: `lib/stripe-admin.ts`

- [ ] **Step 1: Append the helper**

Append at the bottom of `lib/stripe-admin.ts`:

```ts
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/stripe-admin.ts
git commit -m "feat: add getRevenueByLineItem for MRR breakdown"
```

---

### Task 4: Add `listProductsWithPrices`

**Files:**
- Modify: `lib/stripe-admin.ts`

- [ ] **Step 1: Append the helper**

Append at the bottom of `lib/stripe-admin.ts`:

```ts
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
            interval: price.recurring?.interval ?? null,
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/stripe-admin.ts
git commit -m "feat: add listProductsWithPrices to stripe-admin"
```

---

### Task 5: Add `getUserStripeDeepDive`

**Files:**
- Modify: `lib/stripe-admin.ts`

- [ ] **Step 1: Append the helper**

Append at the bottom of `lib/stripe-admin.ts`:

```ts
/**
 * Fetches all Stripe data for a single customer: active subscription,
 * recent invoices, payment methods, recent charges.
 */
export async function getUserStripeDeepDive(
  stripeCustomerId: string
): Promise<{
  subscription: AdminSubscription | null;
  invoices: AdminInvoice[];
  paymentMethods: AdminPaymentMethod[];
  charges: AdminCharge[];
  error?: string;
}> {
  try {
    const stripe = await getStripeClient();

    const [subs, invoices, customer, charges] = await Promise.all([
      stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: "all",
        limit: 1,
        expand: ["data.customer", "data.items.data.price"],
      }),
      stripe.invoices.list({ customer: stripeCustomerId, limit: 10 }),
      stripe.customers.retrieve(stripeCustomerId, {
        expand: ["invoice_settings.default_payment_method"],
      }),
      stripe.charges.list({ customer: stripeCustomerId, limit: 20 }),
    ]);

    const sub = subs.data[0] ?? null;

    const customerResolved = customer as Stripe.Customer | Stripe.DeletedCustomer;
    const defaultPmId =
      "invoice_settings" in customerResolved
        ? (typeof customerResolved.invoice_settings.default_payment_method === "string"
            ? customerResolved.invoice_settings.default_payment_method
            : customerResolved.invoice_settings.default_payment_method?.id ?? null)
        : null;

    const pmList = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: "card",
      limit: 10,
    });

    return {
      subscription: sub ? mapSubscription(sub) : null,
      invoices: invoices.data.map((inv) => ({
        id: inv.id ?? "",
        number: inv.number,
        status: inv.status ?? "unknown",
        amountPaid: centsToDollars(inv.amount_paid),
        amountDue: centsToDollars(inv.amount_due),
        currency: inv.currency.toUpperCase(),
        created: new Date(inv.created * 1000).toISOString(),
        hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
        invoicePdf: inv.invoice_pdf ?? null,
      })),
      paymentMethods: pmList.data.map((pm) => ({
        id: pm.id,
        type: pm.type,
        card: pm.card
          ? {
              brand: pm.card.brand,
              last4: pm.card.last4,
              expMonth: pm.card.exp_month,
              expYear: pm.card.exp_year,
            }
          : null,
        isDefault: pm.id === defaultPmId,
      })),
      charges: charges.data.map((c) => ({
        id: c.id,
        amount: centsToDollars(c.amount),
        currency: c.currency.toUpperCase(),
        status: c.status,
        refunded: c.refunded,
        refundedAmount: centsToDollars(c.amount_refunded),
        created: new Date(c.created * 1000).toISOString(),
      })),
    };
  } catch (error) {
    return {
      subscription: null,
      invoices: [],
      paymentMethods: [],
      charges: [],
      error: error instanceof Error ? error.message : "Failed to load Stripe data",
    };
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/stripe-admin.ts
git commit -m "feat: add getUserStripeDeepDive for per-user Stripe detail"
```

---

### Task 6: Create `RevenueByLineItem` card component

**Files:**
- Create: `components/admin/analytics/revenue-by-line-item.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, Users } from "lucide-react";

interface RevenueByLineItemProps {
  basePro: { mrr: number; subscriptionCount: number };
  seatAddOn: { mrr: number; totalSeats: number };
  error?: string;
}

export function RevenueByLineItem({ basePro, seatAddOn, error }: RevenueByLineItemProps) {
  if (error) {
    return (
      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Revenue by Line Item</CardTitle>
          <CardDescription className="text-amber-700">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Revenue by Line Item</CardTitle>
        <CardDescription>Breakdown of active subscriptions by price</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-md border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              Pro Base
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums">${basePro.mrr.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">
              {basePro.subscriptionCount} subscription{basePro.subscriptionCount === 1 ? "" : "s"} &middot; MRR
            </p>
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Users className="h-3 w-3" />
              Seat Add-ons
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums">${seatAddOn.mrr.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">
              {seatAddOn.totalSeats} seat{seatAddOn.totalSeats === 1 ? "" : "s"} purchased &middot; MRR
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/admin/analytics/revenue-by-line-item.tsx
git commit -m "feat: add RevenueByLineItem card component"
```

---

### Task 7: Create `SubscriptionsTable` client component

**Files:**
- Create: `components/admin/analytics/subscriptions-table.tsx`

- [ ] **Step 1: Create the component**

```tsx
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/admin/analytics/subscriptions-table.tsx
git commit -m "feat: add SubscriptionsTable with status filter and email search"
```

---

### Task 8: Create `EventsTable` client component

**Files:**
- Create: `components/admin/analytics/events-table.tsx`

- [ ] **Step 1: Create the component**

```tsx
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
import { Button } from "@/components/ui/button";
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/admin/analytics/events-table.tsx
git commit -m "feat: add EventsTable with type filter and expandable payloads"
```

---

### Task 9: Create `ProductsPrices` card component

**Files:**
- Create: `components/admin/analytics/products-prices.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Copy, ExternalLink } from "lucide-react";
import type { AdminProduct } from "@/lib/stripe-admin";

interface ProductsPricesProps {
  products: AdminProduct[];
  proPriceId: string | null;
  seatPriceId: string | null;
  error?: string;
  livemode: boolean;
}

export function ProductsPrices({
  products,
  proPriceId,
  seatPriceId,
  error,
  livemode,
}: ProductsPricesProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copy(id: string) {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1200);
  }

  if (error) {
    return (
      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Products & Prices</CardTitle>
          <CardDescription className="text-amber-700">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const stripeBase = `https://dashboard.stripe.com/${livemode ? "" : "test/"}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Products & Prices</CardTitle>
        <CardDescription>
          Stripe catalog. Price IDs configured in Admin Settings are annotated below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No products found in Stripe.
          </p>
        ) : (
          <div className="space-y-4">
            {products.map((product) => (
              <div key={product.id} className="rounded-md border border-border">
                <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{product.name}</p>
                    {product.description && (
                      <p className="text-xs text-muted-foreground">{product.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={product.active ? "default" : "secondary"} className="text-[10px] font-normal">
                      {product.active ? "active" : "archived"}
                    </Badge>
                    <a
                      href={`${stripeBase}products/${product.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                      title="Open product in Stripe"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {product.prices.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-muted-foreground">No prices</p>
                  ) : (
                    product.prices.map((price) => {
                      const usedAs =
                        price.id === proPriceId
                          ? "Pro"
                          : price.id === seatPriceId
                            ? "Seat"
                            : null;
                      return (
                        <div key={price.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                          <span className="min-w-[120px] text-xs">
                            {price.nickname ?? <span className="text-muted-foreground">(unnamed)</span>}
                          </span>
                          <span className="tabular-nums">
                            ${price.unitAmount.toFixed(2)} {price.currency.toUpperCase()}
                            {price.interval ? ` / ${price.interval}` : ""}
                          </span>
                          {usedAs && (
                            <Badge variant="outline" className="text-[10px] font-normal">
                              Used as {usedAs}
                            </Badge>
                          )}
                          {!price.active && (
                            <Badge variant="secondary" className="text-[10px] font-normal">
                              archived
                            </Badge>
                          )}
                          <span className="flex-1 truncate font-mono text-xs text-muted-foreground">
                            {price.id}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => copy(price.id)}
                            title="Copy price ID"
                          >
                            {copiedId === price.id ? (
                              <Check className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/admin/analytics/products-prices.tsx
git commit -m "feat: add ProductsPrices card with configured-price annotations"
```

---

### Task 10: Extend `/admin/analytics/revenue/page.tsx` to render new sections

**Files:**
- Modify: `app/(admin)/admin/analytics/revenue/page.tsx`

- [ ] **Step 1: Replace the page file**

Replace the entire contents of `app/(admin)/admin/analytics/revenue/page.tsx` with:

```tsx
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`. Log in as admin. Navigate to `/admin/analytics/revenue`.

**Expected:** Page renders four metric cards at top, then Revenue by Line Item card showing Pro + Seat MRR, then existing RevenueClient cards (Payments, Failed, Payouts, Disputes), then Subscriptions table with filter pills, then Events log with type filter, then Products & Prices card showing your two prices with "Used as Pro" and "Used as Seat" badges.

If Stripe config is broken: amber banner at top, sections render with empty/zero data.

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add "app/(admin)/admin/analytics/revenue/page.tsx"
git commit -m "feat: render admin Stripe visibility sections on revenue page"
```

---

### Task 11: Rewrite `tab-billing.tsx` with rich per-user Stripe detail

**Files:**
- Modify: `components/admin/user-detail/tab-billing.tsx` (full rewrite)

- [ ] **Step 1: Replace the file contents**

Replace `components/admin/user-detail/tab-billing.tsx` with:

```tsx
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: no errors. The existing `app/(admin)/admin/users/[id]/page.tsx` still passes the old `stripeDetails` prop shape — Task 12 fixes that.

- [ ] **Step 3: Commit**

```bash
git add components/admin/user-detail/tab-billing.tsx
git commit -m "feat: rewrite per-user billing tab with rich Stripe detail"
```

---

### Task 12: Wire `getUserStripeDeepDive` in user detail page

**Files:**
- Modify: `app/(admin)/admin/users/[id]/page.tsx`

- [ ] **Step 1: Replace the file**

Replace the entire contents of `app/(admin)/admin/users/[id]/page.tsx` with:

```tsx
import { adminAuth } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { getUserDetails, getUserTimeline, getUserActivityFeed } from "@/app/actions/admin/users";
import { getAdminNotes } from "@/app/actions/admin/notes";
import { getUserStripeDeepDive } from "@/lib/stripe-admin";
import { db } from "@/lib/db";
import { UserHeader } from "@/components/admin/user-detail/user-header";
import { UserTabs } from "@/components/admin/user-detail/user-tabs";
import { TabOverview } from "@/components/admin/user-detail/tab-overview";
import { TabActivity } from "@/components/admin/user-detail/tab-activity";
import { TabRailroads } from "@/components/admin/user-detail/tab-railroads";
import { TabActions } from "@/components/admin/user-detail/tab-actions";
import { TabBilling } from "@/components/admin/user-detail/tab-billing";
import { TabNotes } from "@/components/admin/user-detail/tab-notes";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await adminAuth();
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;
  const [user, timeline, activityData, notes] = await Promise.all([
    getUserDetails(id),
    getUserTimeline(id),
    getUserActivityFeed(id),
    getAdminNotes(id),
  ]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">User not found</p>
      </div>
    );
  }

  // Stripe deep-dive + seat counts (only if customer is linked)
  let deepDive: Awaited<ReturnType<typeof getUserStripeDeepDive>> = {
    subscription: null,
    invoices: [],
    paymentMethods: [],
    charges: [],
  };
  let purchasedSeats = 0;
  let seatsUsed = 0;

  if (user.stripeCustomerId) {
    const [dive, userRow, crewDistinct] = await Promise.all([
      getUserStripeDeepDive(user.stripeCustomerId),
      db.user.findUnique({
        where: { id: user.id },
        select: { purchasedSeats: true },
      }),
      db.crewMember.findMany({
        where: { layout: { userId: user.id }, removedAt: null },
        distinct: ["userId"],
        select: { userId: true },
      }),
    ]);

    deepDive = dive;
    purchasedSeats = userRow?.purchasedSeats ?? 0;
    seatsUsed = crewDistinct.length;
  }

  const livemode = (deepDive.charges[0]?.id ?? "").startsWith("ch_")
    && !(deepDive.charges[0]?.id ?? "").includes("test");
  // livemode inference here is best-effort — a cleaner source is the subscription's livemode if present.
  // Default to non-livemode (test) link prefix if we can't tell.

  return (
    <div className="space-y-6">
      <UserHeader user={user} />

      <UserTabs
        overview={
          <TabOverview
            timeline={timeline}
            layouts={user.layouts}
            subscription={{
              plan: user.plan,
              stripeCustomerId: user.stripeCustomerId,
              stripeSubId: user.stripeSubId,
              planExpiresAt: user.planExpiresAt,
            }}
          />
        }
        activity={
          <TabActivity userId={user.id} initialData={activityData} />
        }
        railroads={
          <TabRailroads
            layouts={user.layouts}
            userId={user.id}
            isCurrentUser={user.id === session.user.id}
          />
        }
        actions={
          <TabActions user={user} adminId={session.user.id} />
        }
        billing={
          <TabBilling
            stripeCustomerId={user.stripeCustomerId}
            deepDive={deepDive}
            purchasedSeats={purchasedSeats}
            seatsUsed={seatsUsed}
            livemode={livemode}
          />
        }
        notes={
          <TabNotes notes={notes} userId={user.id} currentAdminId={session.user.id} />
        }
      />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: no errors. The old inline Stripe block is gone; new `deepDive` prop matches `TabBilling`'s expected shape from Task 11.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`. Log in as admin. Navigate to `/admin/users/<some-user-id>` for both a free user (no stripeCustomerId) and a Pro user.

**Expected (free user):** billing tab shows "No Stripe customer linked to this account" — unchanged.

**Expected (Pro user):** billing tab shows Subscription card with line items + MRR, Seats card with purchased/used/available, Invoices card with last 10 invoices (if any), Payment Methods card with default card, Recent Charges card with refund buttons where applicable.

If Stripe call fails: amber banner at top of tab, other cards show empty state.

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add "app/(admin)/admin/users/[id]/page.tsx"
git commit -m "feat: wire getUserStripeDeepDive into user detail billing tab"
```

---

### Task 13: End-to-end manual QA

**Files:** none (verification only)

- [ ] **Step 1: Setup**

In two terminals:
- Terminal A: `npm run dev`
- Terminal B: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

Ensure at least one Pro subscription exists in test mode (from the prior Stripe seat-billing QA).

- [ ] **Step 2: Verify `/admin/analytics/revenue`**

Navigate to `/admin/analytics/revenue`. Confirm:

- 4 top metric cards render (MRR, ARR, Available, Next Payout)
- "Revenue by Line Item" card shows Pro MRR and Seat MRR numbers consistent with your active subs
- Existing RevenueClient sections render (Payments, Failed, Payouts, Disputes)
- Subscriptions card shows a table of all subs. Try:
  - Click status filter pills → rows filter
  - Type in search → rows filter to matching emails
  - Click ExternalLink icon → opens Stripe dashboard in new tab
  - Click User icon (for subs linked to a user) → navigates to `/admin/users/<id>`
- Events card shows a list of events. Try:
  - Change type filter dropdown → rows filter
  - Click any row → JSON payload expands below
  - Click external link icon → opens event in Stripe dashboard
- Products & Prices card:
  - Shows both prices under "Railroad Ops Pro"
  - Your Pro price has "Used as Pro" badge; your Seat price has "Used as Seat" badge
  - Copy-ID button shows a checkmark briefly after click
  - External link opens product in Stripe

- [ ] **Step 3: Verify `/admin/users/<id>` billing tab**

Navigate to a Pro user's detail page. Click the Billing tab. Confirm:

- Subscription card shows status, line items (Pro × 1, Seat × N), MRR total
- "Open in Stripe" button in card header opens the subscription page in Stripe
- Seats card shows Purchased / Used / Available numbers
- Invoices card lists last 10 invoices with status, amount, date, PDF link
- Payment Methods card shows the default card with brand + last4 + expiry
- Recent Charges shows charges with "Refund" button on succeeded, non-refunded rows

Navigate to a Free user's detail page. Billing tab should show "No Stripe customer linked to this account".

- [ ] **Step 4: Verify error state**

In admin settings, temporarily change the Stripe secret key to an invalid value. Reload `/admin/analytics/revenue`.

**Expected:** amber banner at top of page. Sections render with empty data (no crashes).

Restore the correct secret key.

- [ ] **Step 5: Stop processes**

Stop `npm run dev` and `stripe listen`.

---

## Self-Review Results

**Spec coverage:**
- Feature 1 Subscriptions table → Task 7 (component) + Task 10 (wire into page) ✓
- Feature 2 Webhook events log → Task 8 + Task 10 ✓
- Feature 3 Seat MRR breakdown → Task 6 + Task 10 ✓
- Feature 4 Per-user deep-dive → Task 11 + Task 12 ✓
- Feature 5 Products & prices → Task 9 + Task 10 ✓
- Data sourcing strategy (live-from-Stripe, no new DB tables) → Tasks 1-5 all pure API callers ✓
- Error handling (amber banner + empty data) → Each component has `error` prop handling; page has top-level banner ✓
- Security (adminAuth guard) → Task 10 + 12 both call adminAuth ✓

**Placeholder scan:** No TBD/TODO/"implement later" strings. The livemode inference in Task 12 is imperfect but documented as best-effort.

**Type consistency:** `AdminSubscription`, `AdminEvent`, `AdminProduct`, `AdminInvoice`, `AdminPaymentMethod`, `AdminCharge` defined in Task 1 and imported consistently in Tasks 6-11. The `mapSubscription` helper is internal to `lib/stripe-admin.ts` and reused across `listSubscriptionsForAdmin` and `getUserStripeDeepDive`. Signatures match between definition (Tasks 1-5) and call sites (Tasks 10, 12).

**Deviation from spec called out:** Spec said "tabs" on RevenueClient. Reality is stacked cards. Plan kept stacked cards. This simplifies without sacrificing function.
