# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RailOps is a cloud-native model railroad operations platform built with Next.js 16 (App Router). It generates waybills and manifests for model railroad hobbyists, replacing spreadsheets and physical car cards.

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npx prisma generate  # Regenerate Prisma client after schema changes
npx prisma migrate dev     # Create and apply migrations (dev)
npx prisma migrate deploy  # Apply pending migrations (production)
npx prisma studio    # Visual database browser
npx tsx scripts/create-admin.ts  # Create admin user
```

## Architecture

- **Stack:** Next.js 16, TypeScript, Tailwind CSS v4, shadcn/ui (Radix primitives), Prisma, NextAuth.js v5 (beta), Neon Postgres
- **Auth:** Credentials provider with bcryptjs. JWT strategy. Config split across `auth.config.ts` (provider logic) and `auth.ts` (callbacks, pages). Custom types in `types/next-auth.d.ts` extend session with `id` and `role`.
- **Database:** Prisma client singleton at `lib/db/index.ts` (exported as `db`). Schema at `prisma/schema.prisma`. User helpers in `lib/db/user.ts`.
- **Middleware:** `middleware.ts` protects `/dashboard/*` (requires login) and `/admin/*` (requires ADMIN role). Auth pages redirect logged-in users to dashboard.

### Route Groups

- `app/(auth)/` — Login/register pages
- `app/(dashboard)/` — Protected layout management UI
- `app/(admin)/` — Admin-only routes
- `app/actions/` — Server actions (`layouts.ts`, `auth.ts`, `admin/`)
- `app/api/auth/` — NextAuth route handler

### Domain Models (Prisma)

All user-owned resources cascade delete from User. Layout is the top-level railroad container.

**Locations:** Unified `Location` model with `locationType` enum (PASSENGER_STATION, YARD, INTERCHANGE, JUNCTION, STAGING, TEAM_TRACK, SIDING). `Industry` is a child of Location. `YardTrack` models internal yard tracks (ARRIVAL, CLASSIFICATION, DEPARTURE, RIP, etc.).

**Rolling Stock:** Separate tables per type — `Locomotive` (with DCC fields), `FreightCar` (with AAR codes), `PassengerCar`, `MOWEquipment`, `Caboose`. All share `RollingStockStatus` enum and `currentLocationId`.

**Trains:** `Train` replaces Route (with trainClass, serviceType, origin/destination). `TrainStop` for ordered stops. `TrainConsist` composes a train for a session. `ConsistPosition` uses polymorphic nullable FKs to reference any rolling stock type.

**Waybills:** Four-panel system. `Waybill` → `WaybillPanel` (1-4 panels, each with load status, commodity, origin/destination, shipper/consignee industry). `CarCard` links a FreightCar to its current Waybill and physical location.

**Operations:** `OperatingSession` → `SessionTrain`. `SwitchList` → `SwitchListEntry` (denormalized for printing).

**Maintenance:** `MaintenanceTask` and `BadOrder` use polymorphic FKs + `AssetType` discriminator to reference any rolling stock type.

### UI Components

- `components/ui/` — shadcn/ui primitives
- `components/layout/` — App shell (sidebar, header)
- `components/layouts/` — Layout CRUD components
- `components/auth/` — Login/register forms
- `components/theme/` — Theme provider (next-themes)

## Required Skills

Always proactively apply the following skills when working on this project — do NOT wait for the user to ask:

- **`/frontend-design`** — Use on ALL UI work. Every component, page, or layout change must produce polished, production-grade design. No generic AI aesthetics.
- **`/ui-ux-pro-max`** — Use alongside frontend-design for color systems, typography, spacing, interaction states, and responsive design decisions.
- **`/nextjs-app-router-patterns`** — Use for ALL route, page, layout, data fetching, and Server Component work. This is a Next.js App Router project.
- **`/nextjs-best-practices`** — Use for Server Components, data fetching patterns, and routing decisions.
- **`/react-best-practices`** — Use when writing or modifying any React component for performance patterns.
- **`/composition-patterns`** — Use when building reusable components or refactoring component APIs.
- **`/clean-code`** — Use when writing or reviewing any code for readability and maintainability.
- **`/database-design`** — Use when modifying Prisma schema, writing queries, or designing data models.
- **`/error-handling-patterns`** — Use when implementing server actions, API routes, or form handling.
- **`/performance-optimizer`** — Use when there are opportunities to optimize queries, rendering, or bundle size.
- **`/accessibility (accesslint-refactor, contrast-checker, link-purpose, use-of-color)`** — Use on all UI work to ensure WCAG compliance.
- **`/simplify`** — Run after completing any feature to review for reuse, quality, and efficiency.
- **`/web-design-guidelines`** — Use when building or reviewing UI pages.
- **`/api-design-principles`** — Use when designing server actions or API routes.

### When to apply skills

- **Building UI:** frontend-design + ui-ux-pro-max + accessibility skills + web-design-guidelines + composition-patterns
- **Building pages/routes:** nextjs-app-router-patterns + nextjs-best-practices + react-best-practices
- **Data layer work:** database-design + error-handling-patterns + clean-code
- **Server actions/APIs:** api-design-principles + error-handling-patterns + nextjs-best-practices
- **After completing any task:** simplify + performance-optimizer

## Environment Variables

Required in `.env.local`:
- `DATABASE_URL`, `DIRECT_URL` — Neon Postgres connection strings
- `AUTH_SECRET` — NextAuth secret (generate with `openssl rand -base64 32`)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` — SMTP server for transactional email
- `SMTP_SECURE` — Set to `"true"` for TLS (port 465)
- `EMAIL_FROM` — Sender address (e.g. `"RailOps <noreply@railops.app>"`)
- `NEXT_PUBLIC_APP_URL` — Base URL (e.g. `http://localhost:3000`)
