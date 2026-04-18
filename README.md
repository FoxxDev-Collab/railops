<p align="center">
  <img src="public/railroadops-logo.png" alt="Railroad Ops" width="160" />
</p>

<h1 align="center">Railroad Ops</h1>

<p align="center">
  <strong>Cloud-native operations platform for model railroaders.</strong>
</p>

<p align="center">
  Replace the spreadsheet, the binder of car cards, and the printout of train symbols
  with one tool for layouts, rolling stock, waybills, and operating sessions.
</p>

<p align="center">
  <a href="https://railroadops.com">railroadops.com</a>
  &middot;
  <a href="https://railroadops.com/pricing">Pricing</a>
  &middot;
  <a href="https://railroadops.com/features">Features</a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-BSL%201.1-blue" alt="License: BSL 1.1" /></a>
  <img src="https://img.shields.io/badge/Next.js-16-black" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/TypeScript-strict-3178c6" alt="TypeScript strict" />
</p>

---

## What it does

Railroad Ops is a web app for model railroad operations. It gives hobbyists and clubs a
single place to model their layout, manage rolling stock, generate prototypical paperwork,
and run operating sessions — without maintaining spreadsheets and manila folders.

The app is designed around how real railroads actually work: locations contain industries,
industries ship commodities, freight cars get routed on four-panel waybills, and trains
pick up and set out cars based on switch lists generated for each session. Everything is
tied together so that a crew running a session can see, in order, every move they need to
make.

## Features

### Layout and infrastructure
- Multiple layouts per account — model every railroad you own
- Locations typed as passenger stations, yards, interchanges, junctions, staging, team
  tracks, or sidings
- Industries attached to locations, with shipping and receiving commodities
- Yard tracks (arrival, classification, departure, RIP, engine service, etc.) with
  per-track capacity

### Rolling stock
- Locomotives with DCC address, decoder, horsepower, and service type
- Freight cars with AAR type codes, reporting marks, and commodity lists
- Passenger cars, MOW equipment, and cabooses — each a first-class citizen
- Bad order tracking and maintenance tasks tied to specific pieces of equipment
- Silhouette icons for consistent visual representation across the UI

### Waybills and car cards
- Four-panel waybill system with loaded/empty cycles
- Car cards linking a physical car to its current waybill and location
- Shipper and consignee industries resolve to real locations in your layout

### Trains and consists
- Train definitions with class, service type, origin, destination, and ordered stops
- Session consists composed of locomotives, rolling stock, and cabooses in any order
- Printable switch lists generated per consist per session

### Operating sessions
- Create, start, and complete sessions with timestamps
- Assign trains to sessions
- Auto-generated switch lists per train for crew to run during the session

### Crew management
- Invite crew by email or shareable link
- Custom roles with per-section view/edit permissions
- Seat-based billing: 1 crew seat included with Pro, additional seats $5/mo each (up to 10 total)

### Account and billing
- Free tier: 1 layout, 50 total items, no crew
- Pro tier: $5/mo, 5 layouts, unlimited items, 1 included crew seat
- Stripe Checkout and Customer Portal integration
- MFA (TOTP) for account security
- Email verification and password reset flows

### Admin capabilities
- User management with plan and role controls
- Live Stripe visibility: subscriptions, webhook events, revenue by line item,
  products/prices, per-user deep-dives
- Audit log for privileged actions
- System health and error logging

## Tech stack

- **Framework:** Next.js 16 (App Router), TypeScript
- **UI:** Tailwind CSS v4, shadcn/ui (Radix primitives)
- **Database:** Neon Postgres with Prisma 6
- **Auth:** NextAuth.js v5 (credentials provider, JWT, MFA)
- **Payments:** Stripe (Checkout, Customer Portal, webhooks)
- **Email:** SMTP via nodemailer
- **Hosting:** Vercel

## Local development

Clone the repo and install dependencies:

```bash
npm install
```

Copy `.env.example` to `.env.local` and fill in the required variables:

- `DATABASE_URL`, `DIRECT_URL` — Neon Postgres connection strings
- `AUTH_SECRET` — generate with `openssl rand -base64 32`
- `SMTP_*` and `EMAIL_FROM` — transactional email
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`, `STRIPE_SEAT_PRICE_ID`
- `NEXT_PUBLIC_APP_URL`

Run the initial migration and start the dev server:

```bash
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For local Stripe webhook testing:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npx prisma generate` | Regenerate Prisma client after schema changes |
| `npx prisma migrate dev` | Create and apply migrations (dev) |
| `npx prisma migrate deploy` | Apply pending migrations (production) |
| `npx prisma studio` | Visual database browser |
| `npx tsx scripts/create-admin.ts` | Create an admin user |

## License

Railroad Ops is source-available under the [Business Source License 1.1](LICENSE).

- Non-production use, local development, and evaluation are permitted.
- Running a competing model-railroad-ops service is **not** permitted.
- The license auto-converts to Mozilla Public License 2.0 on **2030-04-18**.

For commercial licensing inquiries, email **support@railroadops.com**.

## Contributing

This is a proprietary, source-available project. We do not currently accept external
pull requests. If you've found a bug or have a feature request, please open an issue.

---

<p align="center">
  Built by <a href="https://github.com/FoxxDev-Collab">Jeremiah Price</a> · (c) 2026
</p>
