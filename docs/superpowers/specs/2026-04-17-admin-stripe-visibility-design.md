# Admin Stripe Visibility

## Summary

Extend the admin UI with complete visibility over Stripe state: every subscription, recent webhook events, seat-vs-base MRR breakdown, per-user billing deep-dive, and the configured products/prices. All data is queried live from the Stripe API on page render — no new database tables. Everything lands inside the existing `/admin/analytics/revenue` page (becomes the Stripe operations hub) plus an upgrade to the per-user billing tab.

## Scope

**In scope:**
- Subscriptions tab on `/admin/analytics/revenue` (all subs, filter by status, search by email)
- Webhook events tab on `/admin/analytics/revenue` (last ~30 days, filter by event type)
- Revenue-by-line-item card on `/admin/analytics/revenue` (base Pro MRR vs seat add-on MRR)
- Products & prices read-only card on `/admin/analytics/revenue`
- Upgrade to existing billing tab at `/admin/users/[id]` (rich subscription + invoices + payment methods)

**Out of scope:**
- Storing any Stripe data in our DB (live reads only)
- Dispute evidence submission UI (keep existing dispute listing)
- Coupons/promotion codes (no use case yet)
- Checkout Sessions log (not requested)
- Admin write actions beyond existing refund (no cancel, no quantity adjust from admin)

## Data Sourcing Strategy

**Live-from-Stripe (Option A).** Every admin page queries Stripe API on render. No webhook persistence, no new schema.

**Implications:**
- Stripe events API retains ~30 days — events tab is bounded to that window.
- If Stripe is down, admin pages render the amber "Stripe connection issue" banner and zero/empty data (pattern already used by existing revenue page).
- Rate limits are a theoretical concern — admin pages are low-traffic; caching is not required for v1.

## Architecture

### New module: `lib/stripe-admin.ts`

Admin-only Stripe query helpers, all typed. Auth check is done at the server-action / page level; these helpers assume authorized callers.

```ts
// Signatures only — implementation in plan
export async function listSubscriptionsForAdmin(opts: {
  status?: Stripe.Subscription.Status | "all";
  search?: string;                  // email substring
  startingAfter?: string;
  limit?: number;                   // default 50, max 100
}): Promise<{
  subscriptions: AdminSubscription[];
  hasMore: boolean;
  nextCursor: string | null;
  error?: string;
}>;

export async function listStripeEvents(opts: {
  type?: string;                    // e.g., "customer.subscription.updated"
  startingAfter?: string;
  limit?: number;
}): Promise<{
  events: AdminEvent[];
  hasMore: boolean;
  nextCursor: string | null;
  error?: string;
}>;

export async function getRevenueByLineItem(): Promise<{
  basePro: { mrr: number; subscriptionCount: number };
  seatAddOn: { mrr: number; totalSeats: number };
  error?: string;
}>;

export async function listProductsWithPrices(): Promise<{
  products: AdminProduct[];
  error?: string;
}>;

export async function getUserStripeDeepDive(
  stripeCustomerId: string
): Promise<{
  subscription: AdminSubscription | null;
  invoices: AdminInvoice[];        // last 10
  paymentMethods: AdminPaymentMethod[];
  charges: AdminCharge[];          // last 20 (existing data, kept)
  error?: string;
}>;
```

Each helper wraps its Stripe calls in try/catch and returns `{ ...emptyShape, error: message }` on failure. Callers render an amber banner when `error` is present.

### Types

Small admin-facing types that strip Stripe objects to what the UI actually needs. Keeps views decoupled from SDK changes.

```ts
// Placed in lib/stripe-admin.ts

export interface AdminSubscription {
  id: string;
  customer: { id: string; email: string | null };
  status: string;                        // "active" | "past_due" | "canceled" | "trialing" | ...
  currentPeriodEnd: string | null;       // ISO
  cancelAtPeriodEnd: boolean;
  mrr: number;                           // dollars, sum of recurring monthly-equivalent line items
  lineItems: Array<{
    id: string;
    priceId: string;
    priceNickname: string | null;
    quantity: number;
    unitAmount: number;                  // dollars
    interval: "month" | "year" | string;
  }>;
  createdAt: string;
}

export interface AdminEvent {
  id: string;
  type: string;
  createdAt: string;
  livemode: boolean;
  objectType: string | null;             // e.g., "customer", "subscription"
  objectId: string | null;
  payload: unknown;                      // full event.data.object, JSON
}

export interface AdminProduct {
  id: string;
  name: string;
  active: boolean;
  description: string | null;
  prices: Array<{
    id: string;
    nickname: string | null;
    unitAmount: number;                  // dollars
    currency: string;
    interval: "month" | "year" | null;
    active: boolean;
  }>;
}

export interface AdminInvoice {
  id: string;
  number: string | null;
  status: string;                        // "paid" | "open" | "draft" | "void" | "uncollectible"
  amountPaid: number;                    // dollars
  amountDue: number;                     // dollars
  currency: string;
  created: string;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
}

export interface AdminPaymentMethod {
  id: string;
  type: string;                          // typically "card"
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
```

### Existing revenue page structure

The current `/admin/analytics/revenue/page.tsx` renders 4 metric cards then `<RevenueClient>`, which is a client component holding payments/failed/payouts/disputes as tabs. This tab structure is extended — two new tabs added (Subscriptions, Events), and two new top-level cards added around it.

## Page Changes

### `/admin/analytics/revenue` (extended)

Final layout, top to bottom:

1. Existing 4 metric cards: MRR, ARR, Available Balance, Next Payout.
2. **NEW:** "Revenue by Line Item" card — two rows:
   - Base Pro: `${basePro.mrr}` MRR · `{basePro.subscriptionCount}` subscriptions
   - Seat Add-ons: `${seatAddOn.mrr}` MRR · `{seatAddOn.totalSeats}` seats purchased
3. Existing `<RevenueClient>` — tabs expand from 4 to 6:
   - Payments (existing)
   - Failed Payments (existing)
   - Payouts (existing)
   - Disputes (existing)
   - **NEW:** Subscriptions
   - **NEW:** Events
4. **NEW:** "Products & Prices" card at the bottom — table of products with nested prices and "Open in Stripe" links.

#### Subscriptions tab content

- Filter pills across the top: **All · Active · Past Due · Canceled · Trialing**. Default: All.
- Email search input (debounced, client-side filters the current page; no server round-trip for search in v1 since subscription count is small).
- Table columns:
  - Customer email
  - Status (badge)
  - Line items: `Pro × 1, Seat × N` pill row
  - MRR
  - Period end
  - Cancel at period end (icon if true)
  - Actions: "Open in Stripe" (external link), "Go to user" (internal link to `/admin/users/[id]` if we can resolve the customer → user)
- Pagination: "Load more" button at the bottom using Stripe cursor.

Data: `stripe.subscriptions.list({ status: "all", expand: ["data.customer", "data.items.data.price"], limit: 50 })`. Status filter is applied server-side when a specific status is chosen (Stripe's `status` param).

Customer → user mapping: query `db.user.findFirst({ where: { stripeCustomerId: <id> }, select: { id: true } })` per row. Batch this into a single findMany after receiving the subscription list to avoid N+1.

#### Events tab content

- Filter dropdown: event type. Pre-populated with the types we actually emit/care about:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `charge.refunded`
  - `charge.dispute.created`
  - `(all)`
- Table columns:
  - Timestamp (relative: "2 min ago", hover for absolute)
  - Event type (badge)
  - Livemode indicator (live/test)
  - Object type + ID (truncated, mono font)
  - Expand: click a row to reveal the full JSON payload in a collapsible panel
  - Link: "View in Stripe" → `https://dashboard.stripe.com/{livemode ? "" : "test/"}events/{id}`
- Pagination: "Load more" cursor-based.

Data: `stripe.events.list({ type: selected, limit: 50, starting_after: cursor })`.

#### Products & Prices card

- Title: "Products & Prices"
- Subtitle: "As configured in Stripe. Edit in the Stripe dashboard."
- Table per product:
  - Product name, active badge, ID
  - Nested rows: each price with nickname, amount, interval, price ID (mono), active badge
  - Row action: copy price ID button, "Open in Stripe" link
- If a price ID matches `getSetting("stripe.proPriceId")` or `getSetting("stripe.seatPriceId")`, annotate with a "Used as Pro" / "Used as Seat" badge to confirm configuration correctness.

Data: `stripe.products.list({ active: true, limit: 100 })` then for each, `stripe.prices.list({ product: productId, limit: 20 })`. Or a single `stripe.prices.list({ limit: 100, expand: ["data.product"] })` grouped client-side — fewer round-trips, preferred.

### `/admin/users/[id]` — billing tab upgrade

Replace the existing `components/admin/user-detail/tab-billing.tsx` with an expanded version. New layout:

1. **Subscription card** (if subscription exists):
   - Status badge, Stripe customer ID (mono), customer → portal link (copy or open), "Open subscription in Stripe" link
   - Current period: `{start} → {end}`, cancel-at-period-end flag
   - Line items table: price nickname, price ID, quantity, unit amount, interval
   - Plan MRR (calculated from line items)
2. **Seats card** (if the user is on Pro):
   - Purchased: `{purchasedSeats}` (from DB; matches Stripe line item quantity)
   - Used: `{seatsUsed}` (distinct crew members across the owner's layouts)
   - Available: `{total - used}`
3. **Invoices card**:
   - Last 10 invoices. Columns: number, amount, status, date, download PDF
4. **Payment methods card**:
   - Default card: brand (Visa/MC), last 4, exp month/year
   - Non-default methods listed below if any
5. **Recent charges card** (existing, kept):
   - Last 20 charges, amount/status/date, refund action (from existing `issueRefund` server action)

Error handling: if `stripeCustomerId` is null → single "No Stripe customer linked to this account" card, same as today. If Stripe call fails → amber banner at top of tab, other cards render empty.

### Nav

No sidebar changes. The Revenue page is already linked; extending it doesn't require nav work. If navigation would benefit from a sub-page label like "Revenue · Operations" — optional, out of scope.

## Error Handling

All server actions return `{ ...shape, error?: string }`. Pages detect `error` and render an amber banner above the affected section, matching the existing pattern in `/admin/analytics/revenue` (the `hasError` check with the amber border card).

If a single tab's data errors while others succeed, show the banner scoped to that tab — don't nuke the whole page.

## Security

All new server actions call `adminAuth()` and check `session.user.role === "ADMIN"`. Follows the existing pattern in `app/actions/admin/stripe-revenue.ts` and `app/actions/admin/settings.ts`. No new auth surface.

`getUserStripeDeepDive` is called with a `stripeCustomerId` from the user row — no direct admin-overridable lookup.

No write paths added. The only existing admin write is `issueRefund` from `stripe-revenue.ts`, which is preserved and exposed in the per-user deep-dive.

## Testing

Manual only (project has no test suite). Verify each of:
- Revenue page loads, all 6 tabs render, "Products & Prices" card shows both prices with correct "Used as Pro / Used as Seat" badges
- Subscriptions tab filters by status, email search narrows rows, "Load more" pagination works
- Events tab filters by event type, expand reveals JSON payload, "Load more" works
- Per-user billing tab: for a PRO user shows subscription+seats+invoices+payment methods; for a FREE user shows "No Stripe customer" message
- If you temporarily break Stripe config (wrong secret key), amber banner renders instead of crash

## Build Order

1. `lib/stripe-admin.ts` — types + `listSubscriptionsForAdmin` + `listStripeEvents` + `getRevenueByLineItem` + `listProductsWithPrices` + `getUserStripeDeepDive`. All in one file since they share Stripe client setup and the types are colocated.
2. Extend `/admin/analytics/revenue/page.tsx` to fetch the new data.
3. Add "Revenue by Line Item" card component.
4. Extend `<RevenueClient>` (the existing client component) to include 2 new tabs — Subscriptions and Events — with their own sub-components.
5. Add "Products & Prices" card component.
6. Replace `components/admin/user-detail/tab-billing.tsx` contents.
7. Call `getUserStripeDeepDive(stripeCustomerId)` from `app/(admin)/admin/users/[id]/page.tsx` in parallel with existing data fetches. Pass the result into `<TabBilling>` as a new prop. Do not modify the existing `getStripeDetails` action shape used elsewhere — leave it intact.
8. Manual QA.

## File Map

**New files:**
- `lib/stripe-admin.ts` — admin Stripe helpers + types
- `components/admin/analytics/revenue-by-line-item.tsx` — new card
- `components/admin/analytics/subscriptions-tab.tsx` — subs table (client component for filters)
- `components/admin/analytics/events-tab.tsx` — events table (client component for filters/expand)
- `components/admin/analytics/products-prices.tsx` — products card

**Modified files:**
- `app/(admin)/admin/analytics/revenue/page.tsx` — additional data fetches, new cards, new tabs wired
- `components/admin/analytics/revenue-client.tsx` — add 2 tabs (Subscriptions, Events)
- `components/admin/user-detail/tab-billing.tsx` — replace with richer layout
- `app/(admin)/admin/users/[id]/page.tsx` — fetch new deep-dive data if not already
