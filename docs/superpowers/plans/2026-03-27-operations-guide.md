# Operations Guide & Contextual Help — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add schema FKs for waybill-to-train traceability, an in-app operations guide page with visual workflow stepper, and dismissible contextual hints on all collection pages.

**Architecture:** Prisma schema gets two new optional FKs (carCardId on ConsistPosition and SwitchListEntry). A new guide page at `/dashboard/railroad/[id]/guide` renders a workflow stepper and detail sections. A reusable `<OperationsHint>` client component provides dismissible banners on 12 pages, persisted via localStorage.

**Tech Stack:** Next.js App Router (Server Components for guide page, Client Component for hint), Prisma, Tailwind CSS, shadcn/ui, lucide-react icons.

**Spec:** `docs/superpowers/specs/2026-03-27-operations-guide-design.md`

---

### Task 1: Schema — Add carCardId FKs

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add carCardId to ConsistPosition**

In `prisma/schema.prisma`, inside the `ConsistPosition` model, add after the `caboose` relation:

```prisma
  carCardId      String?
  carCard        CarCard?      @relation("ConsistCarCard", fields: [carCardId], references: [id], onDelete: SetNull)
```

- [ ] **Step 2: Add carCardId to SwitchListEntry**

In `prisma/schema.prisma`, inside the `SwitchListEntry` model, add after the `trainStop` relation:

```prisma
  carCardId      String?
  carCard        CarCard?      @relation("SwitchListCarCard", fields: [carCardId], references: [id], onDelete: SetNull)
```

- [ ] **Step 3: Add reverse relations to CarCard**

In `prisma/schema.prisma`, inside the `CarCard` model, add before the closing `}`:

```prisma
  consistPositions  ConsistPosition[] @relation("ConsistCarCard")
  switchListEntries SwitchListEntry[] @relation("SwitchListCarCard")
```

- [ ] **Step 4: Push schema changes**

Run: `npx prisma db push`
Expected: Schema synced, no errors.

- [ ] **Step 5: Regenerate Prisma client**

Run: `npx prisma generate`
Expected: Client generated successfully.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add carCardId FK to ConsistPosition and SwitchListEntry"
```

---

### Task 2: Server Actions — Wire carCardId into consists and switch lists

**Files:**
- Modify: `app/actions/consists.ts`
- Modify: `app/actions/switch-lists.ts`

- [ ] **Step 1: Update addPosition to set carCardId for freight cars**

In `app/actions/consists.ts`, inside the `addPosition` function, after the switch statement that builds `fkData` (after the `default: return { error: "Invalid rolling stock type" };` line and before the `await db.consistPosition.create` call), add a car card lookup for freight cars:

```typescript
  // Look up car card for freight cars
  let carCardId: string | undefined;
  if (data.type === "FREIGHT_CAR") {
    const carCard = await db.carCard.findUnique({
      where: { freightCarId: data.rollingStockId },
    });
    if (carCard) carCardId = carCard.id;
  }
```

Then update the `db.consistPosition.create` call to include `carCardId`:

```typescript
  await db.consistPosition.create({
    data: {
      consistId,
      position: nextPosition,
      facing: data.facing ?? "F",
      ...fkData,
      ...(carCardId ? { carCardId } : {}),
    },
  });
```

- [ ] **Step 2: Update generateSwitchList to set carCardId on entries**

In `app/actions/switch-lists.ts`, update the `entries` type to include `carCardId`:

Change the entries type definition (around line 72) to add carCardId:

```typescript
  const entries: {
    action: string;
    carDescription: string;
    commodity: string | null;
    destinationDesc: string | null;
    trackAssignment: string | null;
    sortOrder: number;
    trainStopId: string | null;
    carCardId: string | null;
  }[] = [];
```

Then in the per-stop loop (inside `if (stops.length > 0)`), add `carCardId: carCard.id` to both the SETOUT and PICKUP entry pushes. The SETOUT push (around line 104) becomes:

```typescript
          entries.push({
            action: "SETOUT",
            carDescription,
            commodity: activePanel.commodity ?? null,
            destinationDesc: stop.location.name,
            trackAssignment: activePanel.consigneeIndustry?.name ?? null,
            sortOrder: sortOrder++,
            trainStopId: stop.id,
            carCardId: carCard.id,
          });
```

The PICKUP push (around line 113) becomes:

```typescript
          entries.push({
            action: "PICKUP",
            carDescription,
            commodity: activePanel.commodity ?? null,
            destinationDesc: activePanel.destination?.name ?? null,
            trackAssignment: activePanel.consigneeIndustry?.name ?? null,
            sortOrder: sortOrder++,
            trainStopId: stop.id,
            carCardId: carCard.id,
          });
```

And the no-stops fallback SETOUT push (around line 144) becomes:

```typescript
      entries.push({
        action: "SETOUT",
        carDescription,
        commodity: activePanel.commodity ?? null,
        destinationDesc: activePanel.destination?.name ?? null,
        trackAssignment: activePanel.consigneeIndustry?.name ?? null,
        sortOrder: sortOrder++,
        trainStopId: null,
        carCardId: carCard.id,
      });
```

- [ ] **Step 3: Verify build compiles**

Run: `npm run build`
Expected: Build succeeds (or `npm run lint` passes at minimum).

- [ ] **Step 4: Commit**

```bash
git add app/actions/consists.ts app/actions/switch-lists.ts
git commit -m "feat: wire carCardId into consist positions and switch list entries"
```

---

### Task 3: OperationsHint Client Component

**Files:**
- Create: `components/operations/operations-hint.tsx`

- [ ] **Step 1: Create the OperationsHint component**

Create `components/operations/operations-hint.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { Info, X } from "lucide-react";
import Link from "next/link";

interface OperationsHintProps {
  pageKey: string;
  title: string;
  children: React.ReactNode;
  guideSection?: string;
  railroadId: string;
}

export function OperationsHint({
  pageKey,
  title,
  children,
  guideSection,
  railroadId,
}: OperationsHintProps) {
  const storageKey = `hint-dismissed-${pageKey}`;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(storageKey);
    if (!dismissed) setVisible(true);
  }, [storageKey]);

  function dismiss() {
    localStorage.setItem(storageKey, "true");
    setVisible(false);
  }

  if (!visible) return null;

  const guideHref = `/dashboard/railroad/${railroadId}/guide${guideSection ?? ""}`;

  return (
    <div className="relative flex items-start gap-3 rounded-lg border-l-4 border-blue-500/60 bg-blue-50/50 dark:bg-blue-950/20 px-4 py-3">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
          {title}
        </p>
        <div className="mt-0.5 text-sm text-blue-800/80 dark:text-blue-300/80">
          {children}
        </div>
        <Link
          href={guideHref}
          className="mt-1.5 inline-block text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 underline-offset-2 hover:underline"
        >
          Learn more in the Operations Guide
        </Link>
      </div>
      <button
        onClick={dismiss}
        className="shrink-0 rounded p-0.5 text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-300 transition-colors"
        aria-label={`Dismiss ${title} hint`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/operations/operations-hint.tsx
git commit -m "feat: add OperationsHint dismissible banner component"
```

---

### Task 4: Workflow Stepper Component

**Files:**
- Create: `components/operations/workflow-stepper.tsx`

- [ ] **Step 1: Create the WorkflowStepper component**

Create `components/operations/workflow-stepper.tsx`:

```tsx
import {
  MapPin,
  Factory,
  Train,
  FileText,
  Route,
  Link as LinkIcon,
  ClipboardList,
} from "lucide-react";

const steps = [
  {
    number: 1,
    title: "Locations",
    subtitle: "Where things happen",
    icon: MapPin,
    anchor: "#locations",
  },
  {
    number: 2,
    title: "Industries",
    subtitle: "Who ships & receives",
    icon: Factory,
    anchor: "#industries",
  },
  {
    number: 3,
    title: "Rolling Stock",
    subtitle: "Your fleet",
    icon: Train,
    anchor: "#rolling-stock",
  },
  {
    number: 4,
    title: "Waybills",
    subtitle: "Shipping orders",
    icon: FileText,
    anchor: "#waybills",
  },
  {
    number: 5,
    title: "Trains",
    subtitle: "Routes & schedules",
    icon: Route,
    anchor: "#trains",
  },
  {
    number: 6,
    title: "Consists",
    subtitle: "Build your train",
    icon: LinkIcon,
    anchor: "#consists",
  },
  {
    number: 7,
    title: "Switch Lists",
    subtitle: "Crew instructions",
    icon: ClipboardList,
    anchor: "#switch-lists",
  },
];

export function WorkflowStepper() {
  return (
    <div className="w-full">
      {/* Desktop: horizontal */}
      <div className="hidden md:flex items-start justify-between gap-1">
        {steps.map((step, i) => (
          <div key={step.number} className="flex items-start flex-1">
            <a
              href={step.anchor}
              className="group flex flex-col items-center text-center w-full"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/10 text-primary group-hover:border-primary group-hover:bg-primary/20 transition-colors">
                <step.icon className="h-4.5 w-4.5" />
              </div>
              <p className="mt-2 text-xs font-semibold leading-tight">
                {step.title}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-tight">
                {step.subtitle}
              </p>
            </a>
            {i < steps.length - 1 && (
              <div className="mt-5 h-px flex-1 min-w-3 bg-border" />
            )}
          </div>
        ))}
      </div>

      {/* Mobile: vertical */}
      <div className="flex flex-col gap-0 md:hidden">
        {steps.map((step, i) => (
          <div key={step.number} className="flex items-stretch gap-3">
            <div className="flex flex-col items-center">
              <a
                href={step.anchor}
                className="group flex h-9 w-9 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/10 text-primary hover:border-primary hover:bg-primary/20 transition-colors"
              >
                <step.icon className="h-4 w-4" />
              </a>
              {i < steps.length - 1 && (
                <div className="w-px flex-1 bg-border my-1" />
              )}
            </div>
            <a href={step.anchor} className="pb-4">
              <p className="text-sm font-semibold leading-tight">
                {step.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {step.subtitle}
              </p>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/operations/workflow-stepper.tsx
git commit -m "feat: add WorkflowStepper component for operations guide"
```

---

### Task 5: Guide Page

**Files:**
- Create: `app/(dashboard)/dashboard/railroad/[id]/guide/page.tsx`

- [ ] **Step 1: Create the guide page**

Create `app/(dashboard)/dashboard/railroad/[id]/guide/page.tsx`:

```tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayout } from "@/app/actions/layouts";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Factory,
  Train,
  FileText,
  Route,
  Link as LinkIcon,
  ClipboardList,
  PlayCircle,
  AlertCircle,
} from "lucide-react";
import { WorkflowStepper } from "@/components/operations/workflow-stepper";

export default async function OperationsGuidePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id } = await params;
  const layout = await getLayout(id);

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/railroad/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            How Operations Work
          </h1>
          <p className="text-sm text-muted-foreground tracking-wide">
            A step-by-step guide to running {layout.name}
          </p>
        </div>
      </div>

      {/* Workflow Stepper */}
      <div className="rounded-lg border bg-card p-6">
        <WorkflowStepper />
      </div>

      {/* Suggested Order Callout */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            Set up your railroad in this order.
          </p>
          <p className="mt-0.5 text-sm text-amber-800/80 dark:text-amber-300/70">
            Each step builds on the previous one — you need locations before
            industries, rolling stock before waybills, and trains before you can
            build consists and generate switch lists.
          </p>
        </div>
      </div>

      <Separator />

      {/* Step 1: Locations */}
      <section id="locations" className="scroll-mt-8 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MapPin className="h-4 w-4" />
          </div>
          <h2 className="text-xl font-semibold">
            1. Locations{" "}
            <span className="font-normal text-muted-foreground">
              — the places on your railroad
            </span>
          </h2>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground pl-11">
          <p>
            Locations are the named places on your railroad — yards, stations,
            sidings, junctions, and interchanges. Every other element in the
            system references locations: industries are <em>at</em> locations,
            rolling stock is <em>at</em> a location, and trains travel{" "}
            <em>between</em> locations.
          </p>
          <p className="font-medium text-foreground">
            Start here. Create your yards, towns, and interchange points before
            anything else.
          </p>
        </div>
        <div className="pl-11">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/railroad/${id}/locations`}>
              Go to Locations &rarr;
            </Link>
          </Button>
        </div>
      </section>

      <Separator />

      {/* Step 2: Industries */}
      <section id="industries" className="scroll-mt-8 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Factory className="h-4 w-4" />
          </div>
          <h2 className="text-xl font-semibold">
            2. Industries{" "}
            <span className="font-normal text-muted-foreground">
              — businesses that ship and receive goods
            </span>
          </h2>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground pl-11">
          <p>
            Industries are the businesses at your locations that ship and receive
            goods — a coal mine, a freight house, a lumber yard. Each industry
            lists the commodities it ships out and receives in.
          </p>
          <p>
            <strong className="text-foreground">Connects to:</strong> Industries
            exist at Locations. Waybills reference industries as shippers and
            consignees (receivers).
          </p>
        </div>
        <div className="pl-11">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/railroad/${id}/locations`}>
              Go to Locations (Industries are managed within each location) &rarr;
            </Link>
          </Button>
        </div>
      </section>

      <Separator />

      {/* Step 3: Rolling Stock */}
      <section id="rolling-stock" className="scroll-mt-8 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Train className="h-4 w-4" />
          </div>
          <h2 className="text-xl font-semibold">
            3. Rolling Stock{" "}
            <span className="font-normal text-muted-foreground">
              — your locomotives, cars, and equipment
            </span>
          </h2>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground pl-11">
          <p>
            Rolling stock is everything that rides the rails — locomotives (your
            motive power), freight cars (boxcars, hoppers, gondolas, tank cars),
            passenger cars, cabooses, and maintenance-of-way equipment. Each
            piece of rolling stock has a current location on your railroad.
          </p>
          <p>
            <strong className="text-foreground">Connects to:</strong> Rolling
            stock sits at Locations. Freight cars get paired with Waybills to
            receive shipping orders.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 pl-11">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/railroad/${id}/locomotives`}>
              Locomotives
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/railroad/${id}/rolling-stock`}>
              Freight Cars
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/railroad/${id}/passenger-cars`}>
              Passenger Cars
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/railroad/${id}/cabooses`}>
              Cabooses
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/railroad/${id}/mow-equipment`}>
              MOW Equipment
            </Link>
          </Button>
        </div>
      </section>

      <Separator />

      {/* Step 4: Waybills */}
      <section id="waybills" className="scroll-mt-8 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </div>
          <h2 className="text-xl font-semibold">
            4. Waybills{" "}
            <span className="font-normal text-muted-foreground">
              — shipping orders that move cars
            </span>
          </h2>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground pl-11">
          <p>
            A waybill is a shipping order — it says &ldquo;take this type of car
            from Industry A to Industry B, carrying commodity C.&rdquo; RailOps
            uses a <strong className="text-foreground">4-panel waybill system</strong>:
            each panel represents one leg of a car&apos;s journey (loaded move,
            empty return, or a different load). The waybill&apos;s current panel
            determines where the car needs to go right now.
          </p>
          <p>
            When you create a waybill, you can link it to a specific freight car
            through a <strong className="text-foreground">car card</strong> (a
            pairing of one freight car to one waybill). The car card tracks where
            that car currently sits on your railroad.
          </p>
          <p>
            <strong className="text-foreground">Connects to:</strong> Waybills
            reference Industries (shipper/consignee) and Locations
            (origin/destination). They drive the switch list logic that tells
            train crews what to do.
          </p>
        </div>
        <div className="pl-11">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/railroad/${id}/waybills`}>
              Go to Waybills &rarr;
            </Link>
          </Button>
        </div>
      </section>

      <Separator />

      {/* Step 5: Trains */}
      <section id="trains" className="scroll-mt-8 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Route className="h-4 w-4" />
          </div>
          <h2 className="text-xl font-semibold">
            5. Trains{" "}
            <span className="font-normal text-muted-foreground">
              — routes and schedules across your railroad
            </span>
          </h2>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground pl-11">
          <p>
            A train is a named service that runs between an origin and
            destination, with stops along the way — like &ldquo;Train 101,
            Grafton Yard to Elkins, stopping at Spruce Knob Mine.&rdquo; Each
            train has a class (manifest, local, unit, passenger) and a service
            type.
          </p>
          <p>
            <strong className="text-foreground">Connects to:</strong> Trains
            reference Locations for their origin, destination, and stops.
          </p>
        </div>
        <div className="pl-11">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/railroad/${id}/trains`}>
              Go to Trains &rarr;
            </Link>
          </Button>
        </div>
      </section>

      <Separator />

      {/* Step 6: Consists */}
      <section id="consists" className="scroll-mt-8 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LinkIcon className="h-4 w-4" />
          </div>
          <h2 className="text-xl font-semibold">
            6. Consists{" "}
            <span className="font-normal text-muted-foreground">
              — build your train for a run
            </span>
          </h2>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground pl-11">
          <p>
            A consist (pronounced &ldquo;CON-sist&rdquo;) is the actual makeup
            of a train for a specific run — which locomotives are pulling, which
            cars are in the train, and in what order. You build a consist by
            adding rolling stock from the locations along the train&apos;s route.
          </p>
          <p>
            When you add a freight car that has an active car card, the system
            knows that car has a waybill directing it somewhere. This is what
            drives the switch list.
          </p>
          <p>
            <strong className="text-foreground">Connects to:</strong> Consists
            are built from Rolling Stock and belong to a Train. They feed into
            Switch Lists.
          </p>
        </div>
        <div className="pl-11">
          <p className="text-xs text-muted-foreground italic">
            Build consists from any train&apos;s detail page.
          </p>
        </div>
      </section>

      <Separator />

      {/* Step 7: Switch Lists */}
      <section id="switch-lists" className="scroll-mt-8 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ClipboardList className="h-4 w-4" />
          </div>
          <h2 className="text-xl font-semibold">
            7. Switch Lists{" "}
            <span className="font-normal text-muted-foreground">
              — crew instructions for pickups and setouts
            </span>
          </h2>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground pl-11">
          <p>
            A switch list is the crew&apos;s work order — it tells the conductor
            which cars to <strong className="text-foreground">pick up</strong>{" "}
            and <strong className="text-foreground">set out</strong> at each stop
            along the train&apos;s route. RailOps generates switch lists
            automatically by looking at each freight car in the consist, reading
            its waybill, and matching the waybill&apos;s origin/destination
            against the train&apos;s stops.
          </p>
          <p>
            If a car&apos;s waybill says &ldquo;deliver to Elkins&rdquo; and the
            train stops at Elkins, the switch list says &ldquo;SETOUT at
            Elkins.&rdquo; If a car is sitting at Spruce Knob Mine and its
            waybill says it originates there, the switch list says &ldquo;PICKUP
            at Spruce Knob Mine.&rdquo;
          </p>
          <p>
            <strong className="text-foreground">Connects to:</strong> Switch
            lists are generated from a Consist + its Train&apos;s stops + the
            Waybills on each car.
          </p>
        </div>
        <div className="pl-11">
          <p className="text-xs text-muted-foreground italic">
            Generate switch lists from any train&apos;s detail page after
            building a consist.
          </p>
        </div>
      </section>

      <Separator />

      {/* Bonus: Operating Sessions */}
      <section id="sessions" className="scroll-mt-8 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <PlayCircle className="h-4 w-4" />
          </div>
          <h2 className="text-xl font-semibold">
            Operating Sessions{" "}
            <span className="font-normal text-muted-foreground">
              — tie it all together
            </span>
          </h2>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground pl-11">
          <p>
            An operating session ties it all together — it&apos;s a scheduled run
            of your railroad where one or more trains operate. Assign trains to a
            session, build their consists, generate switch lists, and run your
            railroad.
          </p>
        </div>
        <div className="pl-11">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/railroad/${id}/sessions`}>
              Go to Sessions &rarr;
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(dashboard)/dashboard/railroad/[id]/guide/page.tsx"
git commit -m "feat: add Operations Guide page with workflow stepper and detail sections"
```

---

### Task 6: Sidebar — Add Operations Guide link

**Files:**
- Modify: `components/layout/app-sidebar.tsx`

- [ ] **Step 1: Add BookOpen import**

In `components/layout/app-sidebar.tsx`, add `BookOpen` to the lucide-react import:

```typescript
import {
  LayoutDashboard,
  MapPin,
  Train,
  TrainFront,
  Route,
  FileText,
  PlayCircle,
  Settings,
  LogOut,
  Users,
  ArrowLeftRight,
  Armchair,
  Container,
  Wrench,
  ShieldCheck,
  CreditCard,
  BookOpen,
} from "lucide-react";
```

- [ ] **Step 2: Add guide entry to getRailroadMenuItems**

In the `getRailroadMenuItems` function, add the guide entry after the Sessions entry and before the Settings entry:

```typescript
    {
      href: `/dashboard/railroad/${railroadId}/guide`,
      label: "Operations Guide",
      icon: BookOpen,
    },
```

So the last three entries in the array are: Sessions, Operations Guide, Settings.

- [ ] **Step 3: Commit**

```bash
git add components/layout/app-sidebar.tsx
git commit -m "feat: add Operations Guide link to sidebar navigation"
```

---

### Task 7: Add OperationsHint to Locations page

**Files:**
- Modify: `app/(dashboard)/dashboard/railroad/[id]/locations/page.tsx`

- [ ] **Step 1: Add import and hint**

Add the import at the top of the file:

```typescript
import { OperationsHint } from "@/components/operations/operations-hint";
```

Then insert the hint immediately after the closing `</div>` of the header (after line 45, before the empty state / CollectionView conditional):

```tsx
      <OperationsHint
        pageKey="hint-locations"
        title="Locations are the foundation"
        railroadId={id}
        guideSection="#locations"
      >
        Locations are the foundation of your railroad. Create your yards,
        stations, and sidings first — everything else references them.
      </OperationsHint>
```

- [ ] **Step 2: Commit**

```bash
git add "app/(dashboard)/dashboard/railroad/[id]/locations/page.tsx"
git commit -m "feat: add operations hint to locations page"
```

---

### Task 8: Add OperationsHint to all remaining collection pages

**Files:**
- Modify: `app/(dashboard)/dashboard/railroad/[id]/locomotives/page.tsx`
- Modify: `app/(dashboard)/dashboard/railroad/[id]/rolling-stock/page.tsx`
- Modify: `app/(dashboard)/dashboard/railroad/[id]/passenger-cars/page.tsx`
- Modify: `app/(dashboard)/dashboard/railroad/[id]/cabooses/page.tsx`
- Modify: `app/(dashboard)/dashboard/railroad/[id]/mow-equipment/page.tsx`
- Modify: `app/(dashboard)/dashboard/railroad/[id]/waybills/page.tsx`
- Modify: `app/(dashboard)/dashboard/railroad/[id]/trains/page.tsx`
- Modify: `app/(dashboard)/dashboard/railroad/[id]/sessions/page.tsx`

For each file, follow the same pattern as Task 7: add the `OperationsHint` import and insert the component after the header div, before the content.

- [ ] **Step 1: Locomotives page**

Import: `import { OperationsHint } from "@/components/operations/operations-hint";`

Hint (after header, before content):
```tsx
      <OperationsHint
        pageKey="hint-locomotives"
        title="Motive power for your trains"
        railroadId={id}
        guideSection="#rolling-stock"
      >
        Locomotives provide motive power for your trains. Add them to a consist
        when you&apos;re ready to build a train.
      </OperationsHint>
```

- [ ] **Step 2: Freight Cars (rolling-stock) page**

Import: `import { OperationsHint } from "@/components/operations/operations-hint";`

Hint:
```tsx
      <OperationsHint
        pageKey="hint-freight-cars"
        title="Cars that carry goods"
        railroadId={id}
        guideSection="#rolling-stock"
      >
        Freight cars carry goods across your railroad. Pair them with waybills to
        give them shipping orders.
      </OperationsHint>
```

- [ ] **Step 3: Passenger Cars page**

Import: `import { OperationsHint } from "@/components/operations/operations-hint";`

Hint:
```tsx
      <OperationsHint
        pageKey="hint-passenger-cars"
        title="Carry your passengers"
        railroadId={id}
        guideSection="#rolling-stock"
      >
        Passenger cars are added to consists for passenger and mixed trains.
      </OperationsHint>
```

- [ ] **Step 4: Cabooses page**

Import: `import { OperationsHint } from "@/components/operations/operations-hint";`

Hint:
```tsx
      <OperationsHint
        pageKey="hint-cabooses"
        title="End of train"
        railroadId={id}
        guideSection="#rolling-stock"
      >
        Cabooses ride at the end of freight trains. Add them to a consist to
        complete your train.
      </OperationsHint>
```

- [ ] **Step 5: MOW Equipment page**

Import: `import { OperationsHint } from "@/components/operations/operations-hint";`

Hint:
```tsx
      <OperationsHint
        pageKey="hint-mow"
        title="Maintain your railroad"
        railroadId={id}
        guideSection="#rolling-stock"
      >
        Maintenance-of-way equipment supports your railroad&apos;s
        infrastructure. Assign to work trains as needed.
      </OperationsHint>
```

- [ ] **Step 6: Waybills page**

Import: `import { OperationsHint } from "@/components/operations/operations-hint";`

Hint:
```tsx
      <OperationsHint
        pageKey="hint-waybills"
        title="Shipping orders for your cars"
        railroadId={id}
        guideSection="#waybills"
      >
        Waybills are shipping orders — they tell the system where each car needs
        to go. The switch list is generated from these.
      </OperationsHint>
```

- [ ] **Step 7: Trains page**

Import: `import { OperationsHint } from "@/components/operations/operations-hint";`

Hint:
```tsx
      <OperationsHint
        pageKey="hint-trains"
        title="Define your routes"
        railroadId={id}
        guideSection="#trains"
      >
        Trains define routes across your railroad. Add stops, then build a
        consist and generate a switch list.
      </OperationsHint>
```

- [ ] **Step 8: Sessions page**

Import: `import { OperationsHint } from "@/components/operations/operations-hint";`

Hint:
```tsx
      <OperationsHint
        pageKey="hint-sessions"
        title="Run your railroad"
        railroadId={id}
        guideSection="#sessions"
      >
        Operating sessions tie everything together — assign trains, run your
        railroad, and track progress.
      </OperationsHint>
```

- [ ] **Step 9: Commit all remaining hint additions**

```bash
git add "app/(dashboard)/dashboard/railroad/[id]/locomotives/page.tsx" \
       "app/(dashboard)/dashboard/railroad/[id]/rolling-stock/page.tsx" \
       "app/(dashboard)/dashboard/railroad/[id]/passenger-cars/page.tsx" \
       "app/(dashboard)/dashboard/railroad/[id]/cabooses/page.tsx" \
       "app/(dashboard)/dashboard/railroad/[id]/mow-equipment/page.tsx" \
       "app/(dashboard)/dashboard/railroad/[id]/waybills/page.tsx" \
       "app/(dashboard)/dashboard/railroad/[id]/trains/page.tsx" \
       "app/(dashboard)/dashboard/railroad/[id]/sessions/page.tsx"
git commit -m "feat: add operations hints to all collection pages"
```

---

### Task 9: Add OperationsHint to train detail and switch list pages

**Files:**
- Modify: `app/(dashboard)/dashboard/railroad/[id]/trains/[trainId]/page.tsx`
- Modify: `app/(dashboard)/dashboard/railroad/[id]/trains/[trainId]/switch-list/page.tsx`

- [ ] **Step 1: Train detail page (consist hint)**

Import: `import { OperationsHint } from "@/components/operations/operations-hint";`

Insert the hint before the consist/TrainBuilder section (after the info row Separator, before the consist heading):

```tsx
      <OperationsHint
        pageKey="hint-consists"
        title="Build your consist"
        railroadId={id}
        guideSection="#consists"
      >
        Build your consist by adding rolling stock. Cars with active waybills
        will appear on the switch list.
      </OperationsHint>
```

- [ ] **Step 2: Switch list page**

Import: `import { OperationsHint } from "@/components/operations/operations-hint";`

Insert after the header, before the switch list content:

```tsx
      <OperationsHint
        pageKey="hint-switch-lists"
        title="Your crew's work order"
        railroadId={id}
        guideSection="#switch-lists"
      >
        Switch lists are auto-generated from your consist and waybills. Each
        entry is a pickup or setout at a train stop.
      </OperationsHint>
```

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/dashboard/railroad/[id]/trains/[trainId]/page.tsx" \
       "app/(dashboard)/dashboard/railroad/[id]/trains/[trainId]/switch-list/page.tsx"
git commit -m "feat: add operations hints to train detail and switch list pages"
```

---

### Task 10: Build verification

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Fix any issues found and commit**

If there are lint or build errors, fix them and commit the fixes.
