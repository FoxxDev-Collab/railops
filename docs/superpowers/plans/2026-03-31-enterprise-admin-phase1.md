# Enterprise Admin Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Analytics & BI, Operational Health, Enhanced User Detail, and Stripe Revenue dashboards for the RailOps admin panel.

**Architecture:** Purpose-built Prisma models (UserActivity, DailyMetric, SystemMetric, ErrorLog, AdminNote) with server actions for data access. Recharts for visualization. Clean Enterprise aesthetic (Stripe/Linear-inspired). Server Components by default, Client Components only for interactive charts/forms.

**Tech Stack:** Next.js 16 App Router, Prisma, Recharts, Stripe API, TypeScript, Tailwind CSS v4, shadcn/ui

---

### Task 1: Install Dependencies & Update Prisma Schema

**Files:**
- Modify: `package.json`
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Install recharts**

```bash
npm install recharts
```

- [ ] **Step 2: Add new models to Prisma schema**

Add these models to `prisma/schema.prisma` after the existing `AuditLog` model:

```prisma
// ─────────────────────────────────────────────
// USER ACTIVITY (analytics)
// ─────────────────────────────────────────────

model UserActivity {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  action    String
  metadata  Json?
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([action])
  @@index([createdAt])
  @@index([userId, action, createdAt])
}

// ─────────────────────────────────────────────
// DAILY METRICS (pre-computed snapshots)
// ─────────────────────────────────────────────

model DailyMetric {
  id       String   @id @default(cuid())
  date     DateTime @db.Date
  metric   String
  value    Float
  metadata Json?

  @@unique([date, metric])
  @@index([metric, date])
}

// ─────────────────────────────────────────────
// SYSTEM METRICS (time-series health)
// ─────────────────────────────────────────────

model SystemMetric {
  id        String   @id @default(cuid())
  metric    String
  value     Float
  metadata  Json?
  createdAt DateTime @default(now())

  @@index([metric, createdAt])
}

// ─────────────────────────────────────────────
// ERROR LOG
// ─────────────────────────────────────────────

model ErrorLog {
  id        String   @id @default(cuid())
  level     String
  message   String
  stack     String?
  source    String?
  action    String?
  userId    String?
  metadata  Json?
  createdAt DateTime @default(now())

  @@index([level, createdAt])
  @@index([source, createdAt])
  @@index([createdAt])
}

// ─────────────────────────────────────────────
// ADMIN NOTES (internal user notes)
// ─────────────────────────────────────────────

model AdminNote {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  adminId   String
  content   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId, createdAt])
}
```

- [ ] **Step 3: Add relations to User model**

In the User model, add these two lines in the relations section (after `inviteLinks`):

```prisma
  activities       UserActivity[]
  adminNotes       AdminNote[]
```

- [ ] **Step 4: Push schema to database**

```bash
npx prisma db push
```

- [ ] **Step 5: Regenerate Prisma client**

```bash
npx prisma generate
```

- [ ] **Step 6: Verify build**

```bash
npm run build
```

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma package.json package-lock.json
git commit -m "feat(admin): add analytics/health Prisma models and recharts dependency"
```

---

### Task 2: Activity Tracking & Error Logging Helpers

**Files:**
- Create: `lib/activity.ts`
- Create: `lib/error-logger.ts`

- [ ] **Step 1: Create activity tracking helper**

Create `lib/activity.ts`:

```typescript
import { db } from "@/lib/db";

/**
 * Tracks a user activity event. Fire-and-forget — never blocks the caller.
 */
export function trackActivity(
  userId: string,
  action: string,
  metadata?: Record<string, unknown>
): void {
  db.userActivity
    .create({
      data: {
        userId,
        action,
        metadata: metadata ? (metadata as object) : undefined,
      },
    })
    .catch((error) => {
      console.error("[ACTIVITY] Failed to track:", action, error);
    });
}
```

- [ ] **Step 2: Create error logging helper**

Create `lib/error-logger.ts`:

```typescript
import { db } from "@/lib/db";

interface LogErrorParams {
  level?: "error" | "warn" | "fatal";
  message: string;
  stack?: string;
  source?: "server-action" | "api-route" | "middleware";
  action?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Logs an error to the ErrorLog table. Fire-and-forget — never blocks the caller.
 */
export function logError({
  level = "error",
  message,
  stack,
  source,
  action,
  userId,
  metadata,
}: LogErrorParams): void {
  db.errorLog
    .create({
      data: {
        level,
        message,
        stack,
        source,
        action,
        userId,
        metadata: metadata ? (metadata as object) : undefined,
      },
    })
    .catch((err) => {
      console.error("[ERROR_LOG] Failed to log error:", err);
    });
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add lib/activity.ts lib/error-logger.ts
git commit -m "feat(admin): add activity tracking and error logging helpers"
```

---

### Task 3: Instrument Existing Actions with Activity Tracking

**Files:**
- Modify: `app/actions/auth.ts` (add login tracking after successful signIn)
- Modify: `app/actions/layouts.ts` (add layout.create / layout.delete tracking)
- Modify: `app/actions/locomotives.ts` (add locomotive.create tracking)
- Modify: `app/actions/freight-cars.ts` (add freight_car.create tracking)
- Modify: `app/actions/trains.ts` (add train.create tracking)
- Modify: `app/actions/waybills.ts` (add waybill.create tracking)
- Modify: `app/actions/sessions.ts` (add session.start / session.complete tracking)

- [ ] **Step 1: Add login tracking to auth.ts**

In `app/actions/auth.ts`, add import at top:

```typescript
import { trackActivity } from "@/lib/activity";
```

In the `login` function, after the successful `signIn` call and user lookup (around line 91-99), before the return statement, add:

```typescript
    if (user) {
      const dbUser = await db.user.findUnique({
        where: { email: values.email },
        select: { id: true },
      });
      if (dbUser) {
        trackActivity(dbUser.id, "login");
      }
    }
```

Note: The existing code already queries the user. Reuse that query — look at how the existing code fetches the user after signIn. If it already has the user id, use it directly. If it only has `role` and `emailVerified`, extend the select to include `id`.

The existing code at lines 91-94 selects `role` and `emailVerified`. Add `id` to the select:

```typescript
    const user = await db.user.findUnique({
      where: { email: values.email },
      select: { id: true, role: true, emailVerified: true },
    });
```

Then after that query, before the return:

```typescript
    if (user) {
      trackActivity(user.id, "login");
    }
```

- [ ] **Step 2: Add layout tracking to layouts.ts**

In `app/actions/layouts.ts`, add import at top:

```typescript
import { trackActivity } from "@/lib/activity";
```

Find the `createLayout` function. After the `db.layout.create()` call, add:

```typescript
trackActivity(session.user.id, "layout.create", { layoutId: layout.id, name: layout.name });
```

Find any `deleteLayout` function. After the `db.layout.delete()` call, add:

```typescript
trackActivity(session.user.id, "layout.delete", { layoutId });
```

- [ ] **Step 3: Add rolling stock tracking**

In `app/actions/locomotives.ts`, add import and after locomotive creation:

```typescript
import { trackActivity } from "@/lib/activity";
// ... after db.locomotive.create():
trackActivity(session.user.id, "locomotive.create", { locomotiveId: loco.id });
```

In `app/actions/freight-cars.ts`, same pattern:

```typescript
import { trackActivity } from "@/lib/activity";
// ... after db.freightCar.create():
trackActivity(session.user.id, "freight_car.create", { freightCarId: car.id });
```

- [ ] **Step 4: Add train and session tracking**

In `app/actions/trains.ts`:

```typescript
import { trackActivity } from "@/lib/activity";
// ... after db.train.create():
trackActivity(session.user.id, "train.create", { trainId: train.id });
```

In `app/actions/sessions.ts`, find the session creation function and any status update to IN_PROGRESS/COMPLETED:

```typescript
import { trackActivity } from "@/lib/activity";
// ... after creating or starting a session:
trackActivity(session.user.id, "session.start", { sessionId: opSession.id });
// ... after completing a session:
trackActivity(session.user.id, "session.complete", { sessionId: opSession.id });
```

In `app/actions/waybills.ts`:

```typescript
import { trackActivity } from "@/lib/activity";
// ... after db.waybill.create():
trackActivity(session.user.id, "waybill.create", { waybillId: waybill.id });
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add app/actions/auth.ts app/actions/layouts.ts app/actions/locomotives.ts app/actions/freight-cars.ts app/actions/trains.ts app/actions/waybills.ts app/actions/sessions.ts
git commit -m "feat(admin): instrument server actions with activity tracking"
```

---

### Task 4: Analytics Server Actions

**Files:**
- Create: `app/actions/admin/analytics.ts`

- [ ] **Step 1: Create analytics server actions**

Create `app/actions/admin/analytics.ts`:

```typescript
"use server";

import { adminAuth } from "@/lib/admin-auth";
import { db } from "@/lib/db";

async function requireAdmin() {
  const session = await adminAuth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

export type TimeRange = "7d" | "30d" | "90d" | "1y" | "all";

function getDateFromRange(range: TimeRange): Date | null {
  const now = new Date();
  switch (range) {
    case "7d": return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d": return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "90d": return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case "1y": return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    case "all": return null;
  }
}

export async function getGrowthMetrics(range: TimeRange = "30d") {
  await requireAdmin();

  const since = getDateFromRange(range);
  const priorSince = since
    ? new Date(since.getTime() - (Date.now() - since.getTime()))
    : null;

  const [totalUsers, proUsers, freeUsers, currentSignups, priorSignups] =
    await Promise.all([
      db.user.count(),
      db.user.count({ where: { plan: "PRO" } }),
      db.user.count({ where: { plan: "FREE" } }),
      db.user.count({
        where: since ? { createdAt: { gte: since } } : undefined,
      }),
      priorSince && since
        ? db.user.count({
            where: { createdAt: { gte: priorSince, lt: since } },
          })
        : Promise.resolve(0),
    ]);

  const mrr = proUsers * 5;
  const conversionRate = totalUsers > 0 ? (proUsers / totalUsers) * 100 : 0;
  const arpu = totalUsers > 0 ? mrr / totalUsers : 0;
  const signupChange =
    priorSignups > 0
      ? ((currentSignups - priorSignups) / priorSignups) * 100
      : 0;

  return {
    totalUsers,
    proUsers,
    freeUsers,
    mrr,
    conversionRate: Math.round(conversionRate * 10) / 10,
    arpu: Math.round(arpu * 100) / 100,
    signups: currentSignups,
    signupChange: Math.round(signupChange * 10) / 10,
  };
}

export async function getSignupTrend(range: TimeRange = "30d") {
  await requireAdmin();

  const since = getDateFromRange(range) ?? new Date("2020-01-01");

  const users = await db.user.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true, plan: true },
    orderBy: { createdAt: "asc" },
  });

  // Group by date
  const byDate = new Map<string, { total: number; pro: number; free: number }>();
  for (const user of users) {
    const dateKey = user.createdAt.toISOString().split("T")[0];
    const entry = byDate.get(dateKey) ?? { total: 0, pro: 0, free: 0 };
    entry.total++;
    if (user.plan === "PRO") entry.pro++;
    else entry.free++;
    byDate.set(dateKey, entry);
  }

  return Array.from(byDate.entries()).map(([date, counts]) => ({
    date,
    ...counts,
  }));
}

export async function getConversionFunnel() {
  await requireAdmin();

  const [
    totalSignups,
    verified,
    createdLayout,
    addedStock,
    ranSession,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { emailVerified: { not: null } } }),
    db.user.count({ where: { layouts: { some: {} } } }),
    db.user.count({
      where: {
        OR: [
          { locomotives: { some: {} } },
          { freightCars: { some: {} } },
        ],
      },
    }),
    db.user.count({ where: { sessions: { some: {} } } }),
  ]);

  return [
    { step: "Signed Up", count: totalSignups },
    { step: "Verified Email", count: verified },
    { step: "Created Railroad", count: createdLayout },
    { step: "Added Rolling Stock", count: addedStock },
    { step: "Ran Session", count: ranSession },
  ];
}

export async function getCohortRetention(months: number = 6) {
  await requireAdmin();

  const since = new Date();
  since.setMonth(since.getMonth() - months);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  // Get all users who signed up since the start date
  const users = await db.user.findMany({
    where: { createdAt: { gte: since } },
    select: { id: true, createdAt: true },
  });

  // Get all login activities for those users
  const userIds = users.map((u) => u.id);
  const activities = await db.userActivity.findMany({
    where: {
      userId: { in: userIds },
      action: "login",
      createdAt: { gte: since },
    },
    select: { userId: true, createdAt: true },
  });

  // Build activity map: userId -> Set of "YYYY-MM" strings
  const activityMap = new Map<string, Set<string>>();
  for (const a of activities) {
    const key = a.userId;
    if (!activityMap.has(key)) activityMap.set(key, new Set());
    activityMap.get(key)!.add(
      `${a.createdAt.getFullYear()}-${String(a.createdAt.getMonth() + 1).padStart(2, "0")}`
    );
  }

  // Build cohorts
  const cohorts: Array<{
    cohort: string;
    size: number;
    retention: number[];
  }> = [];

  const now = new Date();
  for (let m = 0; m < months; m++) {
    const cohortDate = new Date(since);
    cohortDate.setMonth(cohortDate.getMonth() + m);
    const cohortKey = `${cohortDate.getFullYear()}-${String(cohortDate.getMonth() + 1).padStart(2, "0")}`;

    const nextMonth = new Date(cohortDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const cohortUsers = users.filter((u) => {
      const uMonth = `${u.createdAt.getFullYear()}-${String(u.createdAt.getMonth() + 1).padStart(2, "0")}`;
      return uMonth === cohortKey;
    });

    const retention: number[] = [];
    const maxMonthsAhead = Math.min(
      months - m,
      (now.getFullYear() - cohortDate.getFullYear()) * 12 +
        now.getMonth() -
        cohortDate.getMonth() +
        1
    );

    for (let offset = 0; offset < maxMonthsAhead; offset++) {
      const checkDate = new Date(cohortDate);
      checkDate.setMonth(checkDate.getMonth() + offset);
      const checkKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}`;

      const activeCount = cohortUsers.filter((u) =>
        activityMap.get(u.id)?.has(checkKey)
      ).length;

      retention.push(
        cohortUsers.length > 0
          ? Math.round((activeCount / cohortUsers.length) * 100)
          : 0
      );
    }

    cohorts.push({ cohort: cohortKey, size: cohortUsers.length, retention });
  }

  return cohorts;
}

export async function getFeatureUsageStats() {
  await requireAdmin();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [allTime, recent] = await Promise.all([
    db.userActivity.groupBy({
      by: ["action"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 20,
    }),
    db.userActivity.groupBy({
      by: ["action"],
      _count: { id: true },
      where: { createdAt: { gte: sevenDaysAgo } },
    }),
  ]);

  const recentMap = new Map(recent.map((r) => [r.action, r._count.id]));

  // Get unique user counts per action
  const uniqueUsers = await db.userActivity.groupBy({
    by: ["action"],
    _count: { userId: true },
    where: { action: { in: allTime.map((a) => a.action) } },
  });
  const uniqueMap = new Map(uniqueUsers.map((u) => [u.action, u._count.userId]));

  return allTime.map((a) => ({
    action: a.action,
    totalEvents: a._count.id,
    uniqueUsers: uniqueMap.get(a.action) ?? 0,
    recentEvents: recentMap.get(a.action) ?? 0,
  }));
}

export async function getEngagementDistribution() {
  await requireAdmin();

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const totalUsers = await db.user.count();

  const [dailyActive, weeklyActive, monthlyActive] = await Promise.all([
    db.userActivity.groupBy({
      by: ["userId"],
      where: { action: "login", createdAt: { gte: dayAgo } },
    }),
    db.userActivity.groupBy({
      by: ["userId"],
      where: { action: "login", createdAt: { gte: weekAgo } },
    }),
    db.userActivity.groupBy({
      by: ["userId"],
      where: { action: "login", createdAt: { gte: monthAgo } },
    }),
  ]);

  const power = dailyActive.length;
  const regular = weeklyActive.length - power;
  const casual = monthlyActive.length - weeklyActive.length;
  const dormant = totalUsers - monthlyActive.length;

  return [
    { bucket: "Power (daily)", count: power },
    { bucket: "Regular (weekly)", count: regular },
    { bucket: "Casual (monthly)", count: casual },
    { bucket: "Dormant (>30d)", count: dormant },
  ];
}

export async function getResourceCounts() {
  await requireAdmin();

  const [
    layouts, locations, locomotives, freightCars,
    passengerCars, cabooses, mowEquipment, trains,
    waybills, sessions,
  ] = await Promise.all([
    db.layout.count(),
    db.location.count(),
    db.locomotive.count(),
    db.freightCar.count(),
    db.passengerCar.count(),
    db.caboose.count(),
    db.mOWEquipment.count(),
    db.train.count(),
    db.waybill.count(),
    db.operatingSession.count(),
  ]);

  return [
    { resource: "Railroads", count: layouts },
    { resource: "Locations", count: locations },
    { resource: "Locomotives", count: locomotives },
    { resource: "Freight Cars", count: freightCars },
    { resource: "Passenger Cars", count: passengerCars },
    { resource: "Cabooses", count: cabooses },
    { resource: "MOW Equipment", count: mowEquipment },
    { resource: "Trains", count: trains },
    { resource: "Waybills", count: waybills },
    { resource: "Sessions", count: sessions },
  ];
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add app/actions/admin/analytics.ts
git commit -m "feat(admin): add analytics server actions"
```

---

### Task 5: Health Check Server Actions

**Files:**
- Create: `app/actions/admin/health.ts`

- [ ] **Step 1: Create health server actions**

Create `app/actions/admin/health.ts`:

```typescript
"use server";

import { adminAuth } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { testSmtpConnection, testStripeConnection } from "@/app/actions/admin/settings";

async function requireAdmin() {
  const session = await adminAuth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

type HealthStatus = "healthy" | "degraded" | "down";

interface ServiceHealth {
  name: string;
  status: HealthStatus;
  message: string;
  responseMs?: number;
}

export async function getSystemHealth(): Promise<ServiceHealth[]> {
  await requireAdmin();

  const checks = await Promise.allSettled([
    // Database
    (async (): Promise<ServiceHealth> => {
      const start = Date.now();
      try {
        await db.$queryRaw`SELECT 1`;
        return {
          name: "Database",
          status: "healthy",
          message: "PostgreSQL connected",
          responseMs: Date.now() - start,
        };
      } catch {
        return {
          name: "Database",
          status: "down",
          message: "Connection failed",
          responseMs: Date.now() - start,
        };
      }
    })(),
    // SMTP
    (async (): Promise<ServiceHealth> => {
      const start = Date.now();
      const result = await testSmtpConnection();
      return {
        name: "SMTP",
        status: result.success ? "healthy" : "degraded",
        message: result.message,
        responseMs: Date.now() - start,
      };
    })(),
    // Stripe
    (async (): Promise<ServiceHealth> => {
      const start = Date.now();
      const result = await testStripeConnection();
      return {
        name: "Stripe",
        status: result.success ? "healthy" : "degraded",
        message: result.message,
        responseMs: Date.now() - start,
      };
    })(),
    // Auth (just check session works — if we got here, it works)
    Promise.resolve<ServiceHealth>({
      name: "Auth",
      status: "healthy",
      message: "NextAuth.js operational",
    }),
  ]);

  return checks.map((result) =>
    result.status === "fulfilled"
      ? result.value
      : { name: "Unknown", status: "down" as HealthStatus, message: "Check failed" }
  );
}

export async function getDatabaseStats() {
  await requireAdmin();

  const [
    users, layouts, locations, industries,
    locomotives, freightCars, passengerCars, cabooses,
    mowEquipment, trains, waybills, carCards, sessions,
    auditLogs, userActivities,
  ] = await Promise.all([
    db.user.count(),
    db.layout.count(),
    db.location.count(),
    db.industry.count(),
    db.locomotive.count(),
    db.freightCar.count(),
    db.passengerCar.count(),
    db.caboose.count(),
    db.mOWEquipment.count(),
    db.train.count(),
    db.waybill.count(),
    db.carCard.count(),
    db.operatingSession.count(),
    db.auditLog.count(),
    db.userActivity.count(),
  ]);

  return [
    { table: "User", rows: users },
    { table: "Layout", rows: layouts },
    { table: "Location", rows: locations },
    { table: "Industry", rows: industries },
    { table: "Locomotive", rows: locomotives },
    { table: "FreightCar", rows: freightCars },
    { table: "PassengerCar", rows: passengerCars },
    { table: "Caboose", rows: cabooses },
    { table: "MOWEquipment", rows: mowEquipment },
    { table: "Train", rows: trains },
    { table: "Waybill", rows: waybills },
    { table: "CarCard", rows: carCards },
    { table: "OperatingSession", rows: sessions },
    { table: "AuditLog", rows: auditLogs },
    { table: "UserActivity", rows: userActivities },
  ];
}

export async function getRecentErrors(limit: number = 20) {
  await requireAdmin();

  return db.errorLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getActiveUserCounts() {
  await requireAdmin();

  const now = new Date();
  const fifteenMin = new Date(now.getTime() - 15 * 60 * 1000);
  const oneHour = new Date(now.getTime() - 60 * 60 * 1000);
  const twentyFourHours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [last15m, last1h, last24h] = await Promise.all([
    db.userActivity.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: fifteenMin } },
    }),
    db.userActivity.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: oneHour } },
    }),
    db.userActivity.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: twentyFourHours } },
    }),
  ]);

  return {
    last15m: last15m.length,
    last1h: last1h.length,
    last24h: last24h.length,
  };
}

export async function getErrorLogs({
  page = 1,
  pageSize = 25,
  level,
  source,
  dateFrom,
  dateTo,
}: {
  page?: number;
  pageSize?: number;
  level?: string;
  source?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  await requireAdmin();

  const where: Record<string, unknown> = {};
  if (level) where.level = level;
  if (source) where.source = source;
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    };
  }

  const [logs, total] = await Promise.all([
    db.errorLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.errorLog.count({ where }),
  ]);

  return {
    logs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getErrorFrequency(hours: number = 24) {
  await requireAdmin();

  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const errors = await db.errorLog.findMany({
    where: { createdAt: { gte: since } },
    select: { level: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Group by hour
  const byHour = new Map<string, { error: number; warn: number; fatal: number }>();
  for (const err of errors) {
    const hourKey = err.createdAt.toISOString().slice(0, 13);
    const entry = byHour.get(hourKey) ?? { error: 0, warn: 0, fatal: 0 };
    if (err.level === "error") entry.error++;
    else if (err.level === "warn") entry.warn++;
    else if (err.level === "fatal") entry.fatal++;
    byHour.set(hourKey, entry);
  }

  return Array.from(byHour.entries()).map(([hour, counts]) => ({
    hour: hour + ":00",
    ...counts,
  }));
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add app/actions/admin/health.ts
git commit -m "feat(admin): add health check and error log server actions"
```

---

### Task 6: Stripe Revenue Server Actions

**Files:**
- Create: `app/actions/admin/stripe-revenue.ts`

- [ ] **Step 1: Create Stripe revenue actions**

Create `app/actions/admin/stripe-revenue.ts`:

```typescript
"use server";

import { adminAuth } from "@/lib/admin-auth";
import { getStripeClient } from "@/lib/stripe";

async function requireAdmin() {
  const session = await adminAuth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function getStripeRevenue() {
  await requireAdmin();

  try {
    const stripe = await getStripeClient();

    const [subscriptions, balance, payouts] = await Promise.all([
      stripe.subscriptions.list({ status: "active", limit: 100 }),
      stripe.balance.retrieve(),
      stripe.payouts.list({ limit: 1, status: "pending" }),
    ]);

    // Calculate MRR from active subscriptions
    let mrr = 0;
    for (const sub of subscriptions.data) {
      for (const item of sub.items.data) {
        if (item.price.recurring?.interval === "month") {
          mrr += (item.price.unit_amount ?? 0) / 100;
        } else if (item.price.recurring?.interval === "year") {
          mrr += (item.price.unit_amount ?? 0) / 100 / 12;
        }
      }
    }

    const arr = mrr * 12;
    const available = balance.available.reduce((sum, b) => sum + b.amount, 0) / 100;
    const pending = balance.pending.reduce((sum, b) => sum + b.amount, 0) / 100;
    const nextPayout = payouts.data[0]
      ? {
          amount: payouts.data[0].amount / 100,
          arrivalDate: new Date(payouts.data[0].arrival_date * 1000).toISOString(),
          status: payouts.data[0].status,
        }
      : null;

    return {
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(arr * 100) / 100,
      availableBalance: available,
      pendingBalance: pending,
      activeSubscriptions: subscriptions.data.length,
      nextPayout,
    };
  } catch (error) {
    return {
      mrr: 0, arr: 0, availableBalance: 0, pendingBalance: 0,
      activeSubscriptions: 0, nextPayout: null,
      error: error instanceof Error ? error.message : "Failed to connect to Stripe",
    };
  }
}

export async function getStripePayments(page: number = 1) {
  await requireAdmin();
  const pageSize = 20;

  try {
    const stripe = await getStripeClient();
    const charges = await stripe.charges.list({
      limit: pageSize,
      // Stripe uses cursor-based pagination; for simplicity we use limit/offset via created
    });

    return {
      payments: charges.data.map((charge) => ({
        id: charge.id,
        amount: charge.amount / 100,
        currency: charge.currency.toUpperCase(),
        status: charge.status,
        customerEmail: charge.billing_details?.email ?? charge.receipt_email ?? "Unknown",
        description: charge.description,
        created: new Date(charge.created * 1000).toISOString(),
        refunded: charge.refunded,
        refundedAmount: charge.amount_refunded / 100,
      })),
      hasMore: charges.has_more,
    };
  } catch (error) {
    return {
      payments: [],
      hasMore: false,
      error: error instanceof Error ? error.message : "Failed to fetch payments",
    };
  }
}

export async function getStripeFailedPayments() {
  await requireAdmin();

  try {
    const stripe = await getStripeClient();
    const charges = await stripe.charges.list({
      limit: 20,
    });

    const failed = charges.data.filter((c) => c.status === "failed");

    return {
      payments: failed.map((charge) => ({
        id: charge.id,
        amount: charge.amount / 100,
        currency: charge.currency.toUpperCase(),
        customerEmail: charge.billing_details?.email ?? "Unknown",
        failureMessage: charge.failure_message,
        failureCode: charge.failure_code,
        created: new Date(charge.created * 1000).toISOString(),
      })),
    };
  } catch (error) {
    return {
      payments: [],
      error: error instanceof Error ? error.message : "Failed to fetch",
    };
  }
}

export async function getStripePayouts() {
  await requireAdmin();

  try {
    const stripe = await getStripeClient();
    const payouts = await stripe.payouts.list({ limit: 20 });

    return {
      payouts: payouts.data.map((p) => ({
        id: p.id,
        amount: p.amount / 100,
        currency: p.currency.toUpperCase(),
        status: p.status,
        arrivalDate: new Date(p.arrival_date * 1000).toISOString(),
        created: new Date(p.created * 1000).toISOString(),
        method: p.method,
      })),
    };
  } catch (error) {
    return {
      payouts: [],
      error: error instanceof Error ? error.message : "Failed to fetch payouts",
    };
  }
}

export async function getStripeDisputes() {
  await requireAdmin();

  try {
    const stripe = await getStripeClient();
    const disputes = await stripe.disputes.list({ limit: 20 });

    return {
      disputes: disputes.data.map((d) => ({
        id: d.id,
        amount: d.amount / 100,
        currency: d.currency.toUpperCase(),
        status: d.status,
        reason: d.reason,
        chargeId: d.charge,
        created: new Date(d.created * 1000).toISOString(),
      })),
    };
  } catch (error) {
    return {
      disputes: [],
      error: error instanceof Error ? error.message : "Failed to fetch disputes",
    };
  }
}

export async function issueRefund(chargeId: string, amount?: number) {
  const session = await requireAdmin();

  try {
    const stripe = await getStripeClient();
    const refund = await stripe.refunds.create({
      charge: chargeId,
      ...(amount ? { amount: Math.round(amount * 100) } : {}),
    });

    // Log audit
    const { logAudit } = await import("@/lib/audit");
    await logAudit({
      action: "stripe.refund",
      adminId: session.user.id,
      adminEmail: session.user.email!,
      entityType: "Charge",
      entityId: chargeId,
      metadata: { refundId: refund.id, amount: refund.amount / 100 },
    });

    return { success: true, refundId: refund.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Refund failed" };
  }
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add app/actions/admin/stripe-revenue.ts
git commit -m "feat(admin): add Stripe revenue and payment server actions"
```

---

### Task 7: Admin Notes Server Actions

**Files:**
- Create: `app/actions/admin/notes.ts`

- [ ] **Step 1: Create notes CRUD actions**

Create `app/actions/admin/notes.ts`:

```typescript
"use server";

import { adminAuth } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

async function requireAdmin() {
  const session = await adminAuth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

const noteSchema = z.object({
  content: z.string().min(1).max(5000),
});

export async function getAdminNotes(userId: string) {
  await requireAdmin();

  return db.adminNote.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createAdminNote(userId: string, content: string) {
  const session = await requireAdmin();

  const validated = noteSchema.safeParse({ content });
  if (!validated.success) return { error: "Content is required" };

  const note = await db.adminNote.create({
    data: {
      userId,
      adminId: session.user.id,
      content: validated.data.content,
    },
  });

  await logAudit({
    action: "admin_note.create",
    adminId: session.user.id,
    adminEmail: session.user.email!,
    entityType: "AdminNote",
    entityId: note.id,
    metadata: { userId },
  });

  revalidatePath(`/admin/users/${userId}`);
  return { success: true, note };
}

export async function updateAdminNote(noteId: string, content: string) {
  const session = await requireAdmin();

  const validated = noteSchema.safeParse({ content });
  if (!validated.success) return { error: "Content is required" };

  const existing = await db.adminNote.findUnique({ where: { id: noteId } });
  if (!existing) return { error: "Note not found" };
  if (existing.adminId !== session.user.id) return { error: "Can only edit your own notes" };

  const note = await db.adminNote.update({
    where: { id: noteId },
    data: { content: validated.data.content },
  });

  revalidatePath(`/admin/users/${existing.userId}`);
  return { success: true, note };
}

export async function deleteAdminNote(noteId: string) {
  const session = await requireAdmin();

  const existing = await db.adminNote.findUnique({ where: { id: noteId } });
  if (!existing) return { error: "Note not found" };
  if (existing.adminId !== session.user.id) return { error: "Can only delete your own notes" };

  await db.adminNote.delete({ where: { id: noteId } });

  await logAudit({
    action: "admin_note.delete",
    adminId: session.user.id,
    adminEmail: session.user.email!,
    entityType: "AdminNote",
    entityId: noteId,
    metadata: { userId: existing.userId },
  });

  revalidatePath(`/admin/users/${existing.userId}`);
  return { success: true };
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add app/actions/admin/notes.ts
git commit -m "feat(admin): add admin notes CRUD server actions"
```

---

### Task 8: Daily Metrics Cron Endpoint

**Files:**
- Create: `app/api/cron/daily-metrics/route.ts`

- [ ] **Step 1: Create cron route**

Create `app/api/cron/daily-metrics/route.ts`:

```typescript
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalUsers, proUsers, freeUsers, activeUsers, signups] =
      await Promise.all([
        db.user.count(),
        db.user.count({ where: { plan: "PRO" } }),
        db.user.count({ where: { plan: "FREE" } }),
        db.userActivity
          .groupBy({
            by: ["userId"],
            where: { createdAt: { gte: twentyFourHoursAgo } },
          })
          .then((r) => r.length),
        db.user.count({
          where: {
            createdAt: { gte: today },
          },
        }),
      ]);

    const mrr = proUsers * 5;

    const metrics = [
      { date: today, metric: "total_users", value: totalUsers },
      { date: today, metric: "pro_users", value: proUsers },
      { date: today, metric: "free_users", value: freeUsers },
      { date: today, metric: "mrr", value: mrr },
      { date: today, metric: "active_users", value: activeUsers },
      { date: today, metric: "signups", value: signups },
    ];

    for (const m of metrics) {
      await db.dailyMetric.upsert({
        where: { date_metric: { date: m.date, metric: m.metric } },
        update: { value: m.value },
        create: m,
      });
    }

    return NextResponse.json({
      success: true,
      date: today.toISOString(),
      metrics: metrics.map((m) => ({ metric: m.metric, value: m.value })),
    });
  } catch (error) {
    console.error("[CRON] Daily metrics failed:", error);
    return NextResponse.json(
      { error: "Failed to compute metrics" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add app/api/cron/daily-metrics/route.ts
git commit -m "feat(admin): add daily metrics cron endpoint"
```

---

### Task 9: Update Admin Sidebar Navigation

**Files:**
- Modify: `components/layout/app-sidebar.tsx`

- [ ] **Step 1: Add new icons import and menu items**

In `components/layout/app-sidebar.tsx`, add to the icon imports from lucide-react:

```typescript
import {
  // ... existing imports ...
  BarChart3,
  Activity,
  HeartPulse,
  AlertCircle,
} from "lucide-react";
```

Replace the `adminMenuItems` array with:

```typescript
const adminMenuItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "User Management", icon: Users },
  { href: "/admin/analytics", label: "Growth", icon: BarChart3 },
  { href: "/admin/analytics/cohorts", label: "Cohorts", icon: Activity },
  { href: "/admin/analytics/usage", label: "Usage", icon: Activity },
  { href: "/admin/analytics/revenue", label: "Revenue", icon: CreditCard },
  { href: "/admin/health", label: "System Health", icon: HeartPulse },
  { href: "/admin/health/errors", label: "Error Log", icon: AlertCircle },
  { href: "/admin/billing", label: "Billing", icon: CreditCard },
  { href: "/admin/audit", label: "Audit Log", icon: ShieldCheck },
  { href: "/admin/system", label: "System Settings", icon: Settings },
];
```

Note: The existing sidebar `isActive` function already handles `exact` — make sure the dashboard item has `exact: true` to prevent it from matching `/admin/users` etc. Check the existing isActive function at around line 152 — it already supports the `exact` property via the cast `(item as { exact?: boolean }).exact`.

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add components/layout/app-sidebar.tsx
git commit -m "feat(admin): add analytics and health nav items to admin sidebar"
```

---

### Task 10: Growth Analytics Page + Chart Components

**Files:**
- Create: `components/admin/analytics/metric-card.tsx`
- Create: `components/admin/analytics/signup-chart.tsx`
- Create: `components/admin/analytics/funnel-chart.tsx`
- Create: `app/(admin)/admin/analytics/page.tsx`

- [ ] **Step 1: Create reusable metric card component**

Create `components/admin/analytics/metric-card.tsx`:

```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  icon: LucideIcon;
}

export function MetricCard({ title, value, subtitle, change, icon: Icon }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {(subtitle || change !== undefined) && (
          <p className="text-xs text-muted-foreground">
            {change !== undefined && (
              <span className={change >= 0 ? "text-green-600" : "text-red-600"}>
                {change >= 0 ? "+" : ""}
                {change}%{" "}
              </span>
            )}
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create signup chart client component**

Create `components/admin/analytics/signup-chart.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSignupTrend, type TimeRange } from "@/app/actions/admin/analytics";

const ranges: { label: string; value: TimeRange }[] = [
  { label: "7D", value: "7d" },
  { label: "30D", value: "30d" },
  { label: "90D", value: "90d" },
  { label: "1Y", value: "1y" },
  { label: "All", value: "all" },
];

interface SignupChartProps {
  initialData: Awaited<ReturnType<typeof getSignupTrend>>;
}

export function SignupChart({ initialData }: SignupChartProps) {
  const [data, setData] = useState(initialData);
  const [activeRange, setActiveRange] = useState<TimeRange>("30d");
  const [isPending, startTransition] = useTransition();

  function handleRangeChange(range: TimeRange) {
    setActiveRange(range);
    startTransition(async () => {
      const result = await getSignupTrend(range);
      setData(result);
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Signup Trend</CardTitle>
        <div className="flex gap-1">
          {ranges.map((r) => (
            <Button
              key={r.value}
              variant={activeRange === r.value ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => handleRangeChange(r.value)}
              disabled={isPending}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(val) => {
                  const d = new Date(val);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
                className="text-muted-foreground"
              />
              <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary) / 0.1)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Create funnel chart client component**

Create `components/admin/analytics/funnel-chart.tsx`:

```typescript
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FunnelChartProps {
  data: Array<{ step: string; count: number }>;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--primary) / 0.85)",
  "hsl(var(--primary) / 0.7)",
  "hsl(var(--primary) / 0.55)",
  "hsl(var(--primary) / 0.4)",
];

export function FunnelChart({ data }: FunnelChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Conversion Funnel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <YAxis
                dataKey="step"
                type="category"
                width={130}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Create the growth analytics page**

Create `app/(admin)/admin/analytics/page.tsx`:

```typescript
import { adminAuth } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import {
  getGrowthMetrics,
  getSignupTrend,
  getConversionFunnel,
} from "@/app/actions/admin/analytics";
import { MetricCard } from "@/components/admin/analytics/metric-card";
import { SignupChart } from "@/components/admin/analytics/signup-chart";
import { FunnelChart } from "@/components/admin/analytics/funnel-chart";
import { Users, DollarSign, TrendingUp, BarChart3, UserPlus } from "lucide-react";

export default async function AnalyticsPage() {
  const session = await adminAuth();
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const [metrics, signupData, funnelData] = await Promise.all([
    getGrowthMetrics("30d"),
    getSignupTrend("30d"),
    getConversionFunnel(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Growth Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Signup trends, revenue metrics, and conversion data
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="Total Users"
          value={metrics.totalUsers}
          change={metrics.signupChange}
          subtitle="vs prior period"
          icon={Users}
        />
        <MetricCard
          title="MRR"
          value={`$${metrics.mrr}`}
          subtitle={`${metrics.proUsers} Pro subscribers`}
          icon={DollarSign}
        />
        <MetricCard
          title="Conversion Rate"
          value={`${metrics.conversionRate}%`}
          subtitle="Free → Pro"
          icon={TrendingUp}
        />
        <MetricCard
          title="ARPU"
          value={`$${metrics.arpu}`}
          subtitle="avg revenue per user"
          icon={BarChart3}
        />
        <MetricCard
          title="Signups"
          value={metrics.signups}
          change={metrics.signupChange}
          subtitle="this period"
          icon={UserPlus}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SignupChart initialData={signupData} />
        <FunnelChart data={funnelData} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add components/admin/analytics/ app/(admin)/admin/analytics/page.tsx
git commit -m "feat(admin): add growth analytics page with signup chart and conversion funnel"
```

---

### Task 11: Cohort Analysis Page

**Files:**
- Create: `components/admin/analytics/cohort-grid.tsx`
- Create: `app/(admin)/admin/analytics/cohorts/page.tsx`

- [ ] **Step 1: Create cohort grid client component**

Create `components/admin/analytics/cohort-grid.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCohortRetention } from "@/app/actions/admin/analytics";

interface CohortGridProps {
  initialData: Awaited<ReturnType<typeof getCohortRetention>>;
}

function getRetentionColor(pct: number): string {
  if (pct >= 80) return "bg-green-600 text-white";
  if (pct >= 60) return "bg-green-500 text-white";
  if (pct >= 40) return "bg-yellow-500 text-white";
  if (pct >= 20) return "bg-orange-500 text-white";
  if (pct > 0) return "bg-red-500 text-white";
  return "bg-muted text-muted-foreground";
}

export function CohortGrid({ initialData }: CohortGridProps) {
  const [data, setData] = useState(initialData);
  const [months, setMonths] = useState(6);
  const [isPending, startTransition] = useTransition();

  function handleChange(m: number) {
    setMonths(m);
    startTransition(async () => {
      const result = await getCohortRetention(m);
      setData(result);
    });
  }

  const maxRetentionLength = Math.max(...data.map((c) => c.retention.length), 1);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Retention by Cohort</CardTitle>
        <div className="flex gap-1">
          {[6, 12].map((m) => (
            <Button
              key={m}
              variant={months === m ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => handleChange(m)}
              disabled={isPending}
            >
              {m}mo
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left p-2 font-medium text-muted-foreground">Cohort</th>
                <th className="text-center p-2 font-medium text-muted-foreground">Users</th>
                {Array.from({ length: maxRetentionLength }, (_, i) => (
                  <th key={i} className="text-center p-2 font-medium text-muted-foreground">
                    M{i}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((cohort) => (
                <tr key={cohort.cohort}>
                  <td className="p-2 font-medium">{cohort.cohort}</td>
                  <td className="p-2 text-center tabular-nums">{cohort.size}</td>
                  {cohort.retention.map((pct, i) => (
                    <td key={i} className="p-1 text-center">
                      <div
                        className={`rounded px-2 py-1 tabular-nums text-[11px] font-medium ${getRetentionColor(pct)}`}
                      >
                        {pct}%
                      </div>
                    </td>
                  ))}
                  {/* Fill remaining cells */}
                  {Array.from(
                    { length: maxRetentionLength - cohort.retention.length },
                    (_, i) => (
                      <td key={`empty-${i}`} className="p-1" />
                    )
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create cohorts page**

Create `app/(admin)/admin/analytics/cohorts/page.tsx`:

```typescript
import { adminAuth } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { getCohortRetention } from "@/app/actions/admin/analytics";
import { CohortGrid } from "@/components/admin/analytics/cohort-grid";

export default async function CohortsPage() {
  const session = await adminAuth();
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const cohortData = await getCohortRetention(6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cohort Analysis</h1>
        <p className="text-sm text-muted-foreground">
          User retention and conversion by signup month
        </p>
      </div>

      <CohortGrid initialData={cohortData} />
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add components/admin/analytics/cohort-grid.tsx app/(admin)/admin/analytics/cohorts/
git commit -m "feat(admin): add cohort retention analysis page"
```

---

### Task 12: Usage Analytics Page

**Files:**
- Create: `components/admin/analytics/engagement-chart.tsx`
- Create: `app/(admin)/admin/analytics/usage/page.tsx`

- [ ] **Step 1: Create engagement chart**

Create `components/admin/analytics/engagement-chart.tsx`:

```typescript
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EngagementChartProps {
  data: Array<{ bucket: string; count: number }>;
}

export function EngagementChart({ data }: EngagementChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Engagement Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="bucket" tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create usage page**

Create `app/(admin)/admin/analytics/usage/page.tsx`:

```typescript
import { adminAuth } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import {
  getFeatureUsageStats,
  getEngagementDistribution,
  getResourceCounts,
} from "@/app/actions/admin/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EngagementChart } from "@/components/admin/analytics/engagement-chart";

export default async function UsagePage() {
  const session = await adminAuth();
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const [features, engagement, resources] = await Promise.all([
    getFeatureUsageStats(),
    getEngagementDistribution(),
    getResourceCounts(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Feature Usage</h1>
        <p className="text-sm text-muted-foreground">
          Activity patterns, engagement levels, and resource utilization
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <EngagementChart data={engagement} />

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Resource Counts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {resources.map((r) => (
                <div key={r.resource} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{r.resource}</span>
                  <span className="font-mono tabular-nums font-medium">{r.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Top Actions</CardTitle>
        </CardHeader>
        <CardContent>
          {features.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No activity data yet. Actions will appear as users interact with the platform.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium text-muted-foreground">Action</th>
                    <th className="text-right p-2 font-medium text-muted-foreground">Total Events</th>
                    <th className="text-right p-2 font-medium text-muted-foreground">Unique Users</th>
                    <th className="text-right p-2 font-medium text-muted-foreground">Last 7d</th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((f) => (
                    <tr key={f.action} className="border-b border-border/50">
                      <td className="p-2">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {f.action}
                        </Badge>
                      </td>
                      <td className="p-2 text-right tabular-nums">{f.totalEvents.toLocaleString()}</td>
                      <td className="p-2 text-right tabular-nums">{f.uniqueUsers}</td>
                      <td className="p-2 text-right tabular-nums">{f.recentEvents}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add components/admin/analytics/engagement-chart.tsx app/(admin)/admin/analytics/usage/
git commit -m "feat(admin): add feature usage analytics page"
```

---

### Task 13: Stripe Revenue Page

**Files:**
- Create: `components/admin/analytics/revenue-client.tsx`
- Create: `app/(admin)/admin/analytics/revenue/page.tsx`

- [ ] **Step 1: Create revenue client component**

Create `components/admin/analytics/revenue-client.tsx`:

```typescript
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
```

- [ ] **Step 2: Create revenue page**

Create `app/(admin)/admin/analytics/revenue/page.tsx`:

```typescript
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
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add components/admin/analytics/revenue-client.tsx app/(admin)/admin/analytics/revenue/
git commit -m "feat(admin): add Stripe revenue dashboard with payments, payouts, and disputes"
```

---

### Task 14: System Health Page

**Files:**
- Create: `app/(admin)/admin/health/page.tsx`

- [ ] **Step 1: Create health dashboard page**

Create `app/(admin)/admin/health/page.tsx`:

```typescript
import { adminAuth } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import {
  getSystemHealth,
  getDatabaseStats,
  getRecentErrors,
  getActiveUserCounts,
} from "@/app/actions/admin/health";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { CheckCircle, AlertTriangle, XCircle, Users } from "lucide-react";

function StatusIcon({ status }: { status: string }) {
  if (status === "healthy") return <CheckCircle className="h-5 w-5 text-green-500" />;
  if (status === "degraded") return <AlertTriangle className="h-5 w-5 text-amber-500" />;
  return <XCircle className="h-5 w-5 text-red-500" />;
}

function statusVariant(status: string): "default" | "secondary" | "destructive" {
  if (status === "healthy") return "default";
  if (status === "degraded") return "secondary";
  return "destructive";
}

export default async function HealthPage() {
  const session = await adminAuth();
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const [health, dbStats, recentErrors, activeCounts] = await Promise.all([
    getSystemHealth(),
    getDatabaseStats(),
    getRecentErrors(10),
    getActiveUserCounts(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
        <p className="text-sm text-muted-foreground">
          Service status, database metrics, and error tracking
        </p>
      </div>

      {/* Status Board */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {health.map((service) => (
          <Card key={service.name}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <StatusIcon status={service.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{service.name}</p>
                    <Badge variant={statusVariant(service.status)} className="text-[10px] px-1.5 py-0 h-4">
                      {service.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{service.message}</p>
                </div>
                {service.responseMs !== undefined && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {service.responseMs}ms
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Active Users */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last 15 min</span>
              <span className="text-lg font-bold tabular-nums">{activeCounts.last15m}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last hour</span>
              <span className="text-lg font-bold tabular-nums">{activeCounts.last1h}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last 24 hours</span>
              <span className="text-lg font-bold tabular-nums">{activeCounts.last24h}</span>
            </div>
          </CardContent>
        </Card>

        {/* Database Stats */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Database Tables</CardTitle>
            <CardDescription>Row counts across all models</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {dbStats.map((stat) => (
                <div
                  key={stat.table}
                  className="flex items-center justify-between p-2 rounded border text-sm"
                >
                  <span className="text-muted-foreground">{stat.table}</span>
                  <span className="font-mono tabular-nums font-medium">{stat.rows.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Errors */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Recent Errors</CardTitle>
            <CardDescription>Latest system errors</CardDescription>
          </div>
          <Link
            href="/admin/health/errors"
            className="text-xs text-primary hover:underline"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {recentErrors.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No errors recorded
            </p>
          ) : (
            <div className="space-y-2">
              {recentErrors.map((error) => (
                <div
                  key={error.id}
                  className="flex items-start gap-3 p-2 rounded border text-sm"
                >
                  <Badge
                    variant={error.level === "fatal" ? "destructive" : error.level === "error" ? "destructive" : "secondary"}
                    className="text-[10px] px-1.5 py-0 h-4 shrink-0 mt-0.5"
                  >
                    {error.level}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{error.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {error.source && <span>{error.source} · </span>}
                      {new Date(error.createdAt).toLocaleString()}
                    </p>
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

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add app/(admin)/admin/health/page.tsx
git commit -m "feat(admin): add system health dashboard with status board, db stats, and errors"
```

---

### Task 15: Error Browser Page

**Files:**
- Create: `components/admin/health/error-browser-client.tsx`
- Create: `app/(admin)/admin/health/errors/page.tsx`

- [ ] **Step 1: Create error browser client component**

Create `components/admin/health/error-browser-client.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronUp } from "lucide-react";
import { getErrorLogs } from "@/app/actions/admin/health";

interface ErrorEntry {
  id: string;
  level: string;
  message: string;
  stack: string | null;
  source: string | null;
  action: string | null;
  userId: string | null;
  metadata: unknown;
  createdAt: Date;
}

interface ErrorBrowserProps {
  initialLogs: ErrorEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  frequencyData: Array<{ hour: string; error: number; warn: number; fatal: number }>;
}

export function ErrorBrowserClient({
  initialLogs,
  total,
  page: initialPage,
  pageSize,
  totalPages: initialTotalPages,
  frequencyData,
}: ErrorBrowserProps) {
  const [logs, setLogs] = useState(initialLogs);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [totalCount, setTotalCount] = useState(total);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [level, setLevel] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  function fetchLogs(p: number, lvl?: string, src?: string) {
    startTransition(async () => {
      const result = await getErrorLogs({
        page: p,
        level: lvl || undefined,
        source: src || undefined,
      });
      setLogs(result.logs);
      setPage(result.page);
      setTotalPages(result.totalPages);
      setTotalCount(result.total);
    });
  }

  function handleFilter() {
    fetchLogs(1, level, source);
  }

  return (
    <div className="space-y-6">
      {/* Frequency Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Errors per Hour (Last 24h)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={frequencyData}>
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => v.slice(11, 16)}
                  className="text-muted-foreground"
                />
                <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend />
                <Bar dataKey="error" fill="hsl(var(--destructive))" stackId="a" />
                <Bar dataKey="warn" fill="hsl(var(--primary) / 0.6)" stackId="a" />
                <Bar dataKey="fatal" fill="#991b1b" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-3 items-end">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Level</label>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="warn">Warn</SelectItem>
              <SelectItem value="fatal">Fatal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Source</label>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="server-action">Server Action</SelectItem>
              <SelectItem value="api-route">API Route</SelectItem>
              <SelectItem value="middleware">Middleware</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" className="h-9" onClick={handleFilter} disabled={isPending}>
          Filter
        </Button>
      </div>

      {/* Error list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Errors ({totalCount})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No errors match filters</p>
          ) : (
            <div className="space-y-1">
              {logs.map((error) => (
                <div key={error.id} className="border rounded">
                  <button
                    className="w-full flex items-start gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedId(expandedId === error.id ? null : error.id)}
                  >
                    <Badge
                      variant={error.level === "warn" ? "secondary" : "destructive"}
                      className="text-[10px] px-1.5 py-0 h-4 shrink-0 mt-0.5"
                    >
                      {error.level}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{error.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {error.source && <span>{error.source} · </span>}
                        {error.action && <span>{error.action} · </span>}
                        {new Date(error.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {expandedId === error.id ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </button>
                  {expandedId === error.id && (
                    <div className="px-3 pb-3 space-y-2 border-t bg-muted/30">
                      {error.stack && (
                        <pre className="text-xs overflow-x-auto p-2 mt-2 rounded bg-background font-mono">
                          {error.stack}
                        </pre>
                      )}
                      {error.userId && (
                        <p className="text-xs">
                          <span className="text-muted-foreground">User: </span>
                          <a href={`/admin/users/${error.userId}`} className="text-primary hover:underline">
                            {error.userId}
                          </a>
                        </p>
                      )}
                      {error.metadata && (
                        <pre className="text-xs overflow-x-auto p-2 rounded bg-background font-mono">
                          {JSON.stringify(error.metadata, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchLogs(page - 1, level, source)}
                  disabled={page <= 1 || isPending}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchLogs(page + 1, level, source)}
                  disabled={page >= totalPages || isPending}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Create errors page**

Create `app/(admin)/admin/health/errors/page.tsx`:

```typescript
import { adminAuth } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { getErrorLogs, getErrorFrequency } from "@/app/actions/admin/health";
import { ErrorBrowserClient } from "@/components/admin/health/error-browser-client";

export default async function ErrorsPage() {
  const session = await adminAuth();
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const [logsResult, frequency] = await Promise.all([
    getErrorLogs({ page: 1 }),
    getErrorFrequency(24),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Error Browser</h1>
        <p className="text-sm text-muted-foreground">
          Browse, filter, and investigate system errors
        </p>
      </div>

      <ErrorBrowserClient
        initialLogs={logsResult.logs}
        total={logsResult.total}
        page={logsResult.page}
        pageSize={logsResult.pageSize}
        totalPages={logsResult.totalPages}
        frequencyData={frequency}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add components/admin/health/ app/(admin)/admin/health/errors/
git commit -m "feat(admin): add error browser with frequency chart and expandable detail"
```

---

### Task 16: Enhanced User Detail — Tabbed Layout with All Tabs

**Files:**
- Create: `components/admin/user-detail/user-header.tsx`
- Create: `components/admin/user-detail/user-tabs.tsx`
- Create: `components/admin/user-detail/tab-overview.tsx`
- Create: `components/admin/user-detail/tab-activity.tsx`
- Create: `components/admin/user-detail/tab-railroads.tsx`
- Create: `components/admin/user-detail/tab-actions.tsx`
- Create: `components/admin/user-detail/tab-billing.tsx`
- Create: `components/admin/user-detail/tab-notes.tsx`
- Modify: `app/(admin)/admin/users/[id]/page.tsx`
- Modify: `app/actions/admin/users.ts` (add getUserTimeline, getUserActivityFeed)

This is a large task. Implement in sub-steps:

- [ ] **Step 1: Add new server actions to users.ts**

In `app/actions/admin/users.ts`, add these functions at the end:

```typescript
export async function getUserTimeline(userId: string) {
  await requireAdmin();

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      createdAt: true,
      emailVerified: true,
      plan: true,
      lastLoginAt: true,
    },
  });

  if (!user) return [];

  const events: Array<{ date: Date; label: string; type: string }> = [];
  events.push({ date: user.createdAt, label: "Account created", type: "signup" });

  if (user.emailVerified) {
    events.push({ date: user.emailVerified, label: "Email verified", type: "verified" });
  }

  // Check for first layout
  const firstLayout = await db.layout.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true, name: true },
  });
  if (firstLayout) {
    events.push({
      date: firstLayout.createdAt,
      label: `First railroad created: ${firstLayout.name}`,
      type: "milestone",
    });
  }

  // Check for first session
  const firstSession = await db.operatingSession.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });
  if (firstSession) {
    events.push({ date: firstSession.createdAt, label: "First operating session", type: "milestone" });
  }

  if (user.lastLoginAt) {
    events.push({ date: user.lastLoginAt, label: "Last login", type: "login" });
  }

  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export async function getUserActivityFeed(
  userId: string,
  { page = 1, action }: { page?: number; action?: string } = {}
) {
  await requireAdmin();

  const pageSize = 20;
  const where: Record<string, unknown> = { userId };
  if (action) where.action = action;

  const [activities, total] = await Promise.all([
    db.userActivity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.userActivity.count({ where }),
  ]);

  return {
    activities,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
```

- [ ] **Step 2: Create user header component**

Create `components/admin/user-detail/user-header.tsx`:

```typescript
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import type { Plan, UserRole } from "@prisma/client";

interface UserHeaderProps {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
    plan: Plan;
    emailVerified: Date | null;
    createdAt: Date;
    lastLoginAt: Date | null;
  };
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }
  return email[0].toUpperCase();
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function UserHeader({ user }: UserHeaderProps) {
  return (
    <div className="flex items-start gap-4">
      <Button variant="ghost" size="icon" asChild className="shrink-0 mt-1">
        <Link href="/admin/users">
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </Button>

      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg shrink-0">
          {getInitials(user.name, user.email)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight truncate">
              {user.name || user.email}
            </h1>
            <Badge variant={user.role === "ADMIN" ? "default" : "secondary"} className="text-xs">
              {user.role}
            </Badge>
            <Badge variant={user.plan === "PRO" ? "default" : "outline"} className="text-xs">
              {user.plan}
            </Badge>
            {user.emailVerified ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-amber-500" />
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
            <span>{user.email}</span>
            <span>·</span>
            <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
            {user.lastLoginAt && (
              <>
                <span>·</span>
                <span>Last active {timeAgo(user.lastLoginAt)}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create tabs container (client component)**

Create `components/admin/user-detail/user-tabs.tsx`:

```typescript
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ReactNode } from "react";

interface UserTabsProps {
  overview: ReactNode;
  activity: ReactNode;
  railroads: ReactNode;
  actions: ReactNode;
  billing: ReactNode;
  notes: ReactNode;
}

export function UserTabs({ overview, activity, railroads, actions, billing, notes }: UserTabsProps) {
  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="railroads">Railroads</TabsTrigger>
        <TabsTrigger value="actions">Admin Actions</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
        <TabsTrigger value="notes">Notes</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">{overview}</TabsContent>
      <TabsContent value="activity">{activity}</TabsContent>
      <TabsContent value="railroads">{railroads}</TabsContent>
      <TabsContent value="actions">{actions}</TabsContent>
      <TabsContent value="billing">{billing}</TabsContent>
      <TabsContent value="notes">{notes}</TabsContent>
    </Tabs>
  );
}
```

- [ ] **Step 4: Create overview tab**

Create `components/admin/user-detail/tab-overview.tsx`:

```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, TrainFront, Train } from "lucide-react";

interface TimelineEvent {
  date: Date;
  label: string;
  type: string;
}

interface LayoutInfo {
  id: string;
  name: string;
  description: string | null;
  scale?: string | null;
  era?: string | null;
  _count: {
    locations: number;
    freightCars: number;
    locomotives: number;
    trains: number;
  };
}

interface TabOverviewProps {
  timeline: TimelineEvent[];
  layouts: LayoutInfo[];
  subscription: {
    plan: string;
    stripeCustomerId: string | null;
    stripeSubId: string | null;
    planExpiresAt: Date | null;
  };
}

export function TabOverview({ timeline, layouts, subscription }: TabOverviewProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Account Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events</p>
          ) : (
            <div className="relative pl-6 space-y-4">
              <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />
              {timeline.map((event, i) => (
                <div key={i} className="relative flex gap-3">
                  <div className="absolute -left-6 top-1.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
                  <div>
                    <p className="text-sm">{event.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-6">
        {/* Subscription */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Plan</span>
              <Badge variant={subscription.plan === "PRO" ? "default" : "outline"}>
                {subscription.plan}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Stripe Customer</span>
              <span className="font-mono text-xs">{subscription.stripeCustomerId ?? "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subscription</span>
              <span className="font-mono text-xs">{subscription.stripeSubId ?? "—"}</span>
            </div>
            {subscription.planExpiresAt && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Expires</span>
                <span>{new Date(subscription.planExpiresAt).toLocaleDateString()}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Railroads summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Railroads ({layouts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {layouts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No railroads</p>
            ) : (
              <div className="space-y-3">
                {layouts.map((layout) => (
                  <div key={layout.id} className="p-3 rounded-lg border">
                    <p className="text-sm font-medium">{layout.name}</p>
                    {(layout.scale || layout.era) && (
                      <p className="text-xs text-muted-foreground">
                        {[layout.scale, layout.era].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {layout._count.locations}</span>
                      <span className="flex items-center gap-1"><TrainFront className="h-3 w-3" /> {layout._count.locomotives}</span>
                      <span className="flex items-center gap-1"><Train className="h-3 w-3" /> {layout._count.freightCars}</span>
                    </div>
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
```

- [ ] **Step 5: Create activity tab (client component)**

Create `components/admin/user-detail/tab-activity.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserActivityFeed } from "@/app/actions/admin/users";

interface TabActivityProps {
  userId: string;
  initialData: Awaited<ReturnType<typeof getUserActivityFeed>>;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function TabActivity({ userId, initialData }: TabActivityProps) {
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  function loadPage(page: number) {
    startTransition(async () => {
      const result = await getUserActivityFeed(userId, { page });
      setData(result);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Activity Feed</CardTitle>
      </CardHeader>
      <CardContent>
        {data.activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No activity recorded</p>
        ) : (
          <div className="space-y-2">
            {data.activities.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-2 rounded border text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono text-xs">{a.action}</Badge>
                  {a.metadata && (
                    <span className="text-xs text-muted-foreground">
                      {JSON.stringify(a.metadata)}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{timeAgo(a.createdAt)}</span>
              </div>
            ))}
          </div>
        )}

        {data.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Page {data.page} of {data.totalPages}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => loadPage(data.page - 1)} disabled={data.page <= 1 || isPending}>Previous</Button>
              <Button variant="outline" size="sm" onClick={() => loadPage(data.page + 1)} disabled={data.page >= data.totalPages || isPending}>Next</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 6: Create railroads tab**

Create `components/admin/user-detail/tab-railroads.tsx`:

```typescript
"use client";

import { useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, MapPin, TrainFront, Train, Route, PlayCircle } from "lucide-react";
import { startImpersonation } from "@/app/actions/admin/impersonate";

interface LayoutDetail {
  id: string;
  name: string;
  description: string | null;
  scale?: string | null;
  era?: string | null;
  _count: {
    locations: number;
    freightCars: number;
    locomotives: number;
    trains: number;
  };
}

interface TabRailroadsProps {
  layouts: LayoutDetail[];
  userId: string;
  isCurrentUser: boolean;
}

export function TabRailroads({ layouts, userId, isCurrentUser }: TabRailroadsProps) {
  const [isPending, startTransition] = useTransition();

  function handleImpersonate() {
    startTransition(async () => {
      await startImpersonation(userId);
    });
  }

  return (
    <div className="space-y-4">
      {layouts.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground text-center">No railroads created</p>
          </CardContent>
        </Card>
      ) : (
        layouts.map((layout) => (
          <Card key={layout.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">{layout.name}</CardTitle>
                {(layout.scale || layout.era) && (
                  <p className="text-xs text-muted-foreground">
                    {[layout.scale && `${layout.scale} Scale`, layout.era].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              {!isCurrentUser && (
                <Button variant="outline" size="sm" onClick={handleImpersonate} disabled={isPending}>
                  <Eye className="h-3.5 w-3.5 mr-1.5" /> Impersonate & View
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { icon: MapPin, label: "Locations", count: layout._count.locations },
                  { icon: TrainFront, label: "Locomotives", count: layout._count.locomotives },
                  { icon: Train, label: "Freight Cars", count: layout._count.freightCars },
                  { icon: Route, label: "Trains", count: layout._count.trains },
                ].map(({ icon: Icon, label, count }) => (
                  <div key={label} className="text-center p-3 rounded-lg border">
                    <Icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-lg font-bold tabular-nums">{count}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
```

- [ ] **Step 7: Create actions tab (client — preserves existing actions)**

Create `components/admin/user-detail/tab-actions.tsx`:

```typescript
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Eye, UserCog, CheckCircle, CreditCard, Trash2, ShieldAlert,
} from "lucide-react";
import { toggleAdminRole, verifyUserEmail, deleteUser, resetUserPassword } from "@/app/actions/admin/users";
import { adminCancelSubscription, adminGrantPlan } from "@/app/actions/admin/billing";
import { startImpersonation } from "@/app/actions/admin/impersonate";
import type { Plan, UserRole } from "@prisma/client";

interface TabActionsProps {
  user: {
    id: string;
    email: string;
    role: UserRole;
    plan: Plan;
    emailVerified: Date | null;
  };
  adminId: string;
}

export function TabActions({ user, adminId }: TabActionsProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isCurrentUser = user.id === adminId;

  function handleAction(action: () => Promise<{ success?: boolean; error?: string } | void>) {
    startTransition(async () => {
      const result = await action();
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Action completed");
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Account Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!isCurrentUser && (
            <Button
              variant="outline" size="sm" className="w-full justify-start gap-2"
              onClick={() => handleAction(() => startImpersonation(user.id))}
              disabled={isPending}
            >
              <Eye className="h-3.5 w-3.5" /> Impersonate User
            </Button>
          )}
          {!isCurrentUser && (
            <Button
              variant="outline" size="sm" className="w-full justify-start gap-2"
              onClick={() => handleAction(() => toggleAdminRole(user.id))}
              disabled={isPending}
            >
              <UserCog className="h-3.5 w-3.5" />
              {user.role === "ADMIN" ? "Demote to User" : "Promote to Admin"}
            </Button>
          )}
          {!user.emailVerified && (
            <Button
              variant="outline" size="sm" className="w-full justify-start gap-2"
              onClick={() => handleAction(() => verifyUserEmail(user.id))}
              disabled={isPending}
            >
              <CheckCircle className="h-3.5 w-3.5" /> Verify Email
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Subscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {user.plan === "FREE" ? (
            <Button
              variant="outline" size="sm" className="w-full justify-start gap-2"
              onClick={() => handleAction(() => adminGrantPlan(user.id))}
              disabled={isPending}
            >
              <CreditCard className="h-3.5 w-3.5" /> Grant Operator Plan
            </Button>
          ) : (
            <Button
              variant="outline" size="sm" className="w-full justify-start gap-2"
              onClick={() => handleAction(() => adminCancelSubscription(user.id))}
              disabled={isPending}
            >
              <CreditCard className="h-3.5 w-3.5" /> Revert to Free Plan
            </Button>
          )}
        </CardContent>
      </Card>

      {!isCurrentUser && (
        <Card className="sm:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive" size="sm" className="justify-start gap-2"
              onClick={() => {
                if (confirm(`Delete ${user.email}? This cannot be undone.`)) {
                  handleAction(() => deleteUser(user.id));
                }
              }}
              disabled={isPending}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete User
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Create billing tab (client component)**

Create `components/admin/user-detail/tab-billing.tsx`:

```typescript
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StripeDetails {
  subscription: {
    status: string;
    currentPeriodEnd: string;
  } | null;
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    created: string;
  }>;
  error?: string;
}

interface TabBillingProps {
  stripeDetails: StripeDetails;
  plan: string;
  stripeCustomerId: string | null;
}

export function TabBilling({ stripeDetails, plan, stripeCustomerId }: TabBillingProps) {
  if (!stripeCustomerId) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-muted-foreground text-center">
            No Stripe customer linked to this account
          </p>
        </CardContent>
      </Card>
    );
  }

  if (stripeDetails.error) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-amber-600 text-center">
            {stripeDetails.error}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Subscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={stripeDetails.subscription ? "default" : "secondary"}>
              {stripeDetails.subscription?.status ?? "No subscription"}
            </Badge>
          </div>
          {stripeDetails.subscription && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current Period Ends</span>
              <span>{new Date(stripeDetails.subscription.currentPeriodEnd).toLocaleDateString()}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Stripe Customer</span>
            <span className="font-mono text-xs">{stripeCustomerId}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {stripeDetails.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No payments</p>
          ) : (
            <div className="space-y-2">
              {stripeDetails.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm p-2 rounded border">
                  <div>
                    <span className="font-medium tabular-nums">${(p.amount / 100).toFixed(2)}</span>
                    <span className="text-muted-foreground ml-2">{p.currency.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={p.status === "succeeded" ? "default" : "destructive"}
                      className="text-[10px]"
                    >
                      {p.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(p.created).toLocaleDateString()}
                    </span>
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

- [ ] **Step 9: Create notes tab (client component)**

Create `components/admin/user-detail/tab-notes.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Pencil, Loader2 } from "lucide-react";
import { createAdminNote, updateAdminNote, deleteAdminNote } from "@/app/actions/admin/notes";

interface Note {
  id: string;
  adminId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TabNotesProps {
  notes: Note[];
  userId: string;
  currentAdminId: string;
}

export function TabNotes({ notes: initialNotes, userId, currentAdminId }: TabNotesProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    if (!newContent.trim()) return;
    startTransition(async () => {
      const result = await createAdminNote(userId, newContent);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else if (result.success && result.note) {
        setNotes([result.note, ...notes]);
        setNewContent("");
        toast.success("Note added");
      }
    });
  }

  function handleUpdate(noteId: string) {
    if (!editContent.trim()) return;
    startTransition(async () => {
      const result = await updateAdminNote(noteId, editContent);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else if (result.success && result.note) {
        setNotes(notes.map((n) => (n.id === noteId ? result.note! : n)));
        setEditingId(null);
        toast.success("Note updated");
      }
    });
  }

  function handleDelete(noteId: string) {
    if (!confirm("Delete this note?")) return;
    startTransition(async () => {
      const result = await deleteAdminNote(noteId);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        setNotes(notes.filter((n) => n.id !== noteId));
        toast.success("Note deleted");
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Add Note</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Add an internal note about this user..."
            rows={3}
          />
          <Button size="sm" onClick={handleCreate} disabled={isPending || !newContent.trim()}>
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
            Add Note
          </Button>
        </CardContent>
      </Card>

      {notes.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground text-center">No notes yet</p>
          </CardContent>
        </Card>
      ) : (
        notes.map((note) => (
          <Card key={note.id}>
            <CardContent className="pt-4">
              {editingId === note.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleUpdate(note.id)} disabled={isPending}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground">
                      {new Date(note.createdAt).toLocaleString()}
                      {note.updatedAt > note.createdAt && " (edited)"}
                    </p>
                    {note.adminId === currentAdminId && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost" size="sm" className="h-7 w-7 p-0"
                          onClick={() => { setEditingId(note.id); setEditContent(note.content); }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive"
                          onClick={() => handleDelete(note.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
```

- [ ] **Step 10: Rebuild the user detail page**

Replace `app/(admin)/admin/users/[id]/page.tsx` with:

```typescript
import { adminAuth } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { getUserDetails, getUserTimeline, getUserActivityFeed } from "@/app/actions/admin/users";
import { getAdminNotes } from "@/app/actions/admin/notes";
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

  // Fetch Stripe details if customer is linked
  let stripeDetails = { subscription: null as { status: string; currentPeriodEnd: string } | null, payments: [] as Array<{ id: string; amount: number; currency: string; status: string; created: string }>, error: undefined as string | undefined };

  if (user.stripeCustomerId) {
    try {
      const { getStripeClient } = await import("@/lib/stripe");
      const stripe = await getStripeClient();

      const [subs, charges] = await Promise.all([
        stripe.subscriptions.list({ customer: user.stripeCustomerId, limit: 1 }),
        stripe.charges.list({ customer: user.stripeCustomerId, limit: 10 }),
      ]);

      stripeDetails = {
        subscription: subs.data[0]
          ? {
              status: subs.data[0].status,
              currentPeriodEnd: new Date(subs.data[0].current_period_end * 1000).toISOString(),
            }
          : null,
        payments: charges.data.map((c) => ({
          id: c.id,
          amount: c.amount,
          currency: c.currency,
          status: c.status,
          created: new Date(c.created * 1000).toISOString(),
        })),
        error: undefined,
      };
    } catch (error) {
      stripeDetails.error = error instanceof Error ? error.message : "Failed to load Stripe data";
    }
  }

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
            stripeDetails={stripeDetails}
            plan={user.plan}
            stripeCustomerId={user.stripeCustomerId}
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

- [ ] **Step 11: Remove old client.tsx (no longer needed)**

Delete `app/(admin)/admin/users/[id]/client.tsx` — its functionality has been split across the tab components.

- [ ] **Step 12: Verify build**

```bash
npm run build
```

- [ ] **Step 13: Commit**

```bash
git add components/admin/user-detail/ app/(admin)/admin/users/[id]/ app/actions/admin/users.ts app/actions/admin/notes.ts
git rm app/(admin)/admin/users/[id]/client.tsx 2>/dev/null; git commit -m "feat(admin): rebuild user detail page with tabbed layout — overview, activity, railroads, actions, billing, notes"
```

---

### Task 17: Final Build Verification & Lint

- [ ] **Step 1: Run full build**

```bash
npm run build
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

- [ ] **Step 3: Fix any lint or type errors**

Address each error individually. Common issues:
- Unused imports (remove them)
- Missing `key` props (add them)
- Type mismatches (align types between server actions and components)

- [ ] **Step 4: Final commit if fixes were needed**

```bash
git add -A
git commit -m "fix: resolve lint and type errors from admin panel Phase 1"
```
