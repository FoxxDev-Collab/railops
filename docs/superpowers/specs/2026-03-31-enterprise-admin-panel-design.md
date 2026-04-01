# Enterprise Admin Panel — Design Spec

## Overview

Upgrade the RailOps admin panel from basic user/settings management to a full enterprise-grade SaaS administration platform. Three phases, six modules, building visibility first so admins can see the landscape before acting on it.

**Design aesthetic:** Clean Enterprise (Stripe/Linear-inspired). Light/dark theme support, refined typography, generous whitespace, subtle depth. Professional and trustworthy.

**Charting library:** Recharts (direct usage, not shadcn wrapper) for full customization control.

**Data strategy:** Purpose-built tables per module. No event sourcing — simple, fast, Prisma-native.

## Phase 1: Analytics & BI + Operational Health + Enhanced User Detail + Stripe Revenue

### New Prisma Models

```prisma
model UserActivity {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  action    String   // "login", "layout.create", "session.start", "freight_car.create", etc.
  metadata  Json?
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([action])
  @@index([createdAt])
  @@index([userId, action, createdAt])
}

model DailyMetric {
  id        String   @id @default(cuid())
  date      DateTime @db.Date
  metric    String   // "total_users", "pro_users", "mrr", "signups", "active_users"
  value     Float
  metadata  Json?

  @@unique([date, metric])
  @@index([metric, date])
}

model SystemMetric {
  id        String   @id @default(cuid())
  metric    String   // "db.row_count.User", "db.size_bytes", "api.response_time_ms"
  value     Float
  metadata  Json?
  createdAt DateTime @default(now())

  @@index([metric, createdAt])
}

model ErrorLog {
  id         String   @id @default(cuid())
  level      String   // "error", "warn", "fatal"
  message    String
  stack      String?
  source     String?  // "server-action", "api-route", "middleware"
  action     String?
  userId     String?
  metadata   Json?
  createdAt  DateTime @default(now())

  @@index([level, createdAt])
  @@index([source, createdAt])
  @@index([createdAt])
}

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

User model additions: `activities UserActivity[]`, `adminNotes AdminNote[]`.

### New Dependencies

- `recharts` — charting library for analytics dashboards
- `stripe` CLI — dev dependency for webhook testing (`stripe listen --forward-to localhost:3000/api/webhooks/stripe`)

### Route: `/admin/analytics` — Growth Dashboard

Server Component page. Data fetched via server actions.

**Key metrics row (top):**
- Total Users — with sparkline and % change vs prior 30d period
- MRR (from Stripe API, not computed) — with trend
- Conversion Rate (free → pro) — with trend
- Churn Rate (30d) — users who downgraded or went inactive
- ARPU (average revenue per user)

**Charts:**
- Signup trend (Recharts AreaChart): daily/weekly/monthly signups. Time range selector: 7d, 30d, 90d, 1y, all. Data from DailyMetric snapshots.
- MRR trend line (LineChart): monthly recurring revenue over time from DailyMetric.
- Plan distribution over time (StackedAreaChart): free vs pro users tracked daily.
- Conversion funnel (horizontal BarChart): signup → verified → created layout → added stock → ran session. Computed from UserActivity aggregation.

**Server actions:**
- `getGrowthMetrics(range)` — queries DailyMetric for the selected time range, computes deltas
- `getConversionFunnel()` — counts users who reached each milestone via UserActivity
- `getSignupTrend(range, granularity)` — daily/weekly/monthly signup counts

### Route: `/admin/analytics/cohorts` — Cohort Analysis

**Retention grid:**
- Classic cohort table. Rows = signup months, columns = months since signup, cells = % still active.
- "Active" defined as having a UserActivity "login" event in that month.
- Color-coded cells (green = high retention, red = low).

**Conversion timeline:**
- Per signup cohort, what % converted to Pro and when.
- Time range selector: last 6 months, last 12 months.

**Server actions:**
- `getCohortRetention(months)` — builds the cohort matrix from User.createdAt + UserActivity login events
- `getCohortConversion(months)` — tracks plan changes per cohort

### Route: `/admin/analytics/usage` — Feature Usage

**Top features table:**
- Ranked list of UserActivity action types. Columns: action, total events, unique users, 7d trend sparkline.
- Sortable by any column.

**Engagement distribution:**
- Bar chart bucketing users: power (daily), regular (weekly), casual (monthly), dormant (>30d inactive).
- Computed from UserActivity login frequency.

**Resource counts:**
- Aggregate table: total layouts, locations, rolling stock (by type), trains, sessions across all users.
- Each with growth trend (vs 30d ago) from DailyMetric.

**Server actions:**
- `getFeatureUsageStats()` — aggregates UserActivity by action type
- `getEngagementDistribution()` — buckets users by activity frequency
- `getResourceCounts()` — counts all major model types with trend data

### Route: `/admin/analytics/revenue` — Stripe Revenue Dashboard

All data pulled from Stripe API using the configured secret key.

**Revenue metrics row:**
- MRR (from active subscriptions)
- ARR (MRR × 12)
- Net revenue this month (from balance transactions)
- Next payout amount and date

**Charts:**
- Revenue by period (BarChart): daily/weekly/monthly revenue from `stripe.balanceTransactions.list`
- Subscription growth (LineChart): active subscriptions over time

**Tables:**
- Recent payments: last 20 charges with status (succeeded/failed/refunded), amount, customer email, date
- Failed payments: charges with `status: "failed"` — customer email, amount, failure reason, retry status
- Payouts: upcoming and past payouts from `stripe.payouts.list` — amount, status, arrival date, bank info (masked)
- Refunds & disputes: any chargebacks or refund requests with status

**Server actions:**
- `getStripeRevenue()` — MRR from subscriptions, ARR, net revenue
- `getStripePayments(page)` — paginated recent charges
- `getStripeFailedPayments()` — failed charges with details
- `getStripePayouts(page)` — payout history
- `getStripeDisputes()` — active disputes/refunds

### Route: `/admin/health` — System Dashboard

**Status board (top row):**
- Database: lightweight query to verify connection (green/red)
- SMTP: connection test result (green/amber/red) — reuse existing `testSmtpConnection`
- Stripe: API key validation (green/amber/red) — reuse existing `testStripeConnection`
- Auth: NextAuth health check

Each indicator shows green (healthy), amber (degraded/slow), red (down).

**Database stats:**
- Table with row counts for: User, Layout, Location, Industry, Locomotive, FreightCar, PassengerCar, Caboose, MOWEquipment, Train, Waybill, CarCard, OperatingSession.
- Total estimated database size.

**Recent errors:**
- Last 20 ErrorLog entries. Columns: level badge, message (truncated), source, timestamp.
- Link to full error browser.

**Active users:**
- Count of users with UserActivity in last 15min / 1hr / 24hr.

**Server actions:**
- `getSystemHealth()` — runs all health checks in parallel
- `getDatabaseStats()` — row counts for all major tables
- `getRecentErrors(limit)` — latest ErrorLog entries
- `getActiveUserCounts()` — active user counts by time window

### Route: `/admin/health/errors` — Error Browser

**Paginated table:**
- Columns: level (color-coded badge), message, source, action, timestamp
- Expandable rows: full stack trace, metadata JSON, userId (linked to user detail)

**Filters:**
- Level: error / warn / fatal (multi-select)
- Source: server-action / api-route / middleware
- Date range picker

**Error frequency chart:**
- BarChart showing errors per hour over last 24h. Color-coded by level.

**Server actions:**
- `getErrorLogs({ page, level, source, dateFrom, dateTo })` — filtered, paginated query
- `getErrorFrequency(hours)` — hourly error counts for chart

### Route: `/admin/users/[id]` — Enhanced User Detail (rebuild)

Replace current basic detail page with tabbed customer profile.

**Header (always visible):**
- Avatar/initials circle, full name, email, plan badge, account age, last active timestamp
- Quick action buttons: Impersonate, Send Email (Phase 2), Suspend (Phase 2)

**Tab 1: Overview**
- Account timeline: vertical timeline showing key events — signup, email verified, first layout created, plan changes, notable milestones. Data from UserActivity + User fields.
- Railroads summary: cards for each layout with name, scale, era, and counts (locations, rolling stock, trains, sessions).
- Subscription details: plan, Stripe customer ID (linked), subscription ID, current period, next billing date, expiry.

**Tab 2: Activity**
- Paginated UserActivity feed for this user.
- Filter by action type dropdown.
- Each entry: action badge, description, metadata details, relative timestamp.

**Tab 3: Railroads**
- Detailed per-layout breakdown: location count, rolling stock by type, trains, sessions run.
- Click "Impersonate & View" to jump into their dashboard viewing that layout.

**Tab 4: Admin Actions**
- Existing actions preserved: toggle role, change plan, reset password, verify email, impersonate.
- New actions: grant/revoke Pro (admin override), session invalidation (bump sessionVersion).
- Each action shows confirmation with audit trail note.

**Tab 5: Billing** (Stripe)
- Subscription status, current period start/end, next invoice date.
- Payment history for this customer from Stripe: date, amount, status, invoice link.
- Invoices list: viewable/downloadable from Stripe.
- Admin actions: issue refund, apply coupon/discount, create one-off invoice, cancel/pause subscription.

**Tab 6: Notes**
- AdminNote feed. Most recent first.
- Add note form: textarea + submit. Markdown support.
- Edit/delete own notes. Shows admin name and timestamp.

**Server actions:**
- `getUserTimeline(userId)` — builds timeline from UserActivity + User fields
- `getUserActivityFeed(userId, { page, action })` — paginated activity
- `getUserLayoutDetails(userId)` — all layouts with full resource counts
- `getStripeCustomerDetails(stripeCustomerId)` — subscription, payments, invoices from Stripe
- `issueRefund(chargeId, amount?)` — partial or full refund via Stripe
- `cancelSubscription(stripeSubId)` — cancel via Stripe + update local plan
- `createAdminNote(userId, content)` — create note
- `updateAdminNote(noteId, content)` — edit note
- `deleteAdminNote(noteId)` — delete note

### Activity Tracking Integration

To populate UserActivity, add tracking calls to existing server actions:

- `app/actions/auth.ts` — track "login" on successful sign-in
- `app/actions/layouts.ts` — track "layout.create", "layout.delete"
- Rolling stock create actions — track "locomotive.create", "freight_car.create", etc.
- Train actions — track "train.create", "session.start", "session.complete"
- Waybill actions — track "waybill.create"

Implementation: a lightweight `trackActivity(userId, action, metadata?)` helper in `lib/activity.ts` that does a fire-and-forget `db.userActivity.create()`. Non-blocking — failures are logged but don't break the parent action.

### DailyMetric Snapshot Job

A server action `computeDailySnapshot()` that:
1. Counts current total_users, pro_users, free_users, active_users (24h)
2. Computes MRR from Stripe or from pro user count
3. Writes/upserts DailyMetric rows for today
4. Called via cron (Vercel Cron or manual trigger from admin UI)

Route: `app/api/cron/daily-metrics/route.ts` — protected by a cron secret header.

### Error Logging Integration

A `logError(params)` helper in `lib/error-logger.ts`:
- Called in catch blocks of server actions and API routes
- Captures: level, message, stack, source, action name, userId if available
- Writes to ErrorLog table
- Non-blocking, fire-and-forget

### Admin Sidebar Navigation Update

Update the admin sidebar to include new sections:

```
Dashboard          (existing — /admin)
Users              (existing — /admin/users)
Analytics          (new)
  ├─ Growth        (/admin/analytics)
  ├─ Cohorts       (/admin/analytics/cohorts)
  ├─ Usage         (/admin/analytics/usage)
  └─ Revenue       (/admin/analytics/revenue)
System Health      (new)
  ├─ Overview      (/admin/health)
  └─ Errors        (/admin/health/errors)
Billing            (existing — /admin/billing)
Settings           (existing — /admin/system)
Audit Log          (existing — /admin/audit)
```

---

## Phase 2: Customer Lifecycle + Email Center

### New Prisma Models

```prisma
enum AccountStatus {
  ACTIVE
  SUSPENDED
  CHURNED
  DEACTIVATED
}

model EmailTemplate {
  id        String   @id @default(cuid())
  slug      String   @unique  // "welcome", "verification", "plan-change", etc.
  name      String
  subject   String
  htmlBody  String   @db.Text
  variables String[] // ["user.name", "plan.name", "app.url"]
  isActive  Boolean  @default(true)
  updatedBy String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model EmailLog {
  id           String   @id @default(cuid())
  recipientId  String?
  recipientEmail String
  templateSlug String?
  subject      String
  status       String   // "sent", "failed", "bounced"
  errorMessage String?
  broadcastId  String?
  broadcast    EmailBroadcast? @relation(fields: [broadcastId], references: [id], onDelete: SetNull)
  sentBy       String?  // admin who triggered it
  createdAt    DateTime @default(now())

  @@index([recipientId, createdAt])
  @@index([templateSlug])
  @@index([status])
  @@index([broadcastId])
  @@index([createdAt])
}

model EmailBroadcast {
  id           String   @id @default(cuid())
  name         String
  subject      String
  htmlBody     String   @db.Text
  segment      Json     // filter criteria: { plan: "FREE", status: "ACTIVE", etc. }
  scheduledFor DateTime?
  sentAt       DateTime?
  totalSent    Int      @default(0)
  totalFailed  Int      @default(0)
  createdBy    String
  createdAt    DateTime @default(now())

  emailLogs    EmailLog[]

  @@index([createdAt])
}
```

User model addition: `accountStatus AccountStatus @default(ACTIVE)`.

### Routes

**`/admin/customers`** — Customer Lifecycle Dashboard
- Pipeline view: user counts by AccountStatus (ACTIVE / SUSPENDED / CHURNED / DEACTIVATED)
- At-risk list: users with no login in 14+ days, sorted by last active
- Churn rate trend chart
- Bulk actions: email segment, suspend inactive, reactivate with notification
- Automated transition rules (configurable): inactivity thresholds for at-risk flagging and churn

**`/admin/email`** — Email Templates
- List all templates with name, slug, last updated, active status
- Click through to edit: HTML editor with variable interpolation preview
- Send test email to yourself

**`/admin/email/compose`** — Compose & Send
- Recipient picker: individual user search, or segment filter (plan, status, verified, signup date range, activity level)
- Template selector or freeform compose
- Preview rendered email before sending
- Send immediately or schedule

**`/admin/email/broadcasts`** — Broadcast Management
- List past and scheduled broadcasts with delivery stats
- Create new: name, subject, body, segment filter, schedule time
- View delivery report: sent, failed, per-recipient status

**`/admin/email/log`** — Email Log
- Paginated, filterable table of all EmailLog entries
- Filters: status, template, date range, recipient search
- Shows: recipient, subject, template, status, timestamp

---

## Phase 3: Feature Flags

### New Prisma Models

```prisma
model FeatureFlag {
  id            String   @id @default(cuid())
  key           String   @unique  // "waybill-generator", "multi-session", etc.
  name          String
  description   String?
  enabled       Boolean  @default(false)
  enabledPlans  Plan[]   // which plans get this feature
  rolloutPct    Int      @default(100) // percentage rollout (0-100)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  overrides     UserFeatureOverride[]

  @@index([key])
}

model UserFeatureOverride {
  id        String      @id @default(cuid())
  userId    String
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  flagId    String
  flag      FeatureFlag @relation(fields: [flagId], references: [id], onDelete: Cascade)
  enabled   Boolean     // true = force-enable (beta), false = force-disable
  reason    String?
  createdAt DateTime    @default(now())

  @@unique([userId, flagId])
  @@index([userId])
  @@index([flagId])
}
```

User model addition: `featureOverrides UserFeatureOverride[]`.

### Routes

**`/admin/features`** — Feature Flags Dashboard
- Table of all flags: name, key, enabled status, plan requirements, rollout %, override count
- Toggle enable/disable inline
- Click through to detail/edit page

**`/admin/features/[id]`** — Flag Detail
- Edit name, description, enabled, plan tiers, rollout percentage
- User overrides section: search and add users for beta access or force-disable
- Audit: who changed this flag and when (via AuditLog)

### Server-Side Helper

`lib/features.ts`:
```typescript
async function hasFeature(userId: string, flagKey: string): Promise<boolean>
```
Check order: user override → flag enabled → plan tier match → rollout percentage (hash-based for consistency).

### Plan Limits Configuration

Extend FeatureFlag or SystemSetting to store configurable limits:
- `limit.free.items` (default: 25) — max rolling stock + locations on free tier
- `limit.free.layouts` (default: 1)
- `limit.free.sessions` (default: 5/month)

Admin UI: editable from `/admin/features` with a dedicated "Plan Limits" section.

---

## Design Principles (All Phases)

- **Clean Enterprise aesthetic**: Stripe/Linear-inspired. Light backgrounds, excellent typography, generous whitespace, subtle depth. Light/dark theme via existing next-themes setup.
- **No modals for CRUD**: all create/edit flows use dedicated pages per project convention.
- **Server Components by default**: pages are Server Components. Client Components only for interactive elements (charts, forms, filters).
- **Audit everything**: all admin actions logged to AuditLog.
- **Non-blocking tracking**: UserActivity and ErrorLog writes are fire-and-forget — never block the user's action.
- **Existing patterns**: follow existing server action patterns (requireAdmin guard, zod validation, revalidatePath). Follow existing component patterns (shadcn/ui primitives, Lucide icons).

## Files Affected (Phase 1 Summary)

**New files:**
- `prisma/schema.prisma` — add 5 new models + User relation updates
- `lib/activity.ts` — UserActivity tracking helper
- `lib/error-logger.ts` — ErrorLog write helper
- `app/(admin)/admin/analytics/page.tsx` — Growth dashboard
- `app/(admin)/admin/analytics/cohorts/page.tsx` — Cohort analysis
- `app/(admin)/admin/analytics/usage/page.tsx` — Feature usage
- `app/(admin)/admin/analytics/revenue/page.tsx` — Stripe revenue
- `app/(admin)/admin/health/page.tsx` — System health
- `app/(admin)/admin/health/errors/page.tsx` — Error browser
- `app/actions/admin/analytics.ts` — analytics server actions
- `app/actions/admin/health.ts` — health check server actions
- `app/actions/admin/stripe-revenue.ts` — Stripe revenue server actions
- `app/actions/admin/notes.ts` — admin notes CRUD
- `app/api/cron/daily-metrics/route.ts` — daily snapshot cron
- `components/admin/analytics/` — chart components (growth, cohorts, usage, revenue)
- `components/admin/health/` — health dashboard components
- `components/admin/user-detail/` — tabbed user detail components

**Modified files:**
- `prisma/schema.prisma` — new models
- `app/(admin)/admin/users/[id]/page.tsx` — rebuild as tabbed profile
- `app/(admin)/admin/users/[id]/client.tsx` — rebuild with tabs
- `components/layout/app-sidebar.tsx` — add Analytics and Health nav sections
- Existing server actions (auth, layouts, rolling stock, trains) — add `trackActivity` calls
- `package.json` — add `recharts`
