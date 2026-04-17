# Stripe Seat-Based Billing for Pro Add-Ons

## Summary

Extend the existing flat-rate Pro subscription ($5/mo) to support explicit purchase of extra crew seats ($5/mo each) on the same subscription. Build the missing `/dashboard/billing` page, gate crew invites on purchased seat capacity, and keep the architecture minimal (two tiers, one add-on, no annual, no layout packs, no grace period) per the "start simple, see where it goes" scope.

## Scope

**In scope (v1):**
- Pro subscription with two line items: base Pro ($5/mo) + extra crew seat ($5/mo, quantity-driven).
- Explicit purchase-first seat model — inviting past capacity is blocked with an upgrade CTA.
- Per-owner seat count (not per-layout).
- Hard ceiling: 10 total crew (1 included + up to 9 purchased).
- Pending invites + active crew both count against seats; invite links do not reserve seats but block at redemption.
- `/dashboard/billing` overview page, `/dashboard/billing/seats/add`, `/dashboard/billing/seats/remove`.
- Inline invite-blocked callouts on crew pages.
- Webhook handling for seat quantity changes.
- Immediate downgrade to FREE on `past_due` / `canceled` (no grace period — current behavior preserved).

**Out of scope (defer):**
- Annual billing.
- Layout packs (remove "+$5/mo per 5-layout pack" copy from pricing page and FAQ).
- Proration preview math in our UI (show a fixed line: "Charged prorated for remaining days").
- Grace period on failed payment.

## Billing Model

| Plan | Price | Layouts | Items | Crew |
|---|---|---|---|---|
| Free | $0 | 1 | 50 | 0 |
| Pro | $5/mo | 5 | Unlimited | 1 included + up to 9 purchased |
| Extra Crew Seat | +$5/mo per seat | — | — | +1 each |

## Stripe Configuration

**One Product, two Prices:**
- Product: `Railroad Ops Pro`
- Price `stripe.proPriceId` — $5/mo recurring (already configured)
- Price `stripe.seatPriceId` — $5/mo recurring (new)

Stored in `SystemSetting` (DB-backed, env fallback for local dev):
- `stripe.secretKey` — existing
- `stripe.webhookSecret` — existing
- `stripe.proPriceId` — existing
- `stripe.seatPriceId` — new

**Subscription structure** — one subscription per Pro user containing two line items:
- Line item 1: price = `stripe.proPriceId`, quantity = 1
- Line item 2: price = `stripe.seatPriceId`, quantity = `purchasedSeats`

At checkout for a new Pro user, both line items are included with seat quantity = 0. Seat purchases and removals are `stripe.subscriptionItems.update()` calls that change the quantity of the seat line item only; the base Pro line item is never touched.

## Data Model Changes

**Prisma — add one column to `User`:**

```prisma
model User {
  // ... existing fields ...
  purchasedSeats Int @default(0)   // extra seats beyond the 1 included in Pro
}
```

`purchasedSeats` is a denormalized cache of the seat line-item quantity in the Stripe subscription. The Stripe subscription is authoritative; the webhook syncs this column on every subscription update.

**One migration** added via `npx prisma migrate dev --name add_purchased_seats`. Existing users default to 0 (they still get the 1 included seat on Pro; nothing is lost).

## `lib/stripe.ts` — Additions

```ts
// New helpers alongside existing createCheckoutSession / createCustomerPortalSession

export async function createCheckoutSession(
  userId: string,
  userEmail: string,
  customerId?: string | null,
): Promise<string>
// Updated: include both line items (pro quantity 1, seat quantity 0).

export async function updateSeatQuantity(
  stripeSubId: string,
  newQuantity: number,
  prorationBehavior: 'always_invoice' | 'create_prorations',
): Promise<void>
// Locates the seat line item on the subscription, updates its quantity.
// Both paths change quantity immediately (Stripe has no native "change at period end" for
// line-item quantity without Subscription Schedules, which are out of scope).
// Proration behavior:
//   - 'always_invoice' on add: Stripe generates and attempts to pay a prorated invoice
//     immediately for the remaining days in the current period. User is charged today.
//   - 'create_prorations' on remove: Stripe credits the unused time to the customer's
//     balance as a proration item; the credit reduces the next invoice. Quantity drops
//     immediately.

export async function getSubscriptionSeatQuantity(
  stripeSubId: string,
): Promise<number>
// Reads current seat quantity from the live subscription (used for reconciliation).
```

## Seat Enforcement

**Constants** (`lib/limits.ts`):
```ts
const BASE_SEATS_PRO = 1;
const MAX_TOTAL_CREW = 10;
const MAX_EXTRA_SEATS = MAX_TOTAL_CREW - BASE_SEATS_PRO; // 9
```

**Seat limit computation** — per owner, across all their layouts:
```ts
export async function checkCrewLimit(ownerId: string) {
  const user = await db.user.findUnique({
    where: { id: ownerId },
    select: { plan: true, purchasedSeats: true },
  });
  if (user?.plan !== 'PRO') return { allowed: false, current: 0, limit: 0 };

  const limit = Math.min(BASE_SEATS_PRO + user.purchasedSeats, MAX_TOTAL_CREW);

  const used = await db.crewMember.findMany({
    where: { layout: { userId: ownerId }, removedAt: null },
    distinct: ['userId'],
    select: { userId: true },
  });

  return { allowed: used.length < limit, current: used.length, limit };
}
```

Pending (acceptedAt null, removedAt null) and active (acceptedAt set, removedAt null) both count. Distinct on `userId` so one person invited to two layouts of the same owner counts once.

**Enforcement points:**
1. `app/actions/crew.ts` → `inviteCrewMember()` — check before insert; return `{ error: 'SEAT_LIMIT', ... }` on fail.
2. `app/actions/crew.ts` → `acceptInvite()` — re-check (defense in depth against accept races).
3. `app/actions/invite-links.ts` → `redeemInviteLink()` — check before creating CrewMember; return user-facing error.
4. `lib/limits.ts` — update `PLAN_LIMITS.PRO.maxCrew` from `Infinity` to computed; existing callers keep working.

**Error shape** (returned from server actions):
```ts
type SeatLimitError = {
  error: 'SEAT_LIMIT';
  message: string;
  current: number;
  limit: number;
  upgradeUrl: '/dashboard/billing/seats/add';
};
```

## Billing Server Actions

**`app/actions/billing.ts` — extend:**

```ts
// existing: startCheckout(), openCustomerPortal(), getUserBillingInfo()

export async function purchaseSeat(): Promise<{ success: true } | { error: string }>
// Validates: plan === 'PRO', purchasedSeats < MAX_EXTRA_SEATS.
// Calls updateSeatQuantity(stripeSubId, purchasedSeats + 1, 'always_invoice').
// Stripe bills the prorated amount immediately; user is charged today.
// Does NOT update DB directly — webhook (customer.subscription.updated) does.
// Redirects to /dashboard/billing?seat=added.

export async function removeSeat(): Promise<{ success: true } | { error: string }>
// Validates: plan === 'PRO', purchasedSeats > 0.
// Calls updateSeatQuantity(stripeSubId, purchasedSeats - 1, 'create_prorations').
// Seat quantity drops immediately in Stripe; Stripe credits the unused time as a
// proration item that reduces the next invoice.
// Does NOT update DB directly — webhook updates purchasedSeats.
// Redirects to /dashboard/billing?seat=removed.

export async function getBillingOverview(): Promise<{
  plan: 'FREE' | 'PRO';
  renewalDate: Date | null;
  stripeSubId: string | null;
  purchasedSeats: number;
  totalSeats: number;
  seatsUsed: number;
  seatsAvailable: number;
  canAddSeat: boolean;        // purchasedSeats < MAX_EXTRA_SEATS
  canRemoveSeat: boolean;     // purchasedSeats > 0
  usage: {
    layouts: { current: number; limit: number };
    items: { current: number; limit: number };
  };
}>
```

## Webhook Updates

`app/api/stripe/webhook/route.ts` — one new/changed handler:

**`customer.subscription.updated`** (extend existing) — also sync seat quantity:
```ts
// existing: plan + planExpiresAt sync
// add:
const seatItem = subscription.items.data.find(
  (i) => i.price.id === (await getSetting('stripe.seatPriceId'))
);
const purchasedSeats = seatItem?.quantity ?? 0;

await db.user.update({
  where: { id: user.id },
  data: { plan, planExpiresAt, purchasedSeats },
});
```

On `customer.subscription.deleted`: also reset `purchasedSeats` to 0.
On `checkout.session.completed`: retrieve the created subscription (with items expanded) to capture initial seat quantity — will be 0 at checkout time.

Existing webhook logic for `past_due` → FREE is preserved (no grace period).

## UI

### Routes

```
/dashboard/billing                        — overview (Server Component)
/dashboard/billing/seats/add              — confirm add (Server Component + form action)
/dashboard/billing/seats/remove           — confirm remove (Server Component + form action)
```

No modals. All actions are dedicated pages per project convention.

### `/dashboard/billing` — Overview

Server Component. Fetches `getBillingOverview()` once.

Layout (top to bottom, card-based, matching existing shadcn/ui aesthetic):

1. **Plan card** — plan badge (Free/Pro), renewal date, Manage Subscription button (Pro → Stripe portal) OR Upgrade to Pro button (Free → Stripe Checkout).
2. **Usage card** — three rows with progress bars:
   - Layouts: `X of 5` (Pro) or `X of 1` (Free)
   - Items: `X of Unlimited` (Pro, no bar) or `X of 50` (Free)
   - Crew: `X of Y` where Y = `1 + purchasedSeats`
3. **Seats card** (Pro only) — "1 included + N purchased = M total". Add a Seat button (`/dashboard/billing/seats/add`, disabled at cap). Remove a Seat button (`/dashboard/billing/seats/remove`, disabled at 0 purchased).
4. **Invoices link** — "View invoices in Stripe" → portal.
5. **Flash banners** — read query params `?success`, `?canceled`, `?seat=added`, `?seat=removed` and render a dismissible success/info banner.

### `/dashboard/billing/seats/add` — Confirm

Content:
- Heading: "Add a Crew Seat"
- Body: "You're about to add 1 crew seat for $5.00/month. You'll be charged a prorated amount today for the remaining days in your current billing period. Your next invoice on [date] will include this seat."
- After: "You'll have M+1 seats (1 included + {purchasedSeats+1} purchased)."
- Primary button: "Confirm — Add Seat" (form action → `purchaseSeat()`)
- Secondary link: "Cancel" → `/dashboard/billing`

### `/dashboard/billing/seats/remove` — Confirm

Content:
- Heading: "Remove a Crew Seat"
- Body: "You're about to remove 1 crew seat. The seat will be removed immediately, and a credit for the unused portion of this billing period will be applied to your next invoice."
- If removal would leave `seatsUsed > newLimit` (i.e., operator has crew occupying all seats): **block** — render an error card instead of a confirm button: "You can't remove this seat while all your seats are occupied. Remove a crew member first, then come back to remove the seat." With a link to the crew management page.
- Otherwise: primary button "Confirm — Remove Seat"; secondary link "Cancel" → `/dashboard/billing`.

### Invite-Blocked UX

Location: `app/(dashboard)/dashboard/railroad/[id]/crew/invite/page.tsx` and the crew list page.

When `checkCrewLimit()` returns `allowed: false`, render a compact inline callout above the form/list:

```
┌─────────────────────────────────────────────────────┐
│ You're out of crew seats (3 of 3 used)              │
│ Add a seat to invite another crew member.           │
│                            [ Add a seat → ]         │
└─────────────────────────────────────────────────────┘
```

Links to `/dashboard/billing/seats/add`.

## Pricing Page Updates

File: `app/pricing/page.tsx`.

- Remove FAQ Q "How do crew seats and extra layouts work?" layout-pack copy; replace with crew-seat-only wording.
- Remove comparison table row `"Additional Layout Packs"`.
- Remove trailing paragraph mentioning "or 5-layout pack".
- Add FAQ Q: "Is there a maximum number of crew members?" A: "Yes — you can have up to 10 crew members (1 included with Pro, plus up to 9 purchased seats). Need more? Contact support."

Admin pricing config (`app/actions/admin/pricing.ts`) — drop `layoutPackPrice` (or leave unused for now, but stop reading it).

## Edge Cases & Decisions

| Case | Behavior |
|---|---|
| Pro user's card fails, sub goes `past_due` | Immediate downgrade to FREE (existing behavior, no grace) |
| Pro → Free downgrade with active crew | Crew rows preserved (`removedAt` not set); middleware blocks access because owner is on Free. Re-upgrade restores access. |
| Pro → Free downgrade with purchasedSeats > 0 | Webhook sets `purchasedSeats` = 0 on `subscription.deleted` |
| User invited to 2 layouts of same owner | Counts as 1 seat used (distinct `userId`) |
| Race: 2 invites accepted simultaneously, only 1 seat left | `acceptInvite()` re-checks; the second accept fails with `SEAT_LIMIT` |
| User tries to buy 11th seat | Server action rejects with `SEAT_CAP_EXCEEDED`; UI button already disabled |
| User hits "Remove seat" but has crew occupying all seats | Removal is **blocked** — confirmation page renders an error card telling them to remove a crew member first. Server action `removeSeat()` also rejects with `SEATS_OCCUPIED` as defense in depth. |
| Local dev without admin settings configured | `lib/stripe.ts` reads env vars as fallback (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`, `STRIPE_SEAT_PRICE_ID`) |

## Testing

- Manual: local dev with `stripe listen --forward-to localhost:3000/api/stripe/webhook` and Stripe test mode. Run full flows: signup → upgrade → add seat → invite crew → remove seat → cancel.
- No automated tests added in v1 (project has no test suite currently; adding one is out of scope).

## Build Order

1. Schema migration (`purchasedSeats` column).
2. `lib/stripe.ts` additions (`updateSeatQuantity`, extend `createCheckoutSession`).
3. Webhook seat-sync logic.
4. `lib/limits.ts` — update `checkCrewLimit`, add constants.
5. Enforcement in `crew.ts` and `invite-links.ts` (seat check + `SEAT_LIMIT` error).
6. `app/actions/billing.ts` — add `purchaseSeat`, `removeSeat`, `getBillingOverview`.
7. `/dashboard/billing` overview page.
8. `/dashboard/billing/seats/add` + `/dashboard/billing/seats/remove` pages.
9. Inline invite-blocked callouts (invite page + crew list page).
10. Pricing page cleanup (drop layout-pack copy, add crew-max FAQ).
11. Admin settings form: add "Seat Price ID" field.
12. Manual QA through Stripe test mode.

## Rollout

No feature flag. Existing Pro users pre-migration get `purchasedSeats = 0` (they still have their 1 included seat; nothing changes for them). Once live, a reconciliation note: if any Pro user in Stripe happens to have a seat line item with quantity > 0 (shouldn't, since this is new), a manual sync run via `getSubscriptionSeatQuantity()` brings their DB row in line.
