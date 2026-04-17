# Stripe Seat-Based Billing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing flat-rate Pro subscription ($5/mo) with an explicit-purchase per-seat crew add-on ($5/mo each), hard-cap at 10 total crew, and ship the missing `/dashboard/billing` UI.

**Architecture:** One Stripe subscription per Pro user with two line items — base Pro + seat add-on (quantity-driven). Webhook syncs seat quantity into a denormalized `User.purchasedSeats` column. Invite/redeem server actions gate on `1 + purchasedSeats`. Billing UI lives at `/dashboard/billing` with dedicated sub-pages for seat add/remove (no modals per project convention).

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma 6, Neon Postgres, Stripe SDK 2026-03-25.dahlia, NextAuth v5, shadcn/ui.

**Spec:** `docs/superpowers/specs/2026-04-17-stripe-seat-billing-design.md`

**Testing note:** This project has no automated test suite. Each task includes manual verification steps against the dev server and/or Stripe CLI (`stripe listen --forward-to localhost:3000/api/stripe/webhook`). Do not add a test framework as part of this plan.

---

## File Structure

**New files:**
- `app/(dashboard)/dashboard/billing/page.tsx` — billing overview (Server Component)
- `app/(dashboard)/dashboard/billing/seats/add/page.tsx` — add-seat confirmation
- `app/(dashboard)/dashboard/billing/seats/remove/page.tsx` — remove-seat confirmation
- `components/billing/seat-limit-callout.tsx` — reusable inline callout

**Modified files:**
- `prisma/schema.prisma` — add `purchasedSeats` column to User
- `lib/settings.ts` — add `stripe.seatPriceId` key
- `lib/stripe.ts` — extend `createCheckoutSession`, add `updateSeatQuantity`, `getSubscriptionSeatQuantity`
- `lib/limits.ts` — update `checkCrewLimit`, export seat constants
- `app/api/stripe/webhook/route.ts` — sync `purchasedSeats` from seat line item
- `app/actions/billing.ts` — add `purchaseSeat`, `removeSeat`, `getBillingOverview`
- `app/actions/crew.ts` — enrich seat-limit error shape in `inviteCrewMember`; add check to `acceptEmailInvite`
- `app/actions/invite-links.ts` — enrich seat-limit error shape in `joinViaInviteLink`
- `app/actions/admin/pricing.ts` — drop `layoutPackPrice` from defaults
- `app/pricing/page.tsx` — remove layout-pack copy, add crew-cap FAQ, update trailing paragraph
- `components/admin/settings-form.tsx` — add Seat Price ID field in Stripe section
- `app/(dashboard)/dashboard/railroad/[id]/crew/page.tsx` — render `SeatLimitCallout` above table
- `app/(dashboard)/dashboard/railroad/[id]/crew/invite/page.tsx` — render `SeatLimitCallout` above form

---

## Prerequisite: Stripe Setup (One-Time, Manual)

**Before starting Task 1**, the operator (human) must:

1. Run `stripe login` to authenticate the CLI to their Stripe account (test mode).
2. In the Stripe Dashboard → Products → find the existing "Railroad Ops Pro" product (or the one behind `stripe.proPriceId`).
3. Add a second Price to the same product:
   - Amount: **$5.00 USD**
   - Billing: **Recurring, Monthly**
   - Description: "Extra Crew Seat"
4. Copy the new Price ID (`price_...`) — it goes into admin settings during Task 2.
5. Start the webhook forwarder for local dev in a separate terminal:
   ```
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Copy the `whsec_...` signing secret and put it into `.env.local` as `STRIPE_WEBHOOK_SECRET` (or in admin settings after the app is running).

These are environment prerequisites, not code changes. No commit.

---

### Task 1: Add `purchasedSeats` column to User

**Files:**
- Modify: `prisma/schema.prisma` (User model, around line 229)
- Create: `prisma/migrations/<timestamp>_add_purchased_seats/migration.sql` (auto-generated)

- [ ] **Step 1: Add the column to the Prisma schema**

Edit `prisma/schema.prisma`. Find the User model's subscription section (currently):

```prisma
  // Subscription
  plan             Plan      @default(FREE)
  stripeCustomerId String?   @unique
  stripeSubId      String?   @unique
  planExpiresAt    DateTime?
```

Replace with:

```prisma
  // Subscription
  plan             Plan      @default(FREE)
  stripeCustomerId String?   @unique
  stripeSubId      String?   @unique
  planExpiresAt    DateTime?
  purchasedSeats   Int       @default(0)
```

- [ ] **Step 2: Generate and apply the migration**

Run: `npx prisma migrate dev --name add_purchased_seats`

Expected output: "Your database is now in sync with your schema." A new folder appears under `prisma/migrations/`. Prisma client regenerates automatically.

- [ ] **Step 3: Verify the column exists**

Run: `npx prisma studio`

In the browser that opens, go to the User table — confirm a new `purchasedSeats` column exists with default value `0` on all rows. Close Prisma Studio.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add purchasedSeats column to User for seat-based billing"
```

---

### Task 2: Add `stripe.seatPriceId` setting and admin field

**Files:**
- Modify: `lib/settings.ts:6-36` (SETTING_KEYS object)
- Modify: `components/admin/settings-form.tsx` (around line 125 keys array and line 251 Stripe section)

- [ ] **Step 1: Register the new setting key**

Edit `lib/settings.ts`. In `SETTING_KEYS`, in the Stripe section, add one line after the `stripe.proPriceId` entry:

```ts
  // Stripe
  "stripe.publishableKey": { envFallback: "STRIPE_PUBLISHABLE_KEY", sensitive: false },
  "stripe.secretKey": { envFallback: "STRIPE_SECRET_KEY", sensitive: true },
  "stripe.webhookSecret": { envFallback: "STRIPE_WEBHOOK_SECRET", sensitive: true },
  "stripe.proPriceId": { envFallback: "STRIPE_PRO_PRICE_ID", sensitive: false },
  "stripe.seatPriceId": { envFallback: "STRIPE_SEAT_PRICE_ID", sensitive: false },
```

- [ ] **Step 2: Expose the field in the admin settings form**

Edit `components/admin/settings-form.tsx`. Find the keys array at line 125 (it currently contains `"stripe.proPriceId"`). Add `"stripe.seatPriceId"` right after:

```ts
        "stripe.proPriceId",
        "stripe.seatPriceId",
```

Then find the existing Stripe proPriceId field block around line 251. Duplicate it directly below with the new key:

```tsx
          <SettingField
            settingKey="stripe.seatPriceId"
            label="Seat Price ID"
            setting={settings["stripe.seatPriceId"]}
            value={values["stripe.seatPriceId"]}
            onChange={(v) => updateValue("stripe.seatPriceId", v)}
            placeholder="price_1234..."
          />
```

(Match the exact prop order of the existing `stripe.proPriceId` field — they should be visually adjacent in the rendered form.)

- [ ] **Step 3: Manual verification**

Run: `npm run dev`

Navigate to `/admin/settings` (log in as admin first). In the Stripe section, confirm a new "Seat Price ID" field is visible under "Pro Price ID". Paste the Price ID from the Stripe Setup prerequisite into it and save. Reload — confirm the value persists. Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add lib/settings.ts components/admin/settings-form.tsx
git commit -m "feat: add stripe.seatPriceId setting and admin field"
```

---

### Task 3: Extend `createCheckoutSession` with seat line item

**Files:**
- Modify: `lib/stripe.ts:36-67` (createCheckoutSession function)

- [ ] **Step 1: Replace the createCheckoutSession function**

Edit `lib/stripe.ts`. Replace the current `createCheckoutSession` function (lines 36-67) with:

```ts
/**
 * Creates a Stripe Checkout session for the Pro plan.
 * Includes both the base Pro line item and the seat add-on (initial quantity 0).
 */
export async function createCheckoutSession(
  userId: string,
  userEmail: string,
  customerId?: string | null
): Promise<string> {
  const stripe = await getStripeClient();
  const [priceId, seatPriceId, appUrl] = await Promise.all([
    getSetting("stripe.proPriceId"),
    getSetting("stripe.seatPriceId"),
    getSetting("app.url"),
  ]);

  if (!priceId) {
    throw new Error("Stripe Pro price ID not configured.");
  }
  if (!seatPriceId) {
    throw new Error("Stripe Seat price ID not configured.");
  }

  const resolvedAppUrl = appUrl ?? "http://localhost:3000";

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      { price: priceId, quantity: 1 },
      { price: seatPriceId, quantity: 0, adjustable_quantity: { enabled: false } },
    ],
    success_url: `${resolvedAppUrl}/dashboard/billing?success=true`,
    cancel_url: `${resolvedAppUrl}/dashboard/billing?canceled=true`,
    client_reference_id: userId,
    metadata: { userId },
  };

  if (customerId) {
    sessionParams.customer = customerId;
  } else {
    sessionParams.customer_email = userEmail;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  return session.url!;
}
```

Note: Stripe does not accept `quantity: 0` on checkout line items with `price` directly. If Stripe rejects the checkout call with "Invalid quantity", fall back to omitting the seat line item at checkout and adding it on the first `customer.subscription.updated` webhook. See Task 6 fallback note.

- [ ] **Step 2: Manual verification (smoke)**

Run: `npm run dev` in one terminal, `stripe listen --forward-to localhost:3000/api/stripe/webhook` in another.

As a Free user, navigate to billing → click "Upgrade". Stripe Checkout opens.

**Expected:** Checkout page loads without error, showing "Railroad Ops Pro $5.00/month". Do NOT complete payment yet.

**If Stripe returns a "quantity: 0 not allowed" error**, apply the fallback in Task 6 by: (a) remove the seat line item from `sessionParams.line_items` in this task, (b) in Task 6's `checkout.session.completed` handler, call `stripe.subscriptionItems.create({ subscription, price: seatPriceId, quantity: 0 })` to add it after-the-fact.

Close the Checkout tab. Stop both processes.

- [ ] **Step 3: Commit**

```bash
git add lib/stripe.ts
git commit -m "feat: include seat add-on line item in Pro checkout session"
```

---

### Task 4: Add `updateSeatQuantity` and `getSubscriptionSeatQuantity` helpers

**Files:**
- Modify: `lib/stripe.ts` (append at end of file)

- [ ] **Step 1: Append the two helpers to lib/stripe.ts**

```ts
/**
 * Updates the seat line-item quantity on an existing Pro subscription.
 *
 * Proration behavior:
 *   - 'always_invoice' (use on add): Stripe generates and pays a prorated invoice
 *     immediately for the remaining days in the current period.
 *   - 'create_prorations' (use on remove): Stripe credits unused time as a proration
 *     item that reduces the next invoice; quantity drops immediately.
 */
export async function updateSeatQuantity(
  stripeSubId: string,
  newQuantity: number,
  prorationBehavior: "always_invoice" | "create_prorations"
): Promise<void> {
  const stripe = await getStripeClient();
  const seatPriceId = await getSetting("stripe.seatPriceId");
  if (!seatPriceId) throw new Error("Stripe Seat price ID not configured.");

  const subscription = await stripe.subscriptions.retrieve(stripeSubId, {
    expand: ["items.data"],
  });

  const seatItem = subscription.items.data.find(
    (item) => item.price.id === seatPriceId
  );

  if (!seatItem) {
    // Create the line item if it doesn't exist yet (handles the quantity:0 checkout fallback)
    await stripe.subscriptionItems.create({
      subscription: stripeSubId,
      price: seatPriceId,
      quantity: newQuantity,
      proration_behavior: prorationBehavior,
    });
    return;
  }

  await stripe.subscriptionItems.update(seatItem.id, {
    quantity: newQuantity,
    proration_behavior: prorationBehavior,
  });
}

/**
 * Reads the current seat line-item quantity from the live subscription.
 * Returns 0 if no seat line item exists.
 */
export async function getSubscriptionSeatQuantity(
  stripeSubId: string
): Promise<number> {
  const stripe = await getStripeClient();
  const seatPriceId = await getSetting("stripe.seatPriceId");
  if (!seatPriceId) return 0;

  const subscription = await stripe.subscriptions.retrieve(stripeSubId, {
    expand: ["items.data"],
  });

  const seatItem = subscription.items.data.find(
    (item) => item.price.id === seatPriceId
  );

  return seatItem?.quantity ?? 0;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: no errors. If Stripe SDK types complain about `proration_behavior`, confirm `stripe` is at a recent version (package.json).

- [ ] **Step 3: Commit**

```bash
git add lib/stripe.ts
git commit -m "feat: add updateSeatQuantity and getSubscriptionSeatQuantity helpers"
```

---

### Task 5: Sync `purchasedSeats` in webhook handlers

**Files:**
- Modify: `app/api/stripe/webhook/route.ts`

- [ ] **Step 1: Add seat-sync logic to `customer.subscription.updated`**

Edit `app/api/stripe/webhook/route.ts`. Find the `customer.subscription.updated` case (starts around line 52). Replace the entire case body with:

```ts
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const user = await db.user.findFirst({
          where: { stripeSubId: subscription.id },
        });
        if (!user) break;

        const periodEnd = subscription.items?.data?.[0]?.current_period_end;
        const seatPriceId = await getSetting("stripe.seatPriceId");
        const seatItem = subscription.items.data.find(
          (i) => i.price.id === seatPriceId
        );
        const purchasedSeats = seatItem?.quantity ?? 0;

        if (subscription.status === "active") {
          await db.user.update({
            where: { id: user.id },
            data: {
              plan: "PRO",
              planExpiresAt: periodEnd ? new Date(periodEnd * 1000) : null,
              purchasedSeats,
            },
          });
        } else if (subscription.status === "canceled" || subscription.status === "past_due") {
          await db.user.update({
            where: { id: user.id },
            data: {
              plan: "FREE",
              stripeSubId: null,
              planExpiresAt: null,
              purchasedSeats: 0,
            },
          });
        }
        break;
      }
```

- [ ] **Step 2: Reset `purchasedSeats` on `customer.subscription.deleted`**

In the same file, find the `customer.subscription.deleted` case (around line 83). Replace the update block with:

```ts
        await db.user.update({
          where: { id: user.id },
          data: {
            plan: "FREE",
            stripeSubId: null,
            planExpiresAt: null,
            purchasedSeats: 0,
          },
        });
```

- [ ] **Step 3: Initialize `purchasedSeats` on `checkout.session.completed`**

Find the `checkout.session.completed` case (starts around line 27). Replace the case body with:

```ts
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.client_reference_id ?? session.metadata?.userId;
        if (!userId) break;

        // Retrieve the subscription with items to capture initial seat quantity (should be 0)
        let purchasedSeats = 0;
        if (session.subscription) {
          const stripeClient = await getStripeClient();
          const sub = await stripeClient.subscriptions.retrieve(
            session.subscription as string,
            { expand: ["items.data"] }
          );
          const seatPriceId = await getSetting("stripe.seatPriceId");
          const seatItem = sub.items.data.find((i) => i.price.id === seatPriceId);
          purchasedSeats = seatItem?.quantity ?? 0;
        }

        await db.user.update({
          where: { id: userId },
          data: {
            plan: "PRO",
            stripeCustomerId: session.customer as string,
            stripeSubId: session.subscription as string,
            purchasedSeats,
          },
        });

        await logAudit({
          action: "billing.checkout.completed",
          adminId: "system",
          adminEmail: "stripe-webhook",
          entityType: "User",
          entityId: userId,
          metadata: { plan: "PRO", subscriptionId: session.subscription, purchasedSeats },
        });
        break;
      }
```

- [ ] **Step 4: Manual verification**

Run `npm run dev` and `stripe listen --forward-to localhost:3000/api/stripe/webhook` in parallel.

In a third terminal, fire a mock event:

```
stripe trigger customer.subscription.updated
```

Watch the `npm run dev` console. It should log the event being received without errors (500 responses indicate a code issue). If you see "Stripe Seat price ID not configured", confirm Task 2's admin save worked.

Stop processes.

- [ ] **Step 5: Commit**

```bash
git add app/api/stripe/webhook/route.ts
git commit -m "feat: sync purchasedSeats in Stripe webhook handlers"
```

---

### Task 6: Update `lib/limits.ts` with per-owner seat counting

**Files:**
- Modify: `lib/limits.ts`

- [ ] **Step 1: Rewrite lib/limits.ts**

Replace the entire contents of `lib/limits.ts` with:

```ts
import { db } from "@/lib/db";
import { Plan } from "@prisma/client";

// ─── Seat constants ─────────────────────────────────────────────────────
export const BASE_SEATS_PRO = 1;
export const MAX_TOTAL_CREW = 10;
export const MAX_EXTRA_SEATS = MAX_TOTAL_CREW - BASE_SEATS_PRO; // 9

const PLAN_LIMITS: Record<Plan, {
  maxLayouts: number;
  maxTotalItems: number;
  canExport: boolean;
}> = {
  FREE: {
    maxLayouts: 1,
    maxTotalItems: 50,
    canExport: false,
  },
  PRO: {
    maxLayouts: 5,
    maxTotalItems: Infinity,
    canExport: true,
  },
};

export function getPlanLimits(plan: Plan) {
  return PLAN_LIMITS[plan];
}

/**
 * Total item limit across countable categories for a user.
 * Free: 50 total. Pro: unlimited.
 */
export async function checkTotalItemLimit(
  userId: string
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });

  const plan = user?.plan ?? "FREE";
  const limit = getPlanLimits(plan).maxTotalItems;

  if (limit === Infinity) {
    return { allowed: true, current: 0, limit };
  }

  const [locations, locomotives, freightCars, passengerCars, mowEquipment, cabooses, trains] =
    await Promise.all([
      db.location.count({ where: { userId } }),
      db.locomotive.count({ where: { userId } }),
      db.freightCar.count({ where: { userId } }),
      db.passengerCar.count({ where: { userId } }),
      db.mOWEquipment.count({ where: { userId } }),
      db.caboose.count({ where: { userId } }),
      db.train.count({ where: { userId } }),
    ]);

  const current = locations + locomotives + freightCars + passengerCars + mowEquipment + cabooses + trains;
  return { allowed: current < limit, current, limit };
}

export async function checkRailroadLimit(
  userId: string
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });

  const plan = user?.plan ?? "FREE";
  const limit = getPlanLimits(plan).maxLayouts;

  if (limit === Infinity) {
    return { allowed: true, current: 0, limit };
  }

  const current = await db.layout.count({ where: { userId } });
  return { allowed: current < limit, current, limit };
}

export async function canExport(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  return getPlanLimits(user?.plan ?? "FREE").canExport;
}

/**
 * Seat-based crew limit.
 * Counts distinct userIds across ALL of the layout owner's layouts that are
 * either pending (acceptedAt null, removedAt null) or active (acceptedAt set,
 * removedAt null). Free users have 0 seats. Pro users have 1 + purchasedSeats,
 * capped at MAX_TOTAL_CREW (10).
 *
 * Signature preserved: takes layoutId; resolves to owner internally.
 */
export async function checkCrewLimit(
  layoutId: string
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const layout = await db.layout.findUnique({
    where: { id: layoutId },
    select: { userId: true, user: { select: { plan: true, purchasedSeats: true } } },
  });

  if (!layout) return { allowed: false, current: 0, limit: 0 };

  if (layout.user.plan !== "PRO") {
    return { allowed: false, current: 0, limit: 0 };
  }

  const limit = Math.min(
    BASE_SEATS_PRO + layout.user.purchasedSeats,
    MAX_TOTAL_CREW
  );

  const used = await db.crewMember.findMany({
    where: {
      layout: { userId: layout.userId },
      removedAt: null,
    },
    distinct: ["userId"],
    select: { userId: true },
  });

  return { allowed: used.length < limit, current: used.length, limit };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: no errors. If existing callers of `getPlanLimits(plan).maxCrew` fail to compile, grep for the callers and verify they've been updated — the new shape no longer has `maxCrew`.

```
npx tsc --noEmit 2>&1 | grep maxCrew
```

Expected: no output (no more references to `.maxCrew`).

- [ ] **Step 3: Commit**

```bash
git add lib/limits.ts
git commit -m "feat: seat-based crew limit with per-owner counting"
```

---

### Task 7: Update server actions to return richer seat-limit error

**Files:**
- Modify: `app/actions/crew.ts:60-63` (inviteCrewMember seat-limit error)
- Modify: `app/actions/crew.ts` (acceptEmailInvite — add seat check)
- Modify: `app/actions/invite-links.ts:129-132` (joinViaInviteLink seat-limit error)

- [ ] **Step 1: Enrich the `inviteCrewMember` error**

Edit `app/actions/crew.ts`. Find the seat-limit block (currently):

```ts
  // Check crew limit
  const limit = await checkCrewLimit(layoutId);
  if (!limit.allowed) {
    return { error: "Crew limit reached. Upgrade your plan to add more members." };
  }
```

Replace with:

```ts
  // Check crew limit
  const limit = await checkCrewLimit(layoutId);
  if (!limit.allowed) {
    return {
      error: "SEAT_LIMIT",
      message: `You're out of crew seats (${limit.current} of ${limit.limit} used). Add a seat to invite.`,
      current: limit.current,
      limit: limit.limit,
      upgradeUrl: "/dashboard/billing/seats/add",
    };
  }
```

- [ ] **Step 2: Add the seat check to `acceptEmailInvite`**

In the same file, find `acceptEmailInvite`. In the **email-only invite path** (the `try { const { payload } = await jwtVerify(...)`) block, after the "already a member" check and before the `db.crewMember.create` or update, insert:

```ts
    const limit = await checkCrewLimit(layoutId);
    if (!limit.allowed) {
      return {
        error: "SEAT_LIMIT",
        message: "This railroad is out of crew seats. Ask the owner to add a seat before you can accept.",
      };
    }
```

Place it right after the `if (existing?.acceptedAt && !existing?.removedAt)` block, above the `if (existing)` branch. The member-invite-token path (earlier in the function) does not need a check — those invites already consumed a seat at invite time.

- [ ] **Step 3: Enrich the `joinViaInviteLink` error**

Edit `app/actions/invite-links.ts`. Find the seat-limit block (currently):

```ts
  const limit = await checkCrewLimit(link.layoutId);
  if (!limit.allowed) {
    return { error: "This railroad has reached its crew member limit" };
  }
```

Replace with:

```ts
  const limit = await checkCrewLimit(link.layoutId);
  if (!limit.allowed) {
    return {
      error: "SEAT_LIMIT",
      message: "This railroad is out of crew seats. Ask the owner to add a seat.",
      current: limit.current,
      limit: limit.limit,
    };
  }
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`

Expected: no errors. If any caller relies on `.error === "Crew limit reached..."` strings, grep for them and update to `error === "SEAT_LIMIT"`:

```
npx tsc --noEmit 2>&1
```

- [ ] **Step 5: Commit**

```bash
git add app/actions/crew.ts app/actions/invite-links.ts
git commit -m "feat: enrich seat-limit error shape and add check to acceptEmailInvite"
```

---

### Task 8: Add `purchaseSeat`, `removeSeat`, `getBillingOverview` server actions

**Files:**
- Modify: `app/actions/billing.ts`

- [ ] **Step 1: Replace the contents of app/actions/billing.ts**

```ts
"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  createCheckoutSession,
  createCustomerPortalSession,
  updateSeatQuantity,
} from "@/lib/stripe";
import { db } from "@/lib/db";
import {
  BASE_SEATS_PRO,
  MAX_EXTRA_SEATS,
  MAX_TOTAL_CREW,
  checkCrewLimit,
  checkRailroadLimit,
  checkTotalItemLimit,
} from "@/lib/limits";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

export async function startCheckout() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { stripeCustomerId: true, email: true },
  });

  if (!user) throw new Error("User not found");

  const url = await createCheckoutSession(
    session.user.id,
    user.email,
    user.stripeCustomerId
  );

  redirect(url);
}

export async function openCustomerPortal() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    throw new Error("No Stripe customer found. Please subscribe first.");
  }

  const url = await createCustomerPortalSession(user.stripeCustomerId);
  redirect(url);
}

export async function purchaseSeat() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true, purchasedSeats: true, stripeSubId: true },
  });

  if (!user) throw new Error("User not found");
  if (user.plan !== "PRO") {
    return { error: "PLAN_REQUIRED", message: "Upgrade to Pro before adding seats." };
  }
  if (!user.stripeSubId) {
    return { error: "NO_SUBSCRIPTION", message: "No active subscription found." };
  }
  if (user.purchasedSeats >= MAX_EXTRA_SEATS) {
    return {
      error: "SEAT_CAP_EXCEEDED",
      message: `Crew capped at ${MAX_TOTAL_CREW}. Contact support if you need more.`,
    };
  }

  await updateSeatQuantity(
    user.stripeSubId,
    user.purchasedSeats + 1,
    "always_invoice"
  );

  await logAudit({
    action: "billing.seat.purchased",
    adminId: session.user.id,
    adminEmail: session.user.email ?? "",
    entityType: "User",
    entityId: session.user.id,
    metadata: { newSeatCount: user.purchasedSeats + 1 },
  });

  // DB row updates via webhook. Revalidate paths so fresh data appears after webhook fires.
  revalidatePath("/dashboard/billing");
  redirect("/dashboard/billing?seat=added");
}

export async function removeSeat() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true, purchasedSeats: true, stripeSubId: true, id: true },
  });

  if (!user) throw new Error("User not found");
  if (user.plan !== "PRO") {
    return { error: "PLAN_REQUIRED", message: "Not on Pro plan." };
  }
  if (!user.stripeSubId) {
    return { error: "NO_SUBSCRIPTION", message: "No active subscription found." };
  }
  if (user.purchasedSeats <= 0) {
    return { error: "NO_SEATS", message: "No purchased seats to remove." };
  }

  // Guard: don't allow removing a seat if all seats are currently occupied.
  const newLimit = Math.min(
    BASE_SEATS_PRO + (user.purchasedSeats - 1),
    MAX_TOTAL_CREW
  );
  const used = await db.crewMember.findMany({
    where: { layout: { userId: user.id }, removedAt: null },
    distinct: ["userId"],
    select: { userId: true },
  });
  if (used.length > newLimit) {
    return {
      error: "SEATS_OCCUPIED",
      message: "Remove a crew member first — all seats are currently occupied.",
    };
  }

  await updateSeatQuantity(
    user.stripeSubId,
    user.purchasedSeats - 1,
    "create_prorations"
  );

  await logAudit({
    action: "billing.seat.removed",
    adminId: session.user.id,
    adminEmail: session.user.email ?? "",
    entityType: "User",
    entityId: session.user.id,
    metadata: { newSeatCount: user.purchasedSeats - 1 },
  });

  revalidatePath("/dashboard/billing");
  redirect("/dashboard/billing?seat=removed");
}

export async function getBillingOverview() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      plan: true,
      stripeCustomerId: true,
      stripeSubId: true,
      planExpiresAt: true,
      purchasedSeats: true,
    },
  });

  if (!user) throw new Error("User not found");

  const totalSeats = user.plan === "PRO"
    ? Math.min(BASE_SEATS_PRO + user.purchasedSeats, MAX_TOTAL_CREW)
    : 0;

  // Count crew seats used across ALL of this owner's layouts
  const used = user.plan === "PRO"
    ? await db.crewMember.findMany({
        where: { layout: { userId: session.user.id }, removedAt: null },
        distinct: ["userId"],
        select: { userId: true },
      })
    : [];
  const seatsUsed = used.length;

  const [layoutsCheck, itemsCheck] = await Promise.all([
    checkRailroadLimit(session.user.id),
    checkTotalItemLimit(session.user.id),
  ]);

  return {
    plan: user.plan,
    renewalDate: user.planExpiresAt,
    stripeSubId: user.stripeSubId,
    purchasedSeats: user.purchasedSeats,
    totalSeats,
    seatsUsed,
    seatsAvailable: Math.max(0, totalSeats - seatsUsed),
    canAddSeat: user.plan === "PRO" && user.purchasedSeats < MAX_EXTRA_SEATS,
    canRemoveSeat: user.plan === "PRO" && user.purchasedSeats > 0,
    usage: {
      layouts: { current: layoutsCheck.current, limit: layoutsCheck.limit },
      items: { current: itemsCheck.current, limit: itemsCheck.limit },
    },
  };
}

export async function getUserBillingInfo() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      plan: true,
      stripeCustomerId: true,
      stripeSubId: true,
      planExpiresAt: true,
      purchasedSeats: true,
    },
  });

  return user;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/actions/billing.ts
git commit -m "feat: add purchaseSeat, removeSeat, getBillingOverview actions"
```

---

### Task 9: Build `/dashboard/billing` overview page

**Files:**
- Create: `app/(dashboard)/dashboard/billing/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getBillingOverview, startCheckout, openCustomerPortal } from "@/app/actions/billing";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Info, Plus, Minus, ExternalLink, Crown } from "lucide-react";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string; seat?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const overview = await getBillingOverview();
  const sp = await searchParams;

  const flash = sp.success
    ? { tone: "success" as const, title: "Welcome to Pro!", body: "Your subscription is active." }
    : sp.canceled
    ? { tone: "info" as const, title: "Checkout canceled", body: "No charges were made." }
    : sp.seat === "added"
    ? { tone: "success" as const, title: "Seat added", body: "Your new seat is ready to use. Next invoice will reflect the change." }
    : sp.seat === "removed"
    ? { tone: "success" as const, title: "Seat removed", body: "Credit for unused time will apply to your next invoice." }
    : null;

  const renewal = overview.renewalDate
    ? new Date(overview.renewalDate).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Manage your subscription and crew seats.
        </p>
      </div>

      {flash && (
        <Card
          className={
            flash.tone === "success"
              ? "border-primary/40 bg-primary/5"
              : "border-border"
          }
        >
          <CardContent className="flex items-start gap-3 pt-6">
            {flash.tone === "success" ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            ) : (
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium">{flash.title}</p>
              <p className="text-sm text-muted-foreground">{flash.body}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                Current Plan
                <Badge variant={overview.plan === "PRO" ? "default" : "secondary"}>
                  {overview.plan === "PRO" ? (
                    <>
                      <Crown className="mr-1 h-3 w-3" /> Pro
                    </>
                  ) : (
                    "Free"
                  )}
                </Badge>
              </CardTitle>
              {renewal && overview.plan === "PRO" && (
                <CardDescription>Renews on {renewal}</CardDescription>
              )}
              {overview.plan === "FREE" && (
                <CardDescription>
                  Upgrade to Pro for unlimited items, 5 layouts, and crew members.
                </CardDescription>
              )}
            </div>
            {overview.plan === "PRO" ? (
              <form action={openCustomerPortal}>
                <Button type="submit" variant="outline">
                  Manage Subscription
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </form>
            ) : (
              <form action={startCheckout}>
                <Button type="submit">Upgrade to Pro</Button>
              </form>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Usage card */}
      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
          <CardDescription>
            Your current usage against plan limits.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <UsageRow
            label="Layouts"
            current={overview.usage.layouts.current}
            limit={overview.usage.layouts.limit}
          />
          <UsageRow
            label="Items"
            current={overview.usage.items.current}
            limit={overview.usage.items.limit}
          />
          {overview.plan === "PRO" && (
            <UsageRow
              label="Crew Seats"
              current={overview.seatsUsed}
              limit={overview.totalSeats}
            />
          )}
        </CardContent>
      </Card>

      {/* Seats card (Pro only) */}
      {overview.plan === "PRO" && (
        <Card>
          <CardHeader>
            <CardTitle>Crew Seats</CardTitle>
            <CardDescription>
              1 seat included with Pro. Add extra seats for $5/month each (max 10 total).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-4">
              <div>
                <p className="text-sm font-medium">
                  {overview.totalSeats} total seat{overview.totalSeats === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-muted-foreground">
                  1 included + {overview.purchasedSeats} purchased
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm" disabled={!overview.canAddSeat}>
                  {overview.canAddSeat ? (
                    <Link href="/dashboard/billing/seats/add">
                      <Plus className="mr-1 h-4 w-4" />
                      Add seat
                    </Link>
                  ) : (
                    <span>
                      <Plus className="mr-1 h-4 w-4" />
                      Add seat
                    </span>
                  )}
                </Button>
                <Button asChild variant="outline" size="sm" disabled={!overview.canRemoveSeat}>
                  {overview.canRemoveSeat ? (
                    <Link href="/dashboard/billing/seats/remove">
                      <Minus className="mr-1 h-4 w-4" />
                      Remove seat
                    </Link>
                  ) : (
                    <span>
                      <Minus className="mr-1 h-4 w-4" />
                      Remove seat
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoices link (Pro only) */}
      {overview.plan === "PRO" && (
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="font-medium">Invoices & payment method</p>
              <p className="text-sm text-muted-foreground">
                Managed in the Stripe portal.
              </p>
            </div>
            <form action={openCustomerPortal}>
              <Button type="submit" variant="outline" size="sm">
                Open portal
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function UsageRow({
  label,
  current,
  limit,
}: {
  label: string;
  current: number;
  limit: number;
}) {
  const unlimited = limit === Infinity;
  const pct = unlimited ? 0 : Math.min(100, (current / Math.max(1, limit)) * 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {current} of {unlimited ? "Unlimited" : limit}
        </span>
      </div>
      {!unlimited && <Progress value={pct} className="h-1.5" />}
    </div>
  );
}
```

- [ ] **Step 2: Confirm `components/ui/progress.tsx` exists**

Run: `ls components/ui/progress.tsx`

Expected: file exists. If not: `npx shadcn@latest add progress` to add it.

- [ ] **Step 3: Manual verification**

Run `npm run dev`. Log in as any user. Navigate to `/dashboard/billing`.

**Expected (Free user):** "Free" badge, "Upgrade to Pro" button, Usage card shows Layouts X/1 and Items X/50. No Seats card.

**Expected (Pro user with 0 purchased seats):** "Pro" badge with crown, renewal date, "Manage Subscription" button, Usage card includes Crew Seats X/1, Seats card shows "1 total seat, 1 included + 0 purchased", "Add seat" enabled, "Remove seat" disabled.

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/dashboard/billing/page.tsx"
git commit -m "feat: add dashboard billing overview page"
```

---

### Task 10: Build `/dashboard/billing/seats/add` confirmation page

**Files:**
- Create: `app/(dashboard)/dashboard/billing/seats/add/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getBillingOverview, purchaseSeat } from "@/app/actions/billing";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export default async function AddSeatPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const overview = await getBillingOverview();

  if (overview.plan !== "PRO") redirect("/dashboard/billing");

  const renewalLabel = overview.renewalDate
    ? new Date(overview.renewalDate).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "the next billing date";

  const newTotal = overview.totalSeats + 1;

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/billing">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Add a Crew Seat</h1>
      </div>

      {!overview.canAddSeat ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <CardTitle>Maximum seats reached</CardTitle>
                <CardDescription>
                  You have {overview.totalSeats} seats, which is the current cap. Contact support if you need more.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/dashboard/billing">Back to billing</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Confirm</CardTitle>
            <CardDescription>
              You&rsquo;re about to add 1 crew seat for $5.00/month.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li>
                You&rsquo;ll be charged a prorated amount today for the remaining days in your current billing period.
              </li>
              <li>
                Your next invoice on <span className="font-medium">{renewalLabel}</span> will include this seat at $5.00.
              </li>
              <li>
                You&rsquo;ll have <span className="font-medium">{newTotal} seats</span> (1 included + {overview.purchasedSeats + 1} purchased).
              </li>
            </ul>

            <form action={purchaseSeat} className="flex gap-2 pt-2">
              <Button type="submit">Confirm — Add Seat</Button>
              <Button asChild variant="ghost">
                <Link href="/dashboard/billing">Cancel</Link>
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

Run `npm run dev` with `stripe listen` in parallel. As a Pro user, navigate to `/dashboard/billing/seats/add`.

**Expected:** Confirmation page renders. Click "Confirm — Add Seat". Stripe webhook logs show `invoice.created` and `customer.subscription.updated` events firing. Redirect back to `/dashboard/billing?seat=added` shows the green flash banner. Seats count increases to "2 total" (or whatever the new total is).

If you don't have a Pro user in test mode yet, first complete a Checkout with test card `4242 4242 4242 4242`.

Stop processes.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/dashboard/billing/seats/add/page.tsx"
git commit -m "feat: add seat-purchase confirmation page"
```

---

### Task 11: Build `/dashboard/billing/seats/remove` confirmation page

**Files:**
- Create: `app/(dashboard)/dashboard/billing/seats/remove/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getBillingOverview, removeSeat } from "@/app/actions/billing";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export default async function RemoveSeatPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const overview = await getBillingOverview();

  if (overview.plan !== "PRO") redirect("/dashboard/billing");
  if (overview.purchasedSeats <= 0) redirect("/dashboard/billing");

  const newTotal = overview.totalSeats - 1;
  const wouldOverflow = overview.seatsUsed > newTotal;

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/billing">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Remove a Crew Seat</h1>
      </div>

      {wouldOverflow ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <CardTitle>Can&rsquo;t remove seat right now</CardTitle>
                <CardDescription>
                  You currently have {overview.seatsUsed} crew members occupying {overview.totalSeats} seats. Remove a crew member first, then come back to remove the seat.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard/billing">Back to billing</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Confirm</CardTitle>
            <CardDescription>
              You&rsquo;re about to remove 1 crew seat.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li>
                The seat will be removed immediately. You&rsquo;ll have{" "}
                <span className="font-medium">{newTotal} seats</span> (1 included + {overview.purchasedSeats - 1} purchased).
              </li>
              <li>
                A credit for the unused portion of this billing period will be applied to your next invoice.
              </li>
            </ul>

            <form action={removeSeat} className="flex gap-2 pt-2">
              <Button type="submit" variant="destructive">
                Confirm — Remove Seat
              </Button>
              <Button asChild variant="ghost">
                <Link href="/dashboard/billing">Cancel</Link>
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

With `npm run dev` + `stripe listen` running, navigate to `/dashboard/billing/seats/remove` as a Pro user with at least one purchased seat.

**Expected:** Confirmation page renders. If seats aren't occupied, clicking "Confirm — Remove Seat" triggers Stripe update, redirects to `/dashboard/billing?seat=removed` with green flash. If seats ARE occupied (invite a crew member first to test), the error card appears instead of the confirm button.

Stop processes.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/dashboard/billing/seats/remove/page.tsx"
git commit -m "feat: add seat-removal confirmation page with occupied-seat guard"
```

---

### Task 12: Build `SeatLimitCallout` component

**Files:**
- Create: `components/billing/seat-limit-callout.tsx`

- [ ] **Step 1: Create the component**

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, ArrowRight } from "lucide-react";

export interface SeatLimitCalloutProps {
  /** Seats currently used */
  current: number;
  /** Seats available */
  limit: number;
  /** Whether the viewer can add a seat (i.e., is the owner and on Pro). If false, the CTA is hidden. */
  canManage: boolean;
}

export function SeatLimitCallout({ current, limit, canManage }: SeatLimitCalloutProps) {
  if (current < limit) return null;

  return (
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardContent className="flex items-start gap-3 pt-6">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium">
            You&rsquo;re out of crew seats ({current} of {limit} used)
          </p>
          <p className="text-sm text-muted-foreground">
            {canManage
              ? "Add a seat to invite another crew member."
              : "Ask the railroad owner to add a seat before inviting more crew."}
          </p>
        </div>
        {canManage && (
          <Button asChild size="sm">
            <Link href="/dashboard/billing/seats/add">
              Add a seat
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/billing/seat-limit-callout.tsx
git commit -m "feat: add SeatLimitCallout component"
```

---

### Task 13: Wire `SeatLimitCallout` into crew pages

**Files:**
- Modify: `app/(dashboard)/dashboard/railroad/[id]/crew/page.tsx`
- Modify: `app/(dashboard)/dashboard/railroad/[id]/crew/invite/page.tsx`

- [ ] **Step 1: Add the callout to the crew list page**

Edit `app/(dashboard)/dashboard/railroad/[id]/crew/page.tsx`. At the top with the other imports, add:

```ts
import { SeatLimitCallout } from "@/components/billing/seat-limit-callout";
import { checkCrewLimit } from "@/lib/limits";
```

In the `CrewPage` function, after the existing data fetches (after the `Promise.all` that fetches `owner`, `members`, `roles`, `inviteLinks`), add:

```ts
  const seatLimit = await checkCrewLimit(id);
```

Then, in the returned JSX, insert the callout right after the header div (between the `</div>` closing the flex header and wherever the members table renders). The exact placement will depend on current structure; look for where the crew members list begins. Insert:

```tsx
      <SeatLimitCallout
        current={seatLimit.current}
        limit={seatLimit.limit}
        canManage={ctx.isOwner}
      />
```

- [ ] **Step 2: Add the callout to the invite page**

Edit `app/(dashboard)/dashboard/railroad/[id]/crew/invite/page.tsx`. Add the same imports:

```ts
import { SeatLimitCallout } from "@/components/billing/seat-limit-callout";
import { checkCrewLimit } from "@/lib/limits";
```

Fetch the limit at the top of the page component (mirror the pattern). Render the callout above the invite form — when the limit is hit (`current >= limit`), the callout displays; when it's not, the callout returns null. The form can stay visible beneath so the user sees what they're about to be prompted for, but the actual submit will be blocked server-side.

If the page's submit handler or client form does not already surface the `SEAT_LIMIT` error, wire it so the returned `error === "SEAT_LIMIT"` displays the `message` field as a toast or form error (use `sonner` toast — already used elsewhere in the project).

- [ ] **Step 3: Manual verification**

Run `npm run dev`. As a Pro user, fill all 1+purchasedSeats with crew (use test Gmail aliases like `test+1@example.com` etc., each needs a real signup to accept). With all seats filled, navigate to `/dashboard/railroad/<id>/crew` and `/dashboard/railroad/<id>/crew/invite`.

**Expected:** Both pages show the amber "You're out of crew seats (N of N used)" callout with an "Add a seat" button. Clicking the button navigates to `/dashboard/billing/seats/add`.

For a non-owner crew member viewing the same pages, the callout should show the alternate message ("Ask the railroad owner to add a seat...") and no button.

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/dashboard/railroad/[id]/crew/page.tsx" "app/(dashboard)/dashboard/railroad/[id]/crew/invite/page.tsx"
git commit -m "feat: render SeatLimitCallout on crew list and invite pages"
```

---

### Task 14: Clean up pricing page (drop layout-pack copy, add crew-cap FAQ)

**Files:**
- Modify: `app/pricing/page.tsx`

- [ ] **Step 1: Update the FAQ and trailing copy**

Edit `app/pricing/page.tsx`.

**1a. Update the crew/layout FAQ entry.** Find the faq entry with question `"How do crew seats and extra layouts work?"` and replace with:

```tsx
    {
      q: "How do crew seats work?",
      a: `Pro includes 1 crew member. Need more? Each additional crew seat is $${pro.crewSeatPrice || "5"}/month. You can have up to 10 total crew members (1 included + up to 9 purchased).`,
    },
```

**1b. Add a new FAQ entry** right after the one above:

```tsx
    {
      q: "Is there a maximum number of crew members?",
      a: "Yes — 10 total (1 included with Pro plus up to 9 purchased seats). If you need more, contact support.",
    },
```

**1c. Update the trailing pricing-card paragraph.** Find:

```tsx
                <span className="font-medium text-foreground">
                  +${pro.crewSeatPrice || "5"}/mo per additional crew seat or
                  5-layout pack.
                </span>
```

Replace with:

```tsx
                <span className="font-medium text-foreground">
                  +${pro.crewSeatPrice || "5"}/mo per additional crew seat.
                </span>
```

**1d. Remove the "Additional Layout Packs" comparison row.** Find:

```tsx
                    <ComparisonRow
                      feature="Additional Layout Packs"
                      free="—"
                      pro="$5/mo per 5"
                    />
```

Delete those four lines.

- [ ] **Step 2: Manual verification**

Run `npm run dev`. Open `/pricing`.

**Expected:** No mention of "layout packs" anywhere on the page. The FAQ shows one crew-seat question and one new crew-cap question. The comparison table no longer has the "Additional Layout Packs" row but still has "Additional Crew Seats $5/mo each".

Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add app/pricing/page.tsx
git commit -m "docs: drop layout-pack copy from pricing, add crew-cap FAQ"
```

---

### Task 15: Drop `layoutPackPrice` from admin pricing defaults

**Files:**
- Modify: `app/actions/admin/pricing.ts`

- [ ] **Step 1: Remove `layoutPackPrice` from Pro defaults**

Edit `app/actions/admin/pricing.ts`. In the `DEFAULTS` object, in the `pro` tier's features array, remove the last entry:

```ts
      "Additional 5-layout packs $5/mo each",
```

Also in the `pro` object, remove:

```ts
    layoutPackPrice: "5",
```

Then in the `PricingTier` interface near the top, remove the optional field:

```ts
  layoutPackPrice?: string;
```

And in `getTierFromDb`, remove the block that reads `pricing.pro.layoutPackPrice`:

```ts
    const [crewSeatPrice, layoutPackPrice] = await Promise.all([
      getSetting("pricing.pro.crewSeatPrice" as SettingKey),
      getSetting("pricing.pro.layoutPackPrice" as SettingKey),
    ]);
    result.crewSeatPrice = crewSeatPrice || defaults.crewSeatPrice;
    result.layoutPackPrice = layoutPackPrice || defaults.layoutPackPrice;
```

Replace with:

```ts
    const crewSeatPrice = await getSetting("pricing.pro.crewSeatPrice" as SettingKey);
    result.crewSeatPrice = crewSeatPrice || defaults.crewSeatPrice;
```

And in `updatePricingTier`, remove the layoutPackPrice setSetting call:

```ts
    ...(tier === "pro" && data.layoutPackPrice
      ? [setSetting("pricing.pro.layoutPackPrice" as SettingKey, data.layoutPackPrice, session.user.id)]
      : []),
```

Leave `pricing.pro.layoutPackPrice` in `SETTING_KEYS` (lib/settings.ts) — it does no harm and staying there avoids migration noise. Mark it mentally as deprecated.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: no errors. If the admin pricing UI references `layoutPackPrice`, you'll see errors there — remove those references too.

- [ ] **Step 3: Commit**

```bash
git add app/actions/admin/pricing.ts
git commit -m "chore: drop layoutPackPrice from pricing config defaults"
```

---

### Task 16: End-to-end manual QA

**Files:** none (verification only)

- [ ] **Step 1: Setup**

In three terminals:
- Terminal A: `npm run dev`
- Terminal B: `stripe listen --forward-to localhost:3000/api/stripe/webhook` — copy the `whsec_...` into `.env.local` (or admin settings) if not already done
- Terminal C: free for `stripe trigger` commands as needed

- [ ] **Step 2: Run the full flow**

Test each of these, verifying expected behavior:

**Free → Pro:**
1. Sign up as a new user → `plan = FREE`, `purchasedSeats = 0`.
2. Go to `/dashboard/billing` → "Upgrade to Pro" button visible.
3. Click → Stripe Checkout opens.
4. Pay with `4242 4242 4242 4242`, any future expiry, any CVC.
5. Redirected to `/dashboard/billing?success=true` with success banner.
6. Check DB (via Prisma Studio): `plan = PRO`, `stripeSubId` set, `purchasedSeats = 0`.

**Invite first (included) crew member:**
7. Create a layout.
8. Go to `/dashboard/railroad/<id>/crew/invite`.
9. Invite `yourself+test1@gmail.com`. Should succeed (1 of 1 seats used).
10. Accept the invite (via a second browser / incognito). Crew member now active.

**Hit the seat cap:**
11. Try to invite `yourself+test2@gmail.com`. **Expected:** `SEAT_LIMIT` error; callout appears showing "1 of 1 used"; "Add a seat" button visible.

**Purchase a seat:**
12. Click "Add a seat" → `/dashboard/billing/seats/add` page → "Confirm — Add Seat".
13. Webhook logs show `invoice.created` → `invoice.paid` → `customer.subscription.updated` (with seat item quantity=1).
14. Redirect to `/dashboard/billing?seat=added`. Banner shows.
15. Seats card now reads "2 total seats (1 included + 1 purchased)".

**Invite the second crew member:**
16. Return to `/dashboard/railroad/<id>/crew/invite`. Callout is gone.
17. Invite `yourself+test2@gmail.com`. Should succeed (2 of 2 used).

**Cap enforcement at 10:**
18. In Prisma Studio, set `purchasedSeats = 9`. Refresh billing page — "Add seat" button disabled.
19. Navigate directly to `/dashboard/billing/seats/add` — "Maximum seats reached" error card appears.

**Remove seat (unoccupied):**
20. Reset `purchasedSeats = 1`. Remove the second crew member from `/crew` (use the Remove action). Go to `/dashboard/billing/seats/remove` → "Confirm — Remove Seat".
21. Webhook logs show `customer.subscription.updated` with seat quantity=0.
22. Redirect with success banner. Seats card back to "1 total (1 included + 0 purchased)".

**Remove seat (occupied — should block):**
23. Set `purchasedSeats = 1` again and re-invite a second crew member who accepts.
24. Go to `/dashboard/billing/seats/remove` → error card displays "Can't remove seat right now" with crew-count explanation. No confirm button.

**Cancel subscription:**
25. Click "Manage Subscription" → Stripe portal. Cancel the subscription.
26. Webhook fires `customer.subscription.deleted` → `plan = FREE`, `purchasedSeats = 0`.
27. Refresh `/dashboard/billing` — back to Free tier.

**Downgrade data check:**
28. Crew members preserved (CrewMember rows still have `removedAt = null`) but access middleware should block them since owner is FREE. Verify by logging in as the crew member — they shouldn't see the layout.

**Past-due downgrade:**
29. Re-upgrade and use test card `4000 0000 0000 0341` (attaches but fails on recurring charge).
30. Use `stripe trigger invoice.payment_failed --stripe-subscription=<sub_id>` or wait for dunning. Eventually `customer.subscription.updated` fires with `status=past_due`.
31. Verify user is immediately downgraded to FREE (no grace period).

- [ ] **Step 3: Fix any issues**

If any step fails, trace the issue to the relevant task and add follow-up commits. Common issues:
- Webhook 500s → check the route logs, verify `STRIPE_WEBHOOK_SECRET` matches the one from `stripe listen` output
- "Seat price ID not configured" → return to admin settings, paste the Price ID
- Type errors in `createCheckoutSession` with `quantity: 0` → apply the Task 3 fallback note

- [ ] **Step 4: Stop processes**

Stop all three terminals when QA passes end-to-end.

---

## Self-Review Results

(Completed during plan drafting — no further action needed.)

**Spec coverage:** Every requirement in `docs/superpowers/specs/2026-04-17-stripe-seat-billing-design.md` has a matching task. Cross-check:
- Schema change → Task 1
- Setting key → Task 2
- Stripe checkout with seat item → Task 3
- `updateSeatQuantity`/`getSubscriptionSeatQuantity` → Task 4
- Webhook seat sync → Task 5
- `checkCrewLimit` per-owner → Task 6
- Enforcement in crew/invite-links → Task 7
- `purchaseSeat`/`removeSeat`/`getBillingOverview` → Task 8
- Billing UI (3 pages) → Tasks 9, 10, 11
- SeatLimitCallout + wiring → Tasks 12, 13
- Pricing page cleanup → Task 14
- Admin pricing defaults cleanup → Task 15
- Manual QA → Task 16

**Placeholder scan:** No "TBD", "TODO", or "implement later" wording. Task 13 has one soft spot — the "exact placement will depend on current structure" note for the crew list page. That's because the surrounding JSX structure isn't captured in the plan; the implementer reads the file and picks the obvious insertion point (above the members table, below the header). This is a judgment call, not a gap.

**Type consistency:** `BASE_SEATS_PRO`, `MAX_EXTRA_SEATS`, `MAX_TOTAL_CREW` are declared in `lib/limits.ts` (Task 6) and imported by `app/actions/billing.ts` (Task 8). `updateSeatQuantity` signature matches between Task 4 definition and Task 8 call sites. `getBillingOverview` return shape (Task 8) matches what `/dashboard/billing` (Task 9) and its sub-pages (Tasks 10-11) consume.
