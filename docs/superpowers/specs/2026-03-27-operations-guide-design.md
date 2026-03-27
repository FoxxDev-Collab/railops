# Operations Guide & Contextual Help — Design Spec

## Overview

Add an in-app "Operations Guide" that teaches users the model railroad operations workflow, plus contextual hints on each page. Also add two schema FKs for waybill-to-train traceability.

The goal: a user who has never used a car card/waybill system should be able to open the guide, understand the full workflow, and set up their railroad in the correct order.

## 1. Schema Changes

### New Foreign Keys

**`ConsistPosition.carCardId`** (optional FK → `CarCard`)
- Links a consist position to the car card that motivated placing this car on the train.
- Set when adding a freight car to a consist (lookup its car card if one exists).
- Informational — does not change consist logic.

**`SwitchListEntry.carCardId`** (optional FK → `CarCard`)
- Links each PICKUP/SETOUT entry back to the car card that drove the action.
- Set during `generateSwitchList()` since the car card is already fetched there.
- Enables future features like "click entry to see full waybill."

Both are nullable. No breaking changes to existing data.

### Prisma Schema Additions

```prisma
// In ConsistPosition:
carCardId      String?
carCard        CarCard?      @relation("ConsistCarCard", fields: [carCardId], references: [id], onDelete: SetNull)

// In SwitchListEntry:
carCardId      String?
carCard        CarCard?      @relation("SwitchListCarCard", fields: [carCardId], references: [id], onDelete: SetNull)

// In CarCard, add reverse relations:
consistPositions  ConsistPosition[] @relation("ConsistCarCard")
switchListEntries SwitchListEntry[] @relation("SwitchListCarCard")
```

### Server Action Changes

**`app/actions/consists.ts` → `addPosition()`:**
When adding a freight car, look up its `CarCard` and store the `carCardId` on the `ConsistPosition`.

**`app/actions/switch-lists.ts` → `generateSwitchList()`:**
The car card is already fetched in the generation loop. Pass `carCardId` into each `SwitchListEntry` create.

## 2. Guide Page

### Route

`/app/(dashboard)/dashboard/railroad/[id]/guide/page.tsx`

Server component. Fetches the layout to confirm ownership, then renders the guide content.

### Sidebar Entry

Add "Operations Guide" to the sidebar navigation with a `BookOpen` (or `Compass`) lucide icon. Place it in a "Help" or "Reference" group at the bottom of the nav, or after the main resource links.

### Page Structure

#### Visual Workflow Stepper (top)

A horizontal (desktop) / vertical (mobile) step indicator showing the 7-step operations workflow. Each step displays:

- Step number (1–7)
- Icon (lucide)
- Title (railroad term)
- Subtitle (plain English)
- Clickable — scrolls to the corresponding detail section below

Steps:

| # | Title | Subtitle | Icon |
|---|-------|----------|------|
| 1 | Locations | Where things happen on your railroad | `MapPin` |
| 2 | Industries | Businesses that ship and receive goods | `Factory` |
| 3 | Rolling Stock | Your locomotives, cars, and equipment | `Train` |
| 4 | Waybills | Shipping orders that move cars | `FileText` |
| 5 | Trains | Routes and schedules across your railroad | `Route` |
| 6 | Consists | Build your train for a session | `Link` |
| 7 | Switch Lists | Crew instructions for pickups and setouts | `ClipboardList` |

Visual treatment: connected steps (line or arrow between them) to reinforce the linear dependency. Active/completed styling not needed — this is informational, not a progress tracker.

#### "Suggested Order" Callout

Immediately below the stepper, a prominent but non-alarming callout:

> **Set up your railroad in this order.** Each step builds on the previous one — you need locations before industries, rolling stock before waybills, and trains before you can build consists and generate switch lists.

#### Detail Sections

Each of the 7 steps gets a section with:

1. **Heading:** Railroad term + parenthetical plain-English definition
   - e.g., "Waybills (shipping orders that tell you where a car needs to go)"
2. **What it is:** 2–3 sentences explaining the concept in railroad-with-inline-explanation style.
3. **How it connects:** One sentence explaining the dependency — what it needs from the previous step, what it feeds into the next step.
4. **Action link:** A "Go to [X] →" button/link that navigates to the corresponding page in the current railroad.

### Content

#### Step 1: Locations

> Locations are the named places on your railroad — yards, stations, sidings, junctions, and interchanges. Every other element in the system references locations: industries are *at* locations, rolling stock is *at* a location, and trains travel *between* locations.
>
> **Start here.** Create your yards, towns, and interchange points before anything else.

#### Step 2: Industries

> Industries are the businesses at your locations that ship and receive goods — a coal mine, a freight house, a lumber yard. Each industry lists the commodities it ships out and receives in.
>
> **Connects to:** Industries exist at Locations. Waybills reference industries as shippers and consignees.

#### Step 3: Rolling Stock

> Rolling stock is everything that rides the rails — locomotives (your motive power), freight cars (boxcars, hoppers, gondolas, tank cars), passenger cars, cabooses, and maintenance-of-way equipment. Each piece of rolling stock has a current location on your railroad.
>
> **Connects to:** Rolling stock sits at Locations. Freight cars get paired with Waybills to receive shipping orders.

#### Step 4: Waybills

> A waybill is a shipping order — it says "take this type of car from Industry A to Industry B, carrying commodity C." RailOps uses a 4-panel waybill system: each panel represents one leg of a car's journey (loaded move, empty return, or a different load). The waybill's current panel determines where the car needs to go right now.
>
> When you create a waybill, you can link it to a specific freight car through a **car card** (a pairing of one freight car to one waybill). The car card tracks where that car currently sits on your railroad.
>
> **Connects to:** Waybills reference Industries (shipper/consignee) and Locations (origin/destination). They drive the switch list logic that tells train crews what to do.

#### Step 5: Trains

> A train is a named service that runs between an origin and destination, with stops along the way — like "Train 101, Grafton Yard to Elkins, stopping at Spruce Knob Mine." Each train has a class (manifest, local, unit, passenger) and a service type.
>
> **Connects to:** Trains reference Locations for their origin, destination, and stops.

#### Step 6: Consists

> A consist (pronounced "CON-sist") is the actual makeup of a train for a specific run — which locomotives are pulling, which cars are in the train, and in what order. You build a consist by adding rolling stock from the locations along the train's route.
>
> When you add a freight car that has an active car card, the system knows that car has a waybill directing it somewhere. This is what drives the switch list.
>
> **Connects to:** Consists are built from Rolling Stock and belong to a Train. They feed into Switch Lists.

#### Step 7: Switch Lists

> A switch list is the crew's work order — it tells the conductor which cars to **pick up** and **set out** at each stop along the train's route. RailOps generates switch lists automatically by looking at each freight car in the consist, reading its waybill, and matching the waybill's origin/destination against the train's stops.
>
> If a car's waybill says "deliver to Elkins" and the train stops at Elkins, the switch list says "SETOUT at Elkins." If a car is sitting at Spruce Knob Mine and its waybill says it originates there, the switch list says "PICKUP at Spruce Knob Mine."
>
> **Connects to:** Switch lists are generated from a Consist + its Train's stops + the Waybills on each car.

#### Bonus: Operating Sessions

> An operating session ties it all together — it's a scheduled run of your railroad where one or more trains operate. Assign trains to a session, build their consists, generate switch lists, and run your railroad.

## 3. Contextual Hints Component

### Component: `<OperationsHint>`

`components/operations/operations-hint.tsx` — a client component.

**Props:**
- `pageKey: string` — unique key for localStorage persistence (e.g., `"hint-waybills"`)
- `title: string` — brief heading
- `children: React.ReactNode` — the hint text
- `guideSection?: string` — anchor ID to link to in the guide page (e.g., `"#waybills"`)

**Behavior:**
- Renders a styled info banner (subtle background, info icon, dismiss X button)
- On dismiss, stores `hint-dismissed-{pageKey}: true` in localStorage
- On mount, checks localStorage — if dismissed, renders nothing
- Includes a "Learn more" link pointing to `/dashboard/railroad/{id}/guide{guideSection}`

**Styling:**
- Uses a muted/info color scheme consistent with shadcn/ui
- Left border accent (like a blockquote callout)
- Compact — should not dominate the page

### Hint Placements

Each hint is 1–2 sentences max:

| Page | pageKey | Hint Text |
|------|---------|-----------|
| Locations | `hint-locations` | "Locations are the foundation of your railroad. Create your yards, stations, and sidings first — everything else references them." |
| Industries | `hint-industries` | "Industries are the businesses at your locations that ship and receive goods. Waybills will reference these as shippers and consignees." |
| Locomotives | `hint-locomotives` | "Locomotives provide motive power for your trains. Add them to a consist when you're ready to build a train." |
| Freight Cars | `hint-freight-cars` | "Freight cars carry goods across your railroad. Pair them with waybills to give them shipping orders." |
| Passenger Cars | `hint-passenger-cars` | "Passenger cars are added to consists for passenger and mixed trains." |
| Cabooses | `hint-cabooses` | "Cabooses ride at the end of freight trains. Add them to a consist to complete your train." |
| MOW Equipment | `hint-mow` | "Maintenance-of-way equipment supports your railroad's infrastructure. Assign to work trains as needed." |
| Waybills | `hint-waybills` | "Waybills are shipping orders — they tell the system where each car needs to go. The switch list is generated from these." |
| Trains | `hint-trains` | "Trains define routes across your railroad. Add stops, then build a consist and generate a switch list." |
| Train Detail / Consist | `hint-consists` | "Build your consist by adding rolling stock. Cars with active waybills will appear on the switch list." |
| Switch Lists | `hint-switch-lists` | "Switch lists are auto-generated from your consist and waybills. Each entry is a pickup or setout at a train stop." |
| Sessions | `hint-sessions` | "Operating sessions tie everything together — assign trains, run your railroad, and track progress." |

## 4. Files to Create/Modify

### New Files
- `app/(dashboard)/dashboard/railroad/[id]/guide/page.tsx` — Guide page
- `components/operations/operations-hint.tsx` — Dismissible hint component
- `components/operations/workflow-stepper.tsx` — Visual stepper component

### Modified Files
- `prisma/schema.prisma` — Add `carCardId` FK to `ConsistPosition` and `SwitchListEntry`, add reverse relations to `CarCard`
- `app/actions/consists.ts` — Set `carCardId` when adding freight car positions
- `app/actions/switch-lists.ts` — Set `carCardId` on generated entries
- `components/layout/app-sidebar.tsx` — Add "Operations Guide" nav item
- All collection pages (locations, industries, rolling stock types, waybills, trains, sessions) — Add `<OperationsHint>` at top of content

## 5. Non-Goals

- No interactive tutorial or onboarding wizard — just reference documentation and hints
- No changes to the core waybill/consist/switch-list business logic
- No car card dedicated UI page (separate concern)
- No video or animation — static content with good typography and structure
