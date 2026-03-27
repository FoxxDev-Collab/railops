# Crew Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working multi-user crew system with custom roles, per-section permissions, email + link invites, and crew management UI — without real-time collaboration (that's Plan 2).

**Architecture:** Replace the existing `CrewRole` enum with a `Role` model supporting custom roles per railroad. Add `RolePermission` for per-section View/Edit control. Build authorization helpers (`getCrewContext`, `requirePermission`) that guard all server actions. Invite system uses signed JWT tokens for email invites and `InviteLink` records for shareable codes. All crew management happens on dedicated pages (no modals).

**Tech Stack:** Next.js 16 App Router, Prisma, Zod, NextAuth v5, nodemailer, jsonwebtoken, shadcn/ui, Tailwind CSS v4

**Spec:** `docs/superpowers/specs/2026-03-27-multi-user-collaboration-design.md`

**Depends on:** Nothing (this is Plan 1 of 3)

**Follow-up plans:**
- Plan 2: Real-Time Collaboration (Liveblocks presence + broadcast)
- Plan 3: Operations & Billing (session role-scoped views, Stripe seat billing)

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `lib/crew/permissions.ts` | Permission types, section constants, default role permission configs |
| `lib/crew/context.ts` | `getCrewContext()`, `requirePermission()` authorization helpers |
| `lib/crew/seed-roles.ts` | `seedDefaultRoles(layoutId)` — creates 4 default roles with permissions |
| `app/actions/crew.ts` | Crew member CRUD: invite by email, accept, remove, change role, leave |
| `app/actions/roles.ts` | Role CRUD: create, update permissions, delete with reassignment |
| `app/actions/invite-links.ts` | Invite link CRUD: create, pause/resume, revoke, join via link |
| `app/(dashboard)/dashboard/railroad/[id]/crew/page.tsx` | Crew members list + invite links section |
| `app/(dashboard)/dashboard/railroad/[id]/crew/invite/page.tsx` | Invite member by email page |
| `app/(dashboard)/dashboard/railroad/[id]/crew/invite-link/page.tsx` | Create invite link page |
| `app/(dashboard)/dashboard/railroad/[id]/crew/roles/page.tsx` | Roles & permissions grid page |
| `app/(dashboard)/dashboard/railroad/[id]/crew/roles/new/page.tsx` | Create custom role page |
| `app/(dashboard)/dashboard/railroad/[id]/crew/roles/[roleId]/page.tsx` | Edit role page |
| `app/(dashboard)/dashboard/railroad/[id]/crew/[memberId]/remove/page.tsx` | Remove member with content transfer |
| `app/(invite)/invite/[code]/page.tsx` | Accept invite link (public) |
| `app/(invite)/invite/accept/[token]/page.tsx` | Accept email invite (public) |
| `app/(invite)/layout.tsx` | Minimal layout for invite pages |
| `components/crew/crew-members-table.tsx` | Client component: members table with actions |
| `components/crew/invite-links-list.tsx` | Client component: invite links with copy/pause/revoke |
| `components/crew/role-permission-grid.tsx` | Client component: section × role permission checkboxes |
| `components/crew/role-form.tsx` | Client component: role name + permission grid form |
| `components/crew/invite-member-form.tsx` | Client component: email + role selector form |
| `components/crew/invite-link-form.tsx` | Client component: role + maxUses + expiry form |
| `components/crew/remove-member-form.tsx` | Client component: content list + transfer dropdown + confirm |
| `components/crew/accept-invite-button.tsx` | Client component: accept/join button with loading state |
| `hooks/use-permissions.ts` | `usePermissions()` hook for client-side permission gating |

### Modified Files

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add `Role`, `RolePermission`, `InviteLink` models. Modify `CrewMember` (replace `role` enum with `roleId` FK, add `invitedBy`, `removedAt`, `removedBy`). Remove `CrewRole` enum. Add relations to `User` and `Layout`. |
| `middleware.ts` | Add `/invite` routes to allow unauthenticated access |
| `components/layout/app-sidebar.tsx` | Add "Crew" nav item to `getRailroadMenuItems()` |
| `app/actions/layouts.ts` | Update `getLayout()` and `getLayoutContext()` to include crew railroads. Call `seedDefaultRoles()` in `createLayout()`. Update `selectLayout()` to allow crew members. |
| `lib/mail.ts` | Add `sendCrewInviteEmail()` function |
| `lib/limits.ts` | Add `checkCrewLimit()` function |

---

## Task 1: Prisma Schema Changes

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Update the schema**

Remove the `CrewRole` enum (lines 171-176). Add three new models (`Role`, `RolePermission`, `InviteLink`). Modify `CrewMember` to use `roleId` FK instead of the enum field, and add `invitedBy`, `removedAt`, `removedBy` fields. Add reverse relations to `User` and `Layout`.

Replace the `CrewRole` enum block:

```prisma
enum CrewRole {
  DISPATCHER
  YARDMASTER
  CONDUCTOR
  VIEWER
}
```

With nothing (delete it entirely).

Replace the entire `CrewMember` model block (lines 274-289):

```prisma
model CrewMember {
  id        String   @id @default(cuid())
  role      CrewRole @default(VIEWER)

  userId    String
  user      User     @relation("CrewUser", fields: [userId], references: [id], onDelete: Cascade)
  layoutId  String
  layout    Layout   @relation(fields: [layoutId], references: [id], onDelete: Cascade)

  invitedAt DateTime @default(now())
  acceptedAt DateTime?

  @@unique([userId, layoutId])
  @@index([userId])
  @@index([layoutId])
}
```

With:

```prisma
model CrewMember {
  id         String    @id @default(cuid())

  userId     String
  user       User      @relation("CrewUser", fields: [userId], references: [id], onDelete: Cascade)
  layoutId   String
  layout     Layout    @relation(fields: [layoutId], references: [id], onDelete: Cascade)
  roleId     String
  role       Role      @relation(fields: [roleId], references: [id])

  invitedBy  String?
  inviter    User?     @relation("CrewInviter", fields: [invitedBy], references: [id], onDelete: SetNull)
  invitedAt  DateTime  @default(now())
  acceptedAt DateTime?
  removedAt  DateTime?
  removedBy  String?

  @@unique([userId, layoutId])
  @@index([userId])
  @@index([layoutId])
  @@index([roleId])
}
```

Add three new models after the `CrewMember` model:

```prisma
model Role {
  id          String           @id @default(cuid())
  name        String
  isDefault   Boolean          @default(false)

  layoutId    String
  layout      Layout           @relation(fields: [layoutId], references: [id], onDelete: Cascade)

  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  permissions RolePermission[]
  members     CrewMember[]
  inviteLinks InviteLink[]

  @@unique([layoutId, name])
  @@index([layoutId])
}

model RolePermission {
  id      String  @id @default(cuid())
  section String  // "locations", "rolling_stock", "trains", "waybills", "sessions", "crew"
  canView Boolean @default(true)
  canEdit Boolean @default(false)

  roleId  String
  role    Role    @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@unique([roleId, section])
  @@index([roleId])
}

model InviteLink {
  id        String    @id @default(cuid())
  code      String    @unique @default(cuid())
  maxUses   Int?
  uses      Int       @default(0)
  expiresAt DateTime?
  paused    Boolean   @default(false)

  layoutId  String
  layout    Layout    @relation(fields: [layoutId], references: [id], onDelete: Cascade)
  roleId    String
  role      Role      @relation(fields: [roleId], references: [id])
  createdBy String
  creator   User      @relation("InviteLinkCreator", fields: [createdBy], references: [id], onDelete: Cascade)

  createdAt DateTime  @default(now())

  @@index([layoutId])
  @@index([code])
}
```

Add new reverse relations to the `User` model. After the existing `crewMemberships` line, add:

```prisma
  crewInvitations  CrewMember[]  @relation("CrewInviter")
  inviteLinks      InviteLink[]  @relation("InviteLinkCreator")
```

Add new reverse relations to the `Layout` model. After the existing `crewMembers` line, add:

```prisma
  roles           Role[]
  inviteLinks     InviteLink[]
```

- [ ] **Step 2: Generate Prisma client and push schema**

Run:
```bash
npx prisma generate && npx prisma db push
```

Expected: "Your database is now in sync with your Prisma schema." If there are existing `CrewMember` rows with the old `role` enum field, the push may fail. In that case, the rows need to be deleted first (there shouldn't be real crew data yet since the feature wasn't built).

- [ ] **Step 3: Verify in Prisma Studio**

Run:
```bash
npx prisma studio
```

Open the browser and verify that `Role`, `RolePermission`, `InviteLink` tables exist, and `CrewMember` now has `roleId`, `invitedBy`, `removedAt`, `removedBy` fields. The `CrewRole` enum column should no longer exist on `CrewMember`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(crew): add Role, RolePermission, InviteLink models and update CrewMember"
```

---

## Task 2: Permission Types and Default Role Config

**Files:**
- Create: `lib/crew/permissions.ts`

- [ ] **Step 1: Create the permissions module**

```typescript
// lib/crew/permissions.ts

export const CREW_SECTIONS = [
  "locations",
  "rolling_stock",
  "trains",
  "waybills",
  "sessions",
  "crew",
] as const;

export type CrewSection = (typeof CREW_SECTIONS)[number];

export const SECTION_LABELS: Record<CrewSection, string> = {
  locations: "Locations",
  rolling_stock: "Rolling Stock",
  trains: "Trains",
  waybills: "Waybills",
  sessions: "Sessions",
  crew: "Crew",
};

export interface PermissionMap {
  [section: string]: { canView: boolean; canEdit: boolean };
}

/** Full access for owners — not stored in DB, constructed at runtime */
export const OWNER_PERMISSIONS: PermissionMap = Object.fromEntries(
  CREW_SECTIONS.map((s) => [s, { canView: true, canEdit: true }])
);

/** Default permission configs for the four seeded roles */
export const DEFAULT_ROLE_PERMISSIONS: Record<
  string,
  { section: CrewSection; canView: boolean; canEdit: boolean }[]
> = {
  Dispatcher: CREW_SECTIONS.map((s) => ({
    section: s,
    canView: true,
    canEdit: true,
  })),
  Yardmaster: CREW_SECTIONS.map((s) => ({
    section: s,
    canView: true,
    canEdit: s === "locations" || s === "rolling_stock" || s === "waybills" || s === "sessions",
  })),
  Conductor: CREW_SECTIONS.map((s) => ({
    section: s,
    canView: true,
    canEdit: s === "rolling_stock" || s === "sessions",
  })),
  Viewer: CREW_SECTIONS.map((s) => ({
    section: s,
    canView: true,
    canEdit: false,
  })),
};

export const DEFAULT_ROLE_NAMES = Object.keys(DEFAULT_ROLE_PERMISSIONS);

/**
 * Resolve a flat array of RolePermission records into a PermissionMap.
 * Missing sections default to no access.
 */
export function resolvePermissions(
  permissions: { section: string; canView: boolean; canEdit: boolean }[]
): PermissionMap {
  const map: PermissionMap = {};
  for (const s of CREW_SECTIONS) {
    map[s] = { canView: false, canEdit: false };
  }
  for (const p of permissions) {
    map[p.section] = { canView: p.canView, canEdit: p.canEdit };
  }
  return map;
}
```

- [ ] **Step 2: Verify the module compiles**

Run:
```bash
npx tsc --noEmit lib/crew/permissions.ts 2>&1 || echo "Check output"
```

This file has no external dependencies so it should compile cleanly. If `tsc` complains about path resolution, that's fine — it will work in Next.js context.

- [ ] **Step 3: Commit**

```bash
git add lib/crew/permissions.ts
git commit -m "feat(crew): add permission types, section constants, and default role configs"
```

---

## Task 3: Seed Default Roles on Layout Creation

**Files:**
- Create: `lib/crew/seed-roles.ts`
- Modify: `app/actions/layouts.ts`

- [ ] **Step 1: Create the seed function**

```typescript
// lib/crew/seed-roles.ts

import { db } from "@/lib/db";
import { DEFAULT_ROLE_PERMISSIONS } from "./permissions";

/**
 * Create the four default roles (Dispatcher, Yardmaster, Conductor, Viewer)
 * with their default permissions for a new layout.
 * Safe to call multiple times — skips if roles already exist.
 */
export async function seedDefaultRoles(layoutId: string) {
  for (const [roleName, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const existing = await db.role.findUnique({
      where: { layoutId_name: { layoutId, name: roleName } },
    });
    if (existing) continue;

    await db.role.create({
      data: {
        name: roleName,
        isDefault: true,
        layoutId,
        permissions: {
          create: permissions.map((p) => ({
            section: p.section,
            canView: p.canView,
            canEdit: p.canEdit,
          })),
        },
      },
    });
  }
}
```

- [ ] **Step 2: Call seedDefaultRoles in createLayout**

In `app/actions/layouts.ts`, add the import at the top:

```typescript
import { seedDefaultRoles } from "@/lib/crew/seed-roles";
```

In the `createLayout` function, after the `db.layout.create()` call and before `revalidatePath`, add:

```typescript
  // Seed default crew roles for this railroad
  await seedDefaultRoles(layout.id);
```

The full `createLayout` function should now look like:

```typescript
export async function createLayout(values: z.infer<typeof layoutSchema>) {
  const session = await requireAuth();

  const validatedFields = layoutSchema.safeParse(values);
  if (!validatedFields.success) {
    return { error: "Invalid fields" };
  }

  const limit = await checkRailroadLimit(session.user.id);
  if (!limit.allowed) {
    return { error: `Free plan limit reached (${limit.limit} railroad). Upgrade to add more.` };
  }

  const layout = await db.layout.create({
    data: {
      ...validatedFields.data,
      userId: session.user.id,
    },
  });

  // Seed default crew roles for this railroad
  await seedDefaultRoles(layout.id);

  revalidatePath("/dashboard");
  return { success: true, layout };
}
```

- [ ] **Step 3: Verify by creating a layout**

Run `npm run dev`, log in, create a new railroad. Then check in Prisma Studio (`npx prisma studio`) that the `Role` table has 4 rows for the new layout (Dispatcher, Yardmaster, Conductor, Viewer) each with `isDefault: true`, and the `RolePermission` table has 24 rows (4 roles × 6 sections).

- [ ] **Step 4: Seed roles for existing layouts**

Create a one-time script. This isn't a file that stays in the codebase permanently — run it once then delete it. But we need to seed roles for any existing layouts.

Run in the terminal:
```bash
npx tsx -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const { DEFAULT_ROLE_PERMISSIONS } = require('./lib/crew/permissions');

async function main() {
  const layouts = await db.layout.findMany({ select: { id: true, name: true } });
  for (const layout of layouts) {
    for (const [roleName, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      const existing = await db.role.findUnique({
        where: { layoutId_name: { layoutId: layout.id, name: roleName } },
      });
      if (existing) continue;
      await db.role.create({
        data: {
          name: roleName,
          isDefault: true,
          layoutId: layout.id,
          permissions: {
            create: permissions.map((p) => ({
              section: p.section,
              canView: p.canView,
              canEdit: p.canEdit,
            })),
          },
        },
      });
    }
    console.log('Seeded roles for:', layout.name);
  }
}
main().then(() => db.\$disconnect());
"
```

If the inline script has quoting issues on Windows, create a temporary `scripts/seed-roles.ts` file, run it with `npx tsx scripts/seed-roles.ts`, then delete it.

- [ ] **Step 5: Commit**

```bash
git add lib/crew/seed-roles.ts app/actions/layouts.ts
git commit -m "feat(crew): seed default roles on layout creation"
```

---

## Task 4: Crew Context and Authorization Helpers

**Files:**
- Create: `lib/crew/context.ts`

- [ ] **Step 1: Create the authorization module**

```typescript
// lib/crew/context.ts

import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  type CrewSection,
  type PermissionMap,
  OWNER_PERMISSIONS,
  resolvePermissions,
} from "./permissions";

export interface CrewContext {
  userId: string;
  layoutId: string;
  isOwner: boolean;
  permissions: PermissionMap;
  role?: {
    id: string;
    name: string;
  };
}

/**
 * Get the current user's relationship to a railroad.
 * Returns null if the user has no access (not owner, not active crew).
 */
export async function getCrewContext(
  layoutId: string
): Promise<CrewContext | null> {
  const session = await auth();
  if (!session?.user) return null;

  const userId = session.user.id;

  // Check ownership first
  const layout = await db.layout.findFirst({
    where: { id: layoutId, userId },
    select: { id: true },
  });

  if (layout) {
    return {
      userId,
      layoutId,
      isOwner: true,
      permissions: OWNER_PERMISSIONS,
    };
  }

  // Check active crew membership
  const membership = await db.crewMember.findUnique({
    where: { userId_layoutId: { userId, layoutId } },
    include: {
      role: {
        include: { permissions: true },
      },
    },
  });

  if (
    !membership ||
    !membership.acceptedAt ||
    membership.removedAt
  ) {
    return null;
  }

  return {
    userId,
    layoutId,
    isOwner: false,
    permissions: resolvePermissions(membership.role.permissions),
    role: {
      id: membership.role.id,
      name: membership.role.name,
    },
  };
}

/**
 * Guard for server actions. Throws if the user lacks the required permission.
 * Use in server actions before any mutation or data access.
 */
export async function requirePermission(
  layoutId: string,
  section: CrewSection,
  action: "view" | "edit"
): Promise<CrewContext> {
  const ctx = await getCrewContext(layoutId);

  if (!ctx) {
    throw new Error("You do not have access to this railroad");
  }

  const perm = ctx.permissions[section];
  if (!perm) {
    throw new Error("Permission denied");
  }

  if (action === "view" && !perm.canView) {
    throw new Error("You do not have permission to view this section");
  }

  if (action === "edit" && !perm.canEdit) {
    throw new Error("You do not have permission to edit this section");
  }

  return ctx;
}

/**
 * Check if a user has any access to a railroad (owner or active crew).
 * Lighter than getCrewContext — no permission resolution.
 */
export async function hasRailroadAccess(
  userId: string,
  layoutId: string
): Promise<boolean> {
  // Check ownership
  const isOwner = await db.layout.count({
    where: { id: layoutId, userId },
  });
  if (isOwner > 0) return true;

  // Check active crew membership
  const membership = await db.crewMember.findUnique({
    where: { userId_layoutId: { userId, layoutId } },
    select: { acceptedAt: true, removedAt: true },
  });

  return !!membership?.acceptedAt && !membership?.removedAt;
}
```

- [ ] **Step 2: Verify the module compiles**

Run:
```bash
npx tsc --noEmit 2>&1 | head -20
```

Check for any type errors in the new file. Fix if needed.

- [ ] **Step 3: Commit**

```bash
git add lib/crew/context.ts
git commit -m "feat(crew): add getCrewContext and requirePermission authorization helpers"
```

---

## Task 5: Update Layout Actions for Crew Access

**Files:**
- Modify: `app/actions/layouts.ts`

- [ ] **Step 1: Update getLayout to allow crew member access**

Currently `getLayout` only returns layouts where `userId: session.user.id`. Crew members need to see layouts they're members of too.

Replace the `getLayout` function entirely:

```typescript
// Get single layout — owner OR active crew member can access
export async function getLayout(layoutId: string) {
  const session = await requireAuth();

  // First try as owner (includes full data)
  let layout = await db.layout.findFirst({
    where: {
      id: layoutId,
      userId: session.user.id,
    },
    include: {
      locations: {
        include: { industries: true, yardTracks: true },
        orderBy: { sortOrder: "asc" },
      },
      locomotives: true,
      freightCars: true,
      passengerCars: true,
      cabooses: true,
      mowEquipment: true,
      trains: {
        include: { origin: true, destination: true },
        orderBy: { trainNumber: "asc" },
      },
    },
  });

  if (!layout) {
    // Check if user is an active crew member
    const membership = await db.crewMember.findUnique({
      where: {
        userId_layoutId: {
          userId: session.user.id,
          layoutId,
        },
      },
      select: { acceptedAt: true, removedAt: true },
    });

    if (!membership?.acceptedAt || membership?.removedAt) {
      throw new Error("Layout not found");
    }

    // Fetch layout without ownership check
    layout = await db.layout.findUnique({
      where: { id: layoutId },
      include: {
        locations: {
          include: { industries: true, yardTracks: true },
          orderBy: { sortOrder: "asc" },
        },
        locomotives: true,
        freightCars: true,
        passengerCars: true,
        cabooses: true,
        mowEquipment: true,
        trains: {
          include: { origin: true, destination: true },
          orderBy: { trainNumber: "asc" },
        },
      },
    });

    if (!layout) {
      throw new Error("Layout not found");
    }
  }

  return layout;
}
```

- [ ] **Step 2: Update getLayoutContext to include crew railroads**

Replace the `getLayoutContext` function to include railroads the user is a crew member of:

```typescript
export async function getLayoutContext() {
  const session = await requireAuth();

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      selectedLayout: true,
      layouts: {
        select: {
          id: true,
          name: true,
          scale: true,
          description: true,
        },
        orderBy: { updatedAt: "desc" },
      },
      crewMemberships: {
        where: {
          acceptedAt: { not: null },
          removedAt: null,
        },
        include: {
          layout: {
            select: {
              id: true,
              name: true,
              scale: true,
              description: true,
            },
          },
          role: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Combine owned + crew layouts
  const ownedLayouts = user.layouts.map((l) => ({
    ...l,
    crewRole: null as string | null,
  }));
  const crewLayouts = user.crewMemberships.map((m) => ({
    ...m.layout,
    crewRole: m.role.name,
  }));
  const allLayouts = [...ownedLayouts, ...crewLayouts];

  let selectedLayout = user.selectedLayout;

  // Auto-select logic: if no layout selected but user has layouts
  if (!selectedLayout && allLayouts.length > 0) {
    if (allLayouts.length === 1) {
      const autoSelectedLayout = allLayouts[0];
      await db.user.update({
        where: { id: session.user.id },
        data: { selectedLayoutId: autoSelectedLayout.id },
      });
      selectedLayout = await db.layout.findUnique({
        where: { id: autoSelectedLayout.id },
      });
    }
  }

  // If selected layout no longer exists (was deleted), clear it
  if (user.selectedLayoutId && !selectedLayout) {
    await db.user.update({
      where: { id: session.user.id },
      data: { selectedLayoutId: null },
    });
  }

  return {
    selectedLayout: selectedLayout
      ? {
          id: selectedLayout.id,
          name: selectedLayout.name,
          scale: selectedLayout.scale,
          description: selectedLayout.description,
        }
      : null,
    layouts: allLayouts,
  };
}
```

- [ ] **Step 3: Update selectLayout to allow crew member selection**

Replace the `selectLayout` function:

```typescript
export async function selectLayout(layoutId: string | null) {
  const session = await requireAuth();

  if (layoutId) {
    // Verify ownership OR active crew membership
    const isOwner = await db.layout.count({
      where: { id: layoutId, userId: session.user.id },
    });

    if (!isOwner) {
      const membership = await db.crewMember.findUnique({
        where: {
          userId_layoutId: {
            userId: session.user.id,
            layoutId,
          },
        },
        select: { acceptedAt: true, removedAt: true },
      });

      if (!membership?.acceptedAt || membership?.removedAt) {
        return { error: "Layout not found" };
      }
    }
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { selectedLayoutId: layoutId },
  });

  revalidatePath("/dashboard");
  return { success: true };
}
```

- [ ] **Step 4: Verify the dev server starts**

Run:
```bash
npm run dev
```

Check there are no compile errors. Navigate to the dashboard and verify that the railroad switcher still works for owned layouts.

- [ ] **Step 5: Commit**

```bash
git add app/actions/layouts.ts
git commit -m "feat(crew): allow crew members to access and select railroads"
```

---

## Task 6: Crew Limit Check

**Files:**
- Modify: `lib/limits.ts`

- [ ] **Step 1: Add checkCrewLimit function**

Add this function at the end of `lib/limits.ts`:

```typescript
export async function checkCrewLimit(
  layoutId: string
): Promise<{ allowed: boolean; current: number; limit: number }> {
  // Get the layout owner's plan
  const layout = await db.layout.findUnique({
    where: { id: layoutId },
    include: { user: { select: { plan: true } } },
  });

  if (!layout) return { allowed: false, current: 0, limit: 0 };

  const limits = getPlanLimits(layout.user.plan);
  const limit = limits.maxCrew;

  if (limit === Infinity) {
    return { allowed: true, current: 0, limit };
  }

  const current = await db.crewMember.count({
    where: {
      layoutId,
      acceptedAt: { not: null },
      removedAt: null,
    },
  });

  return { allowed: current < limit, current, limit };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/limits.ts
git commit -m "feat(crew): add checkCrewLimit function"
```

---

## Task 7: Crew Invite Email

**Files:**
- Modify: `lib/mail.ts`

- [ ] **Step 1: Add sendCrewInviteEmail function**

Add at the end of `lib/mail.ts`:

```typescript
export async function sendCrewInviteEmail(
  email: string,
  token: string,
  railroadName: string,
  roleName: string,
  inviterName: string | null
) {
  const [transporter, fromEmail, appUrl] = await Promise.all([
    getTransporter(),
    getFromEmail(),
    getAppUrl(),
  ]);

  const acceptUrl = `${appUrl}/invite/accept/${token}`;
  const invitedBy = inviterName || "A railroad owner";

  await transporter.sendMail({
    from: fromEmail,
    to: email,
    subject: `You're invited to join ${railroadName} on RailOps`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Join ${railroadName}</h2>
        <p>${invitedBy} has invited you to join <strong>${railroadName}</strong> as a <strong>${roleName}</strong>.</p>
        <p>
          <a href="${acceptUrl}"
             style="display: inline-block; padding: 12px 24px; background: #171717; color: #fff; text-decoration: none; border-radius: 6px;">
            Accept Invitation
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          This invitation expires in 7 days. If you don't have a RailOps account, you'll be able to create one.
        </p>
      </div>
    `,
  });
}

export async function sendCrewRoleChangedEmail(
  email: string,
  railroadName: string,
  newRoleName: string
) {
  const [transporter, fromEmail] = await Promise.all([
    getTransporter(),
    getFromEmail(),
  ]);

  await transporter.sendMail({
    from: fromEmail,
    to: email,
    subject: `Your role on ${railroadName} has changed`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Role Updated</h2>
        <p>Your role on <strong>${railroadName}</strong> has been changed to <strong>${newRoleName}</strong>.</p>
        <p style="color: #666; font-size: 14px;">
          Your permissions have been updated accordingly.
        </p>
      </div>
    `,
  });
}

export async function sendCrewRemovedEmail(
  email: string,
  railroadName: string
) {
  const [transporter, fromEmail] = await Promise.all([
    getTransporter(),
    getFromEmail(),
  ]);

  await transporter.sendMail({
    from: fromEmail,
    to: email,
    subject: `You've been removed from ${railroadName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Access Removed</h2>
        <p>You no longer have access to <strong>${railroadName}</strong> on RailOps.</p>
        <p style="color: #666; font-size: 14px;">
          If you believe this was a mistake, contact the railroad owner.
        </p>
      </div>
    `,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/mail.ts
git commit -m "feat(crew): add crew invite, role change, and removal email functions"
```

---

## Task 8: Crew Member Server Actions

**Files:**
- Create: `app/actions/crew.ts`

- [ ] **Step 1: Create the crew actions module**

```typescript
// app/actions/crew.ts
"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/crew/context";
import { checkCrewLimit } from "@/lib/limits";
import { sendCrewInviteEmail, sendCrewRoleChangedEmail, sendCrewRemovedEmail } from "@/lib/mail";
import { SignJWT, jwtVerify } from "jose";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

const INVITE_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "fallback-secret"
);

async function createInviteToken(crewMemberId: string, layoutId: string): Promise<string> {
  return new SignJWT({ crewMemberId, layoutId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(INVITE_SECRET);
}

export async function verifyInviteToken(
  token: string
): Promise<{ crewMemberId: string; layoutId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, INVITE_SECRET);
    return {
      crewMemberId: payload.crewMemberId as string,
      layoutId: payload.layoutId as string,
    };
  } catch {
    return null;
  }
}

// ─── Invite by Email ───────────────────────────────

const inviteSchema = z.object({
  layoutId: z.string().min(1),
  email: z.string().email(),
  roleId: z.string().min(1),
});

export async function inviteCrewMember(values: z.infer<typeof inviteSchema>) {
  const session = await requireAuth();
  const parsed = inviteSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { layoutId, email, roleId } = parsed.data;

  // Only owner or users with crew edit permission can invite
  const ctx = await requirePermission(layoutId, "crew", "edit");

  // Check crew limit
  const limit = await checkCrewLimit(layoutId);
  if (!limit.allowed) {
    return { error: "Crew limit reached. Upgrade your plan to add more members." };
  }

  // Can't invite yourself
  const inviterUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true },
  });
  if (inviterUser?.email === email) {
    return { error: "You can't invite yourself" };
  }

  // Verify role belongs to this layout
  const role = await db.role.findFirst({
    where: { id: roleId, layoutId },
    select: { id: true, name: true },
  });
  if (!role) return { error: "Role not found" };

  // Check if user exists
  const targetUser = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (targetUser) {
    // Check if already a crew member
    const existing = await db.crewMember.findUnique({
      where: {
        userId_layoutId: { userId: targetUser.id, layoutId },
      },
      select: { id: true, acceptedAt: true, removedAt: true },
    });

    if (existing && existing.acceptedAt && !existing.removedAt) {
      return { error: "This person is already a crew member" };
    }

    // If previously removed, update the existing record
    if (existing && existing.removedAt) {
      const member = await db.crewMember.update({
        where: { id: existing.id },
        data: {
          roleId,
          invitedBy: session.user.id,
          invitedAt: new Date(),
          acceptedAt: null,
          removedAt: null,
          removedBy: null,
        },
      });

      const token = await createInviteToken(member.id, layoutId);
      const layout = await db.layout.findUnique({
        where: { id: layoutId },
        select: { name: true },
      });

      await sendCrewInviteEmail(
        email,
        token,
        layout?.name || "a railroad",
        role.name,
        inviterUser?.name || null
      );

      revalidatePath(`/dashboard/railroad/${layoutId}/crew`);
      return { success: true };
    }

    // Create new membership (pending)
    if (existing && !existing.acceptedAt) {
      // Re-send invite for existing pending membership
      const token = await createInviteToken(existing.id, layoutId);
      const layout = await db.layout.findUnique({
        where: { id: layoutId },
        select: { name: true },
      });

      await sendCrewInviteEmail(
        email,
        token,
        layout?.name || "a railroad",
        role.name,
        inviterUser?.name || null
      );

      revalidatePath(`/dashboard/railroad/${layoutId}/crew`);
      return { success: true };
    }

    // No existing record — create new
    const member = await db.crewMember.create({
      data: {
        userId: targetUser.id,
        layoutId,
        roleId,
        invitedBy: session.user.id,
      },
    });

    const token = await createInviteToken(member.id, layoutId);
    const layout = await db.layout.findUnique({
      where: { id: layoutId },
      select: { name: true },
    });

    await sendCrewInviteEmail(
      email,
      token,
      layout?.name || "a railroad",
      role.name,
      inviterUser?.name || null
    );

    revalidatePath(`/dashboard/railroad/${layoutId}/crew`);
    return { success: true };
  }

  // User doesn't exist yet — we still send the email.
  // We can't create a CrewMember without a userId, so we'll handle
  // this via the invite token: when they register and click the link,
  // the accept flow creates the membership.
  // For now, we need a placeholder approach. Let's create a pending
  // invite record using a special "email-only" invite approach.
  // Actually, the simplest approach: just send the email with a token
  // that encodes the layoutId + roleId + email. When they register
  // and visit the accept URL, we create the CrewMember then.

  const token = await new SignJWT({
    email,
    layoutId,
    roleId,
    invitedBy: session.user.id,
    type: "email-invite",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(INVITE_SECRET);

  const layout = await db.layout.findUnique({
    where: { id: layoutId },
    select: { name: true },
  });

  await sendCrewInviteEmail(
    email,
    token,
    layout?.name || "a railroad",
    role.name,
    inviterUser?.name || null
  );

  revalidatePath(`/dashboard/railroad/${layoutId}/crew`);
  return { success: true };
}

// ─── Accept Email Invite ───────────────────────────

export async function acceptEmailInvite(token: string) {
  const session = await requireAuth();

  // Try to verify as a CrewMember invite (user already existed)
  const memberPayload = await verifyInviteToken(token);
  if (memberPayload) {
    const member = await db.crewMember.findUnique({
      where: { id: memberPayload.crewMemberId },
      select: { id: true, userId: true, acceptedAt: true, removedAt: true },
    });

    if (!member) return { error: "Invitation not found" };
    if (member.userId !== session.user.id) return { error: "This invitation is for a different account" };
    if (member.acceptedAt) return { error: "Already accepted" };
    if (member.removedAt) return { error: "This invitation has been revoked" };

    await db.crewMember.update({
      where: { id: member.id },
      data: { acceptedAt: new Date() },
    });

    revalidatePath("/dashboard");
    return { success: true, layoutId: memberPayload.layoutId };
  }

  // Try to verify as an email-only invite (user didn't exist when invited)
  try {
    const { payload } = await jwtVerify(token, INVITE_SECRET);
    if (payload.type !== "email-invite") return { error: "Invalid invitation" };

    const { layoutId, roleId, invitedBy } = payload as {
      layoutId: string;
      roleId: string;
      invitedBy: string;
      email: string;
    };

    // Check if already a member
    const existing = await db.crewMember.findUnique({
      where: {
        userId_layoutId: { userId: session.user.id, layoutId: layoutId },
      },
    });

    if (existing?.acceptedAt && !existing?.removedAt) {
      return { error: "You're already a member of this railroad" };
    }

    if (existing) {
      await db.crewMember.update({
        where: { id: existing.id },
        data: {
          roleId: roleId,
          acceptedAt: new Date(),
          removedAt: null,
          removedBy: null,
        },
      });
    } else {
      await db.crewMember.create({
        data: {
          userId: session.user.id,
          layoutId: layoutId,
          roleId: roleId,
          invitedBy: invitedBy as string,
          acceptedAt: new Date(),
        },
      });
    }

    revalidatePath("/dashboard");
    return { success: true, layoutId };
  } catch {
    return { error: "Invalid or expired invitation" };
  }
}

// ─── Change Role ────────────────────────────────────

const changeRoleSchema = z.object({
  layoutId: z.string().min(1),
  memberId: z.string().min(1),
  roleId: z.string().min(1),
});

export async function changeCrewRole(values: z.infer<typeof changeRoleSchema>) {
  const session = await requireAuth();
  const parsed = changeRoleSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { layoutId, memberId, roleId } = parsed.data;
  await requirePermission(layoutId, "crew", "edit");

  // Verify role belongs to layout
  const role = await db.role.findFirst({
    where: { id: roleId, layoutId },
    select: { id: true, name: true },
  });
  if (!role) return { error: "Role not found" };

  const member = await db.crewMember.findFirst({
    where: { id: memberId, layoutId },
    include: { user: { select: { email: true } }, layout: { select: { name: true } } },
  });
  if (!member) return { error: "Member not found" };

  await db.crewMember.update({
    where: { id: memberId },
    data: { roleId },
  });

  // Send notification email
  await sendCrewRoleChangedEmail(member.user.email, member.layout.name, role.name);

  revalidatePath(`/dashboard/railroad/${layoutId}/crew`);
  return { success: true };
}

// ─── Remove Member ──────────────────────────────────

const removeSchema = z.object({
  layoutId: z.string().min(1),
  memberId: z.string().min(1),
  transferToUserId: z.string().optional(),
});

export async function removeCrewMember(values: z.infer<typeof removeSchema>) {
  const session = await requireAuth();
  const parsed = removeSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { layoutId, memberId, transferToUserId } = parsed.data;
  await requirePermission(layoutId, "crew", "edit");

  const member = await db.crewMember.findFirst({
    where: { id: memberId, layoutId, removedAt: null },
    include: { user: { select: { email: true } }, layout: { select: { name: true } } },
  });
  if (!member) return { error: "Member not found" };

  // Soft-remove: set removedAt/removedBy
  await db.crewMember.update({
    where: { id: memberId },
    data: {
      removedAt: new Date(),
      removedBy: session.user.id,
    },
  });

  // TODO: Transfer content if transferToUserId is set (Plan 1 scope: just record the removal)

  // Send notification email
  await sendCrewRemovedEmail(member.user.email, member.layout.name);

  revalidatePath(`/dashboard/railroad/${layoutId}/crew`);
  return { success: true };
}

// ─── Leave Railroad ─────────────────────────────────

export async function leaveRailroad(layoutId: string) {
  const session = await requireAuth();

  const member = await db.crewMember.findUnique({
    where: {
      userId_layoutId: { userId: session.user.id, layoutId },
    },
    select: { id: true, acceptedAt: true, removedAt: true },
  });

  if (!member || !member.acceptedAt || member.removedAt) {
    return { error: "You're not a member of this railroad" };
  }

  await db.crewMember.update({
    where: { id: member.id },
    data: {
      removedAt: new Date(),
      removedBy: session.user.id,
    },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

// ─── Get Crew Members ───────────────────────────────

export async function getCrewMembers(layoutId: string) {
  const session = await requireAuth();
  // Anyone with crew view permission can see the list
  await requirePermission(layoutId, "crew", "view");

  const layout = await db.layout.findUnique({
    where: { id: layoutId },
    select: { userId: true, user: { select: { id: true, name: true, email: true } } },
  });

  const members = await db.crewMember.findMany({
    where: { layoutId, removedAt: null },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      role: { select: { id: true, name: true } },
      inviter: { select: { name: true } },
    },
    orderBy: { invitedAt: "asc" },
  });

  return { owner: layout?.user, members };
}

// ─── Get Invite Info (for accept pages) ─────────────

export async function getInviteInfo(token: string) {
  // Try member invite
  const memberPayload = await verifyInviteToken(token);
  if (memberPayload) {
    const member = await db.crewMember.findUnique({
      where: { id: memberPayload.crewMemberId },
      include: {
        layout: { select: { name: true } },
        role: { select: { name: true } },
        inviter: { select: { name: true } },
      },
    });
    if (!member) return null;
    return {
      railroadName: member.layout.name,
      roleName: member.role.name,
      inviterName: member.inviter?.name || null,
      alreadyAccepted: !!member.acceptedAt,
    };
  }

  // Try email-only invite
  try {
    const { payload } = await jwtVerify(token, INVITE_SECRET);
    if (payload.type !== "email-invite") return null;

    const layout = await db.layout.findUnique({
      where: { id: payload.layoutId as string },
      select: { name: true },
    });
    const role = await db.role.findUnique({
      where: { id: payload.roleId as string },
      select: { name: true },
    });
    const inviter = payload.invitedBy
      ? await db.user.findUnique({
          where: { id: payload.invitedBy as string },
          select: { name: true },
        })
      : null;

    return {
      railroadName: layout?.name || "Unknown Railroad",
      roleName: role?.name || "Unknown Role",
      inviterName: inviter?.name || null,
      alreadyAccepted: false,
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Install jose dependency**

The `jose` package provides JWT signing/verification that works in Edge runtime (unlike `jsonwebtoken`). This is important since Next.js middleware runs in the Edge runtime.

Run:
```bash
npm install jose
```

- [ ] **Step 3: Verify the module compiles**

Run:
```bash
npm run dev
```

Check for compile errors. The dev server should start without type errors.

- [ ] **Step 4: Commit**

```bash
git add app/actions/crew.ts package.json package-lock.json
git commit -m "feat(crew): add crew member server actions (invite, accept, remove, change role, leave)"
```

---

## Task 9: Role CRUD Server Actions

**Files:**
- Create: `app/actions/roles.ts`

- [ ] **Step 1: Create the roles actions module**

```typescript
// app/actions/roles.ts
"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/crew/context";
import { CREW_SECTIONS, DEFAULT_ROLE_NAMES } from "@/lib/crew/permissions";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

// ─── Get Roles ──────────────────────────────────────

export async function getRoles(layoutId: string) {
  await requireAuth();
  await requirePermission(layoutId, "crew", "view");

  return db.role.findMany({
    where: { layoutId },
    include: {
      permissions: true,
      _count: { select: { members: { where: { removedAt: null } } } },
    },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

export async function getRole(roleId: string, layoutId: string) {
  await requireAuth();
  await requirePermission(layoutId, "crew", "view");

  return db.role.findFirst({
    where: { id: roleId, layoutId },
    include: { permissions: true },
  });
}

// ─── Create Role ────────────────────────────────────

const createRoleSchema = z.object({
  layoutId: z.string().min(1),
  name: z.string().min(1).max(50),
  permissions: z.array(
    z.object({
      section: z.string(),
      canView: z.boolean(),
      canEdit: z.boolean(),
    })
  ),
});

export async function createRole(values: z.infer<typeof createRoleSchema>) {
  await requireAuth();
  const parsed = createRoleSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { layoutId, name, permissions } = parsed.data;
  await requirePermission(layoutId, "crew", "edit");

  // Check for duplicate name
  const existing = await db.role.findUnique({
    where: { layoutId_name: { layoutId, name } },
  });
  if (existing) return { error: "A role with this name already exists" };

  // Validate sections
  const validSections = new Set(CREW_SECTIONS);
  for (const p of permissions) {
    if (!validSections.has(p.section as typeof CREW_SECTIONS[number])) {
      return { error: `Invalid section: ${p.section}` };
    }
  }

  await db.role.create({
    data: {
      name,
      layoutId,
      isDefault: false,
      permissions: {
        create: permissions.map((p) => ({
          section: p.section,
          canView: p.canView,
          canEdit: p.canEdit,
        })),
      },
    },
  });

  revalidatePath(`/dashboard/railroad/${layoutId}/crew/roles`);
  return { success: true };
}

// ─── Update Role Permissions ────────────────────────

const updateRoleSchema = z.object({
  roleId: z.string().min(1),
  layoutId: z.string().min(1),
  name: z.string().min(1).max(50).optional(),
  permissions: z.array(
    z.object({
      section: z.string(),
      canView: z.boolean(),
      canEdit: z.boolean(),
    })
  ),
});

export async function updateRole(values: z.infer<typeof updateRoleSchema>) {
  await requireAuth();
  const parsed = updateRoleSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { roleId, layoutId, name, permissions } = parsed.data;
  await requirePermission(layoutId, "crew", "edit");

  const role = await db.role.findFirst({
    where: { id: roleId, layoutId },
  });
  if (!role) return { error: "Role not found" };

  // Default roles can't be renamed
  if (role.isDefault && name && name !== role.name) {
    return { error: "Default roles cannot be renamed" };
  }

  // Check for duplicate name if renaming
  if (name && name !== role.name) {
    const duplicate = await db.role.findUnique({
      where: { layoutId_name: { layoutId, name } },
    });
    if (duplicate) return { error: "A role with this name already exists" };
  }

  // Update role name if changed
  if (name && name !== role.name) {
    await db.role.update({
      where: { id: roleId },
      data: { name },
    });
  }

  // Upsert permissions
  for (const p of permissions) {
    await db.rolePermission.upsert({
      where: { roleId_section: { roleId, section: p.section } },
      create: {
        roleId,
        section: p.section,
        canView: p.canView,
        canEdit: p.canEdit,
      },
      update: {
        canView: p.canView,
        canEdit: p.canEdit,
      },
    });
  }

  revalidatePath(`/dashboard/railroad/${layoutId}/crew/roles`);
  return { success: true };
}

// ─── Delete Role ────────────────────────────────────

const deleteRoleSchema = z.object({
  roleId: z.string().min(1),
  layoutId: z.string().min(1),
  reassignToRoleId: z.string().optional(),
});

export async function deleteRole(values: z.infer<typeof deleteRoleSchema>) {
  await requireAuth();
  const parsed = deleteRoleSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { roleId, layoutId, reassignToRoleId } = parsed.data;
  await requirePermission(layoutId, "crew", "edit");

  const role = await db.role.findFirst({
    where: { id: roleId, layoutId },
    include: { _count: { select: { members: { where: { removedAt: null } } } } },
  });
  if (!role) return { error: "Role not found" };

  // Default roles can't be deleted
  if (role.isDefault) {
    return { error: "Default roles cannot be deleted" };
  }

  // If members exist, reassignment is required
  if (role._count.members > 0) {
    if (!reassignToRoleId) {
      return { error: "This role has active members. Provide a role to reassign them to." };
    }

    const targetRole = await db.role.findFirst({
      where: { id: reassignToRoleId, layoutId },
    });
    if (!targetRole) return { error: "Target role not found" };

    // Reassign all members
    await db.crewMember.updateMany({
      where: { roleId, layoutId, removedAt: null },
      data: { roleId: reassignToRoleId },
    });
  }

  // Delete role (cascade deletes permissions)
  await db.role.delete({ where: { id: roleId } });

  revalidatePath(`/dashboard/railroad/${layoutId}/crew/roles`);
  return { success: true };
}
```

- [ ] **Step 2: Verify compilation**

Run:
```bash
npm run dev
```

No errors expected.

- [ ] **Step 3: Commit**

```bash
git add app/actions/roles.ts
git commit -m "feat(crew): add role CRUD server actions (create, update, delete with reassignment)"
```

---

## Task 10: Invite Link Server Actions

**Files:**
- Create: `app/actions/invite-links.ts`

- [ ] **Step 1: Create the invite links actions module**

```typescript
// app/actions/invite-links.ts
"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/crew/context";
import { checkCrewLimit } from "@/lib/limits";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

// ─── Get Invite Links ───────────────────────────────

export async function getInviteLinks(layoutId: string) {
  await requireAuth();
  await requirePermission(layoutId, "crew", "view");

  return db.inviteLink.findMany({
    where: { layoutId },
    include: {
      role: { select: { name: true } },
      creator: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Create Invite Link ────────────────────────────

const createLinkSchema = z.object({
  layoutId: z.string().min(1),
  roleId: z.string().min(1),
  maxUses: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
});

export async function createInviteLink(values: z.infer<typeof createLinkSchema>) {
  const session = await requireAuth();
  const parsed = createLinkSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { layoutId, roleId, maxUses, expiresAt } = parsed.data;
  await requirePermission(layoutId, "crew", "edit");

  // Verify role belongs to layout
  const role = await db.role.findFirst({
    where: { id: roleId, layoutId },
  });
  if (!role) return { error: "Role not found" };

  const link = await db.inviteLink.create({
    data: {
      layoutId,
      roleId,
      maxUses: maxUses || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: session.user.id,
    },
  });

  revalidatePath(`/dashboard/railroad/${layoutId}/crew`);
  return { success: true, code: link.code };
}

// ─── Pause / Resume ─────────────────────────────────

export async function toggleInviteLinkPause(linkId: string, layoutId: string) {
  await requireAuth();
  await requirePermission(layoutId, "crew", "edit");

  const link = await db.inviteLink.findFirst({
    where: { id: linkId, layoutId },
  });
  if (!link) return { error: "Link not found" };

  await db.inviteLink.update({
    where: { id: linkId },
    data: { paused: !link.paused },
  });

  revalidatePath(`/dashboard/railroad/${layoutId}/crew`);
  return { success: true };
}

// ─── Revoke (Delete) ────────────────────────────────

export async function revokeInviteLink(linkId: string, layoutId: string) {
  await requireAuth();
  await requirePermission(layoutId, "crew", "edit");

  const link = await db.inviteLink.findFirst({
    where: { id: linkId, layoutId },
  });
  if (!link) return { error: "Link not found" };

  await db.inviteLink.delete({ where: { id: linkId } });

  revalidatePath(`/dashboard/railroad/${layoutId}/crew`);
  return { success: true };
}

// ─── Join via Invite Link ───────────────────────────

export async function joinViaInviteLink(code: string) {
  const session = await requireAuth();

  const link = await db.inviteLink.findUnique({
    where: { code },
    include: {
      layout: { select: { id: true, name: true, userId: true } },
      role: { select: { id: true, name: true } },
    },
  });

  if (!link) return { error: "Invalid invite link" };
  if (link.paused) return { error: "This invite link is paused" };
  if (link.expiresAt && link.expiresAt < new Date()) return { error: "This invite link has expired" };
  if (link.maxUses && link.uses >= link.maxUses) return { error: "This invite link has reached its maximum uses" };

  // Can't join your own railroad
  if (link.layout.userId === session.user.id) {
    return { error: "You already own this railroad" };
  }

  // Check if already a member
  const existing = await db.crewMember.findUnique({
    where: {
      userId_layoutId: { userId: session.user.id, layoutId: link.layoutId },
    },
  });

  if (existing?.acceptedAt && !existing?.removedAt) {
    return { error: "You're already a member of this railroad" };
  }

  // Check crew limit
  const limit = await checkCrewLimit(link.layoutId);
  if (!limit.allowed) {
    return { error: "This railroad has reached its crew member limit" };
  }

  if (existing) {
    // Re-activate previously removed member
    await db.crewMember.update({
      where: { id: existing.id },
      data: {
        roleId: link.role.id,
        acceptedAt: new Date(),
        removedAt: null,
        removedBy: null,
      },
    });
  } else {
    await db.crewMember.create({
      data: {
        userId: session.user.id,
        layoutId: link.layoutId,
        roleId: link.role.id,
        acceptedAt: new Date(),
      },
    });
  }

  // Increment uses
  await db.inviteLink.update({
    where: { id: link.id },
    data: { uses: { increment: 1 } },
  });

  revalidatePath("/dashboard");
  return { success: true, layoutId: link.layoutId, railroadName: link.layout.name };
}

// ─── Get Link Info (for the join page) ──────────────

export async function getInviteLinkInfo(code: string) {
  const link = await db.inviteLink.findUnique({
    where: { code },
    include: {
      layout: { select: { name: true } },
      role: { select: { name: true } },
      creator: { select: { name: true } },
    },
  });

  if (!link) return null;

  const isExpired = link.expiresAt ? link.expiresAt < new Date() : false;
  const isMaxed = link.maxUses ? link.uses >= link.maxUses : false;

  return {
    railroadName: link.layout.name,
    roleName: link.role.name,
    creatorName: link.creator.name,
    paused: link.paused,
    expired: isExpired,
    maxedOut: isMaxed,
  };
}
```

- [ ] **Step 2: Verify compilation**

Run:
```bash
npm run dev
```

- [ ] **Step 3: Commit**

```bash
git add app/actions/invite-links.ts
git commit -m "feat(crew): add invite link server actions (create, pause, revoke, join)"
```

---

## Task 11: Update Middleware for Invite Routes

**Files:**
- Modify: `middleware.ts`

- [ ] **Step 1: Add invite route handling**

The `/invite/*` routes need to be accessible without login (users might not have an account yet). Add an `isInviteRoute` check before the dashboard protection block.

Add after line 13 (`const isDashboardRoute = ...`):

```typescript
  const isInviteRoute = pathname.startsWith("/invite");
```

Add this block after the admin route protection and before the dashboard route protection:

```typescript
  // Invite routes are public — let them through
  if (isInviteRoute) {
    return NextResponse.next();
  }
```

The full middleware should now be:

```typescript
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;
  const emailVerified = req.auth?.user?.emailVerified;

  const pathname = nextUrl.pathname;
  const isAuthRoute = pathname.startsWith("/auth");
  const isAdminRoute = pathname.startsWith("/admin");
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isInviteRoute = pathname.startsWith("/invite");
  const isVerificationRoute =
    pathname === "/auth/verify" || pathname === "/auth/check-email";

  // Allow verification routes even when logged in and unverified
  if (isVerificationRoute && isLoggedIn) {
    return NextResponse.next();
  }

  // Redirect logged-in users away from auth pages
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Protect admin routes
  if (isAdminRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/auth/login", nextUrl));
    }
    if (userRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
  }

  // Invite routes are public — let them through
  if (isInviteRoute) {
    return NextResponse.next();
  }

  // Protect dashboard routes — require login + verified email
  if (isDashboardRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/auth/login", nextUrl));
    }
    if (!emailVerified) {
      return NextResponse.redirect(new URL("/auth/check-email", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/stripe|api|_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 2: Commit**

```bash
git add middleware.ts
git commit -m "feat(crew): allow unauthenticated access to invite routes"
```

---

## Task 12: Sidebar Crew Nav Item

**Files:**
- Modify: `components/layout/app-sidebar.tsx`

- [ ] **Step 1: Add Users icon import and Crew menu item**

The `Users` icon is already imported. Add the Crew menu item to `getRailroadMenuItems()`. Insert it after the Sessions item and before the Operations Guide item:

```typescript
    {
      href: `/dashboard/railroad/${railroadId}/crew`,
      label: "Crew",
      icon: Users,
    },
```

The updated `getRailroadMenuItems` function should have the items in this order:
1. Operations Center
2. Locations
3. Locomotives
4. Freight Cars
5. Passenger Cars
6. Cabooses
7. MOW Equipment
8. Trains
9. Waybills
10. Sessions
11. **Crew** (new)
12. Operations Guide
13. Settings

- [ ] **Step 2: Verify in browser**

Run `npm run dev`, navigate to a railroad. The sidebar should now show "Crew" between "Sessions" and "Operations Guide".

- [ ] **Step 3: Commit**

```bash
git add components/layout/app-sidebar.tsx
git commit -m "feat(crew): add Crew nav item to railroad sidebar"
```

---

## Task 13: Crew Members Table Component

**Files:**
- Create: `components/crew/crew-members-table.tsx`

- [ ] **Step 1: Create the crew members table**

```typescript
// components/crew/crew-members-table.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { changeCrewRole } from "@/app/actions/crew";
import { toast } from "sonner";

interface CrewMember {
  id: string;
  user: { id: string; name: string | null; email: string; image: string | null };
  role: { id: string; name: string };
  inviter: { name: string | null } | null;
  invitedAt: Date;
  acceptedAt: Date | null;
}

interface Role {
  id: string;
  name: string;
}

interface CrewMembersTableProps {
  members: CrewMember[];
  owner: { id: string; name: string | null; email: string } | null | undefined;
  roles: Role[];
  layoutId: string;
  isOwner: boolean;
  canEditCrew: boolean;
}

export function CrewMembersTable({
  members,
  owner,
  roles,
  layoutId,
  isOwner,
  canEditCrew,
}: CrewMembersTableProps) {
  const [changingRole, setChangingRole] = useState<string | null>(null);

  async function handleRoleChange(memberId: string, roleId: string) {
    setChangingRole(memberId);
    const result = await changeCrewRole({ layoutId, memberId, roleId });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Role updated");
    }
    setChangingRole(null);
  }

  return (
    <div className="rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground text-xs uppercase tracking-wide">
            <th className="text-left p-3 font-medium">Member</th>
            <th className="text-left p-3 font-medium">Role</th>
            <th className="text-left p-3 font-medium">Status</th>
            <th className="text-left p-3 font-medium">Joined</th>
            {canEditCrew && <th className="text-right p-3 font-medium w-10"></th>}
          </tr>
        </thead>
        <tbody>
          {/* Owner row */}
          {owner && (
            <tr className="border-b">
              <td className="p-3">
                <div className="font-medium">{owner.name || "Unknown"}</div>
                <div className="text-xs text-muted-foreground">{owner.email}</div>
              </td>
              <td className="p-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-400">
                  Owner
                </span>
              </td>
              <td className="p-3">
                <span className="text-green-500">● Active</span>
              </td>
              <td className="p-3 text-muted-foreground">—</td>
              {canEditCrew && <td className="p-3">—</td>}
            </tr>
          )}
          {/* Crew members */}
          {members.map((member) => (
            <tr key={member.id} className="border-b last:border-0">
              <td className="p-3">
                <div className="font-medium">
                  {member.user.name || member.user.email}
                </div>
                <div className="text-xs text-muted-foreground">
                  {member.user.email}
                </div>
              </td>
              <td className="p-3">
                {canEditCrew ? (
                  <Select
                    value={member.role.id}
                    onValueChange={(value) =>
                      handleRoleChange(member.id, value)
                    }
                    disabled={changingRole === member.id}
                  >
                    <SelectTrigger className="w-36 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400">
                    {member.role.name}
                  </span>
                )}
              </td>
              <td className="p-3">
                {member.acceptedAt ? (
                  <span className="text-green-500">● Active</span>
                ) : (
                  <span className="text-yellow-500">◯ Pending</span>
                )}
              </td>
              <td className="p-3 text-muted-foreground">
                {member.acceptedAt
                  ? new Date(member.acceptedAt).toLocaleDateString()
                  : `Invited ${new Date(member.invitedAt).toLocaleDateString()}`}
              </td>
              {canEditCrew && (
                <td className="p-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/dashboard/railroad/${layoutId}/crew/${member.id}/remove`}
                        >
                          Remove
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              )}
            </tr>
          ))}
          {members.length === 0 && (
            <tr>
              <td
                colSpan={canEditCrew ? 5 : 4}
                className="p-8 text-center text-muted-foreground"
              >
                No crew members yet. Invite someone to get started.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/crew/crew-members-table.tsx
git commit -m "feat(crew): add crew members table component"
```

---

## Task 14: Invite Links List Component

**Files:**
- Create: `components/crew/invite-links-list.tsx`

- [ ] **Step 1: Create the invite links list**

```typescript
// components/crew/invite-links-list.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Pause, Play, Trash2 } from "lucide-react";
import { toggleInviteLinkPause, revokeInviteLink } from "@/app/actions/invite-links";
import { toast } from "sonner";

interface InviteLink {
  id: string;
  code: string;
  maxUses: number | null;
  uses: number;
  expiresAt: Date | null;
  paused: boolean;
  createdAt: Date;
  role: { name: string };
  creator: { name: string | null };
}

interface InviteLinksListProps {
  links: InviteLink[];
  layoutId: string;
  canEdit: boolean;
}

export function InviteLinksList({ links, layoutId, canEdit }: InviteLinksListProps) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleCopy(code: string) {
    const url = `${window.location.origin}/invite/${code}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  }

  async function handleTogglePause(linkId: string) {
    setLoading(linkId);
    const result = await toggleInviteLinkPause(linkId, layoutId);
    if (result.error) toast.error(result.error);
    setLoading(null);
  }

  async function handleRevoke(linkId: string) {
    setLoading(linkId);
    const result = await revokeInviteLink(linkId, layoutId);
    if (result.error) toast.error(result.error);
    else toast.success("Link revoked");
    setLoading(null);
  }

  if (links.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
        Active Invite Links
      </h3>
      <div className="space-y-2">
        {links.map((link) => {
          const isExpired = link.expiresAt ? new Date(link.expiresAt) < new Date() : false;
          const isMaxed = link.maxUses ? link.uses >= link.maxUses : false;
          const isDisabled = link.paused || isExpired || isMaxed;

          return (
            <div
              key={link.id}
              className={`flex items-center justify-between p-3 rounded-lg border text-sm ${
                isDisabled ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-48">
                  /invite/{link.code}
                </code>
                <span className="text-blue-400 text-xs">{link.role.name}</span>
                {link.maxUses && (
                  <span className="text-muted-foreground text-xs">
                    {link.uses}/{link.maxUses} uses
                  </span>
                )}
                {link.expiresAt && (
                  <span className="text-muted-foreground text-xs">
                    {isExpired
                      ? "Expired"
                      : `Expires ${new Date(link.expiresAt).toLocaleDateString()}`}
                  </span>
                )}
                {link.paused && (
                  <span className="text-yellow-500 text-xs">Paused</span>
                )}
              </div>
              {canEdit && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleCopy(link.code)}
                    title="Copy link"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleTogglePause(link.id)}
                    disabled={loading === link.id}
                    title={link.paused ? "Resume" : "Pause"}
                  >
                    {link.paused ? (
                      <Play className="h-3.5 w-3.5" />
                    ) : (
                      <Pause className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => handleRevoke(link.id)}
                    disabled={loading === link.id}
                    title="Revoke"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/crew/invite-links-list.tsx
git commit -m "feat(crew): add invite links list component"
```

---

## Task 15: Crew Page

**Files:**
- Create: `app/(dashboard)/dashboard/railroad/[id]/crew/page.tsx`

- [ ] **Step 1: Create the crew page**

```typescript
// app/(dashboard)/dashboard/railroad/[id]/crew/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLayout } from "@/app/actions/layouts";
import { getCrewMembers } from "@/app/actions/crew";
import { getRoles } from "@/app/actions/roles";
import { getInviteLinks } from "@/app/actions/invite-links";
import { getCrewContext } from "@/lib/crew/context";
import { CrewMembersTable } from "@/components/crew/crew-members-table";
import { InviteLinksList } from "@/components/crew/invite-links-list";

export default async function CrewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id } = await params;
  const layout = await getLayout(id);
  const ctx = await getCrewContext(id);
  if (!ctx) redirect("/dashboard");

  const [{ owner, members }, roles, inviteLinks] = await Promise.all([
    getCrewMembers(id),
    getRoles(id),
    getInviteLinks(id),
  ]);

  const canEditCrew = ctx.isOwner || ctx.permissions.crew?.canEdit;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/railroad/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Crew</h1>
            <p className="text-sm text-muted-foreground">
              {layout.name} — {members.length} member{members.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {canEditCrew && (
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href={`/dashboard/railroad/${id}/crew/invite-link`}>
                <LinkIcon className="mr-2 h-4 w-4" />
                Create Invite Link
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/dashboard/railroad/${id}/crew/invite`}>
                <Plus className="mr-2 h-4 w-4" />
                Invite Member
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Members Table */}
      <CrewMembersTable
        members={members}
        owner={owner}
        roles={roles.map((r) => ({ id: r.id, name: r.name }))}
        layoutId={id}
        isOwner={ctx.isOwner}
        canEditCrew={!!canEditCrew}
      />

      {/* Invite Links */}
      <InviteLinksList
        links={inviteLinks}
        layoutId={id}
        canEdit={!!canEditCrew}
      />

      {/* Roles Link */}
      {canEditCrew && (
        <div className="pt-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/railroad/${id}/crew/roles`}>
              Manage Roles & Permissions
            </Link>
          </Button>
        </div>
      )}

      {/* Leave Railroad (for crew members, not owner) */}
      {!ctx.isOwner && (
        <div className="pt-4 border-t">
          <Button variant="ghost" className="text-destructive" asChild>
            <Link href={`/dashboard/railroad/${id}/crew/leave`}>
              Leave Railroad
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Run `npm run dev`, navigate to `/dashboard/railroad/{your-railroad-id}/crew`. You should see the crew page with the owner listed, empty members table, and the action buttons.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/dashboard/railroad/[id]/crew/page.tsx"
git commit -m "feat(crew): add crew members page"
```

---

## Task 16: Invite Member Page + Form

**Files:**
- Create: `components/crew/invite-member-form.tsx`
- Create: `app/(dashboard)/dashboard/railroad/[id]/crew/invite/page.tsx`

- [ ] **Step 1: Create the invite member form**

```typescript
// components/crew/invite-member-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inviteCrewMember } from "@/app/actions/crew";
import { toast } from "sonner";

interface Role {
  id: string;
  name: string;
}

interface InviteMemberFormProps {
  layoutId: string;
  roles: Role[];
}

export function InviteMemberForm({ layoutId, roles }: InviteMemberFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState(roles[0]?.id || "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !roleId) return;

    setLoading(true);
    const result = await inviteCrewMember({ layoutId, email, roleId });
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Invitation sent to ${email}`);
      router.push(`/dashboard/railroad/${layoutId}/crew`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          placeholder="crew@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select value={roleId} onValueChange={setRoleId}>
          <SelectTrigger id="role">
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Sending..." : "Send Invitation"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/dashboard/railroad/${layoutId}/crew`)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create the invite member page**

```typescript
// app/(dashboard)/dashboard/railroad/[id]/crew/invite/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLayout } from "@/app/actions/layouts";
import { getRoles } from "@/app/actions/roles";
import { requirePermission } from "@/lib/crew/context";
import { InviteMemberForm } from "@/components/crew/invite-member-form";

export default async function InviteMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id } = await params;
  await requirePermission(id, "crew", "edit");
  const layout = await getLayout(id);
  const roles = await getRoles(id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/railroad/${id}/crew`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Invite Member</h1>
          <p className="text-sm text-muted-foreground">{layout.name}</p>
        </div>
      </div>

      <InviteMemberForm
        layoutId={id}
        roles={roles.map((r) => ({ id: r.id, name: r.name }))}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

Navigate to `/dashboard/railroad/{id}/crew/invite`. You should see the email + role form.

- [ ] **Step 4: Commit**

```bash
git add components/crew/invite-member-form.tsx "app/(dashboard)/dashboard/railroad/[id]/crew/invite/page.tsx"
git commit -m "feat(crew): add invite member page and form"
```

---

## Task 17: Create Invite Link Page + Form

**Files:**
- Create: `components/crew/invite-link-form.tsx`
- Create: `app/(dashboard)/dashboard/railroad/[id]/crew/invite-link/page.tsx`

- [ ] **Step 1: Create the invite link form**

```typescript
// components/crew/invite-link-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createInviteLink } from "@/app/actions/invite-links";
import { toast } from "sonner";
import { Copy } from "lucide-react";

interface Role {
  id: string;
  name: string;
}

interface InviteLinkFormProps {
  layoutId: string;
  roles: Role[];
}

export function InviteLinkForm({ layoutId, roles }: InviteLinkFormProps) {
  const router = useRouter();
  const [roleId, setRoleId] = useState(roles[0]?.id || "");
  const [maxUses, setMaxUses] = useState("");
  const [expiresIn, setExpiresIn] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!roleId) return;

    setLoading(true);

    let expiresAt: string | undefined;
    if (expiresIn) {
      const days = parseInt(expiresIn);
      if (days > 0) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        expiresAt = date.toISOString();
      }
    }

    const result = await createInviteLink({
      layoutId,
      roleId,
      maxUses: maxUses ? parseInt(maxUses) : undefined,
      expiresAt,
    });
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else if (result.code) {
      setGeneratedCode(result.code);
      toast.success("Invite link created");
    }
  }

  async function handleCopy() {
    if (!generatedCode) return;
    const url = `${window.location.origin}/invite/${generatedCode}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  }

  if (generatedCode) {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${generatedCode}`;
    return (
      <div className="space-y-4 max-w-md">
        <div className="p-4 rounded-lg border bg-muted/50">
          <Label className="text-xs text-muted-foreground">Invite Link</Label>
          <div className="flex items-center gap-2 mt-1">
            <code className="flex-1 text-sm break-all">{url}</code>
            <Button variant="outline" size="icon" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCopy}>Copy Link</Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/railroad/${layoutId}/crew`)}
          >
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="role">Role for new members</Label>
        <Select value={roleId} onValueChange={setRoleId}>
          <SelectTrigger id="role">
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="maxUses">Max uses (optional)</Label>
        <Input
          id="maxUses"
          type="number"
          min="1"
          placeholder="Unlimited"
          value={maxUses}
          onChange={(e) => setMaxUses(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="expiresIn">Expires in (days, optional)</Label>
        <Input
          id="expiresIn"
          type="number"
          min="1"
          placeholder="Never"
          value={expiresIn}
          onChange={(e) => setExpiresIn(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Link"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/dashboard/railroad/${layoutId}/crew`)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create the invite link page**

```typescript
// app/(dashboard)/dashboard/railroad/[id]/crew/invite-link/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLayout } from "@/app/actions/layouts";
import { getRoles } from "@/app/actions/roles";
import { requirePermission } from "@/lib/crew/context";
import { InviteLinkForm } from "@/components/crew/invite-link-form";

export default async function CreateInviteLinkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id } = await params;
  await requirePermission(id, "crew", "edit");
  const layout = await getLayout(id);
  const roles = await getRoles(id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/railroad/${id}/crew`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create Invite Link</h1>
          <p className="text-sm text-muted-foreground">{layout.name}</p>
        </div>
      </div>

      <InviteLinkForm
        layoutId={id}
        roles={roles.map((r) => ({ id: r.id, name: r.name }))}
      />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/crew/invite-link-form.tsx "app/(dashboard)/dashboard/railroad/[id]/crew/invite-link/page.tsx"
git commit -m "feat(crew): add create invite link page and form"
```

---

## Task 18: Roles & Permissions Page + Grid Component

**Files:**
- Create: `components/crew/role-permission-grid.tsx`
- Create: `app/(dashboard)/dashboard/railroad/[id]/crew/roles/page.tsx`

- [ ] **Step 1: Create the permission grid component**

```typescript
// components/crew/role-permission-grid.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CREW_SECTIONS, SECTION_LABELS, type CrewSection } from "@/lib/crew/permissions";
import { updateRole } from "@/app/actions/roles";
import { toast } from "sonner";

interface RolePermission {
  section: string;
  canView: boolean;
  canEdit: boolean;
}

interface RoleData {
  id: string;
  name: string;
  isDefault: boolean;
  permissions: RolePermission[];
  _count: { members: number };
}

interface RolePermissionGridProps {
  roles: RoleData[];
  layoutId: string;
  canEdit: boolean;
}

export function RolePermissionGrid({
  roles,
  layoutId,
  canEdit,
}: RolePermissionGridProps) {
  const [saving, setSaving] = useState<string | null>(null);

  async function handleToggle(
    role: RoleData,
    section: string,
    field: "canView" | "canEdit",
    value: boolean
  ) {
    setSaving(role.id);

    const updatedPermissions = CREW_SECTIONS.map((s) => {
      const existing = role.permissions.find((p) => p.section === s);
      if (s === section) {
        const newPerm = {
          section: s,
          canView: field === "canView" ? value : (existing?.canView ?? true),
          canEdit: field === "canEdit" ? value : (existing?.canEdit ?? false),
        };
        // If canEdit is turned on, canView must also be on
        if (field === "canEdit" && value) newPerm.canView = true;
        // If canView is turned off, canEdit must also be off
        if (field === "canView" && !value) newPerm.canEdit = false;
        return newPerm;
      }
      return {
        section: s,
        canView: existing?.canView ?? true,
        canEdit: existing?.canEdit ?? false,
      };
    });

    const result = await updateRole({
      roleId: role.id,
      layoutId,
      permissions: updatedPermissions,
    });

    if (result.error) toast.error(result.error);
    setSaving(null);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wide min-w-32">
              Section
            </th>
            {roles.map((role) => (
              <th
                key={role.id}
                colSpan={2}
                className="text-center p-3 font-medium text-xs uppercase tracking-wide"
              >
                <Link
                  href={`/dashboard/railroad/${layoutId}/crew/roles/${role.id}`}
                  className="hover:underline"
                >
                  {role.name}
                </Link>
                <div className="text-muted-foreground font-normal normal-case mt-0.5">
                  {role._count.members} member{role._count.members !== 1 ? "s" : ""}
                </div>
              </th>
            ))}
          </tr>
          <tr className="border-b">
            <th></th>
            {roles.map((role) => (
              <th key={role.id} colSpan={2} className="text-center p-1">
                <div className="flex justify-center gap-6 text-xs text-muted-foreground">
                  <span>View</span>
                  <span>Edit</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CREW_SECTIONS.map((section) => (
            <tr key={section} className="border-b last:border-0">
              <td className="p-3 font-medium">
                {SECTION_LABELS[section as CrewSection]}
              </td>
              {roles.map((role) => {
                const perm = role.permissions.find((p) => p.section === section);
                return (
                  <td key={role.id} colSpan={2} className="p-3">
                    <div className="flex justify-center gap-6">
                      <Checkbox
                        checked={perm?.canView ?? false}
                        onCheckedChange={(checked) =>
                          handleToggle(role, section, "canView", !!checked)
                        }
                        disabled={!canEdit || saving === role.id}
                      />
                      <Checkbox
                        checked={perm?.canEdit ?? false}
                        onCheckedChange={(checked) =>
                          handleToggle(role, section, "canEdit", !!checked)
                        }
                        disabled={!canEdit || saving === role.id}
                      />
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Create the roles page**

```typescript
// app/(dashboard)/dashboard/railroad/[id]/crew/roles/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLayout } from "@/app/actions/layouts";
import { getRoles } from "@/app/actions/roles";
import { getCrewContext } from "@/lib/crew/context";
import { RolePermissionGrid } from "@/components/crew/role-permission-grid";

export default async function RolesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id } = await params;
  const ctx = await getCrewContext(id);
  if (!ctx) redirect("/dashboard");

  const layout = await getLayout(id);
  const roles = await getRoles(id);
  const canEdit = ctx.isOwner || !!ctx.permissions.crew?.canEdit;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/railroad/${id}/crew`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Roles & Permissions</h1>
            <p className="text-sm text-muted-foreground">{layout.name}</p>
          </div>
        </div>
        {canEdit && (
          <Button asChild>
            <Link href={`/dashboard/railroad/${id}/crew/roles/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Create Role
            </Link>
          </Button>
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        Owner always has full access. Default roles can have permissions edited but cannot be deleted or renamed.
      </div>

      <RolePermissionGrid roles={roles} layoutId={id} canEdit={canEdit} />
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

Navigate to `/dashboard/railroad/{id}/crew/roles`. You should see the permission grid with 4 default roles and 6 sections, each with View/Edit checkboxes. Toggling a checkbox should save immediately.

- [ ] **Step 4: Commit**

```bash
git add components/crew/role-permission-grid.tsx "app/(dashboard)/dashboard/railroad/[id]/crew/roles/page.tsx"
git commit -m "feat(crew): add roles & permissions page with editable grid"
```

---

## Task 19: Create Role Page + Form

**Files:**
- Create: `components/crew/role-form.tsx`
- Create: `app/(dashboard)/dashboard/railroad/[id]/crew/roles/new/page.tsx`
- Create: `app/(dashboard)/dashboard/railroad/[id]/crew/roles/[roleId]/page.tsx`

- [ ] **Step 1: Create the role form component**

```typescript
// components/crew/role-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CREW_SECTIONS, SECTION_LABELS, type CrewSection } from "@/lib/crew/permissions";
import { createRole, updateRole, deleteRole } from "@/app/actions/roles";
import { toast } from "sonner";

interface Permission {
  section: string;
  canView: boolean;
  canEdit: boolean;
}

interface RoleFormProps {
  layoutId: string;
  mode: "create" | "edit";
  roleId?: string;
  initialName?: string;
  initialPermissions?: Permission[];
  isDefault?: boolean;
  memberCount?: number;
  otherRoles?: { id: string; name: string }[];
}

export function RoleForm({
  layoutId,
  mode,
  roleId,
  initialName = "",
  initialPermissions,
  isDefault = false,
  memberCount = 0,
  otherRoles = [],
}: RoleFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [permissions, setPermissions] = useState<Permission[]>(
    initialPermissions ||
      CREW_SECTIONS.map((s) => ({ section: s, canView: true, canEdit: false }))
  );
  const [loading, setLoading] = useState(false);
  const [reassignRoleId, setReassignRoleId] = useState(otherRoles[0]?.id || "");

  function togglePerm(section: string, field: "canView" | "canEdit", value: boolean) {
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.section !== section) return p;
        const updated = { ...p, [field]: value };
        if (field === "canEdit" && value) updated.canView = true;
        if (field === "canView" && !value) updated.canEdit = false;
        return updated;
      })
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (mode === "create") {
      const result = await createRole({ layoutId, name, permissions });
      if (result.error) {
        toast.error(result.error);
        setLoading(false);
        return;
      }
      toast.success("Role created");
    } else if (roleId) {
      const result = await updateRole({
        roleId,
        layoutId,
        name: isDefault ? undefined : name,
        permissions,
      });
      if (result.error) {
        toast.error(result.error);
        setLoading(false);
        return;
      }
      toast.success("Role updated");
    }

    router.push(`/dashboard/railroad/${layoutId}/crew/roles`);
  }

  async function handleDelete() {
    if (!roleId) return;
    setLoading(true);

    const result = await deleteRole({
      roleId,
      layoutId,
      reassignToRoleId: memberCount > 0 ? reassignRoleId : undefined,
    });

    if (result.error) {
      toast.error(result.error);
      setLoading(false);
      return;
    }

    toast.success("Role deleted");
    router.push(`/dashboard/railroad/${layoutId}/crew/roles`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      <div className="space-y-2">
        <Label htmlFor="name">Role Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isDefault}
          required
        />
        {isDefault && (
          <p className="text-xs text-muted-foreground">Default roles cannot be renamed.</p>
        )}
      </div>

      <div className="space-y-3">
        <Label>Permissions</Label>
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium text-xs uppercase text-muted-foreground">
                  Section
                </th>
                <th className="text-center p-3 font-medium text-xs uppercase text-muted-foreground">
                  View
                </th>
                <th className="text-center p-3 font-medium text-xs uppercase text-muted-foreground">
                  Edit
                </th>
              </tr>
            </thead>
            <tbody>
              {CREW_SECTIONS.map((section) => {
                const perm = permissions.find((p) => p.section === section);
                return (
                  <tr key={section} className="border-b last:border-0">
                    <td className="p-3">{SECTION_LABELS[section as CrewSection]}</td>
                    <td className="p-3 text-center">
                      <Checkbox
                        checked={perm?.canView ?? false}
                        onCheckedChange={(checked) =>
                          togglePerm(section, "canView", !!checked)
                        }
                      />
                    </td>
                    <td className="p-3 text-center">
                      <Checkbox
                        checked={perm?.canEdit ?? false}
                        onCheckedChange={(checked) =>
                          togglePerm(section, "canEdit", !!checked)
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : mode === "create" ? "Create Role" : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/dashboard/railroad/${layoutId}/crew/roles`)}
        >
          Cancel
        </Button>
      </div>

      {/* Delete section for non-default roles in edit mode */}
      {mode === "edit" && !isDefault && (
        <div className="pt-6 border-t space-y-4">
          <h3 className="font-medium text-destructive">Delete Role</h3>
          {memberCount > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                This role has {memberCount} active member{memberCount !== 1 ? "s" : ""}.
                Reassign them to:
              </p>
              <select
                className="border rounded px-3 py-2 text-sm bg-background"
                value={reassignRoleId}
                onChange={(e) => setReassignRoleId(e.target.value)}
              >
                {otherRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            Delete Role
          </Button>
        </div>
      )}
    </form>
  );
}
```

- [ ] **Step 2: Create the new role page**

```typescript
// app/(dashboard)/dashboard/railroad/[id]/crew/roles/new/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLayout } from "@/app/actions/layouts";
import { requirePermission } from "@/lib/crew/context";
import { RoleForm } from "@/components/crew/role-form";

export default async function NewRolePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id } = await params;
  await requirePermission(id, "crew", "edit");
  const layout = await getLayout(id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/railroad/${id}/crew/roles`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create Role</h1>
          <p className="text-sm text-muted-foreground">{layout.name}</p>
        </div>
      </div>

      <RoleForm layoutId={id} mode="create" />
    </div>
  );
}
```

- [ ] **Step 3: Create the edit role page**

```typescript
// app/(dashboard)/dashboard/railroad/[id]/crew/roles/[roleId]/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLayout } from "@/app/actions/layouts";
import { getRole, getRoles } from "@/app/actions/roles";
import { requirePermission } from "@/lib/crew/context";
import { RoleForm } from "@/components/crew/role-form";

export default async function EditRolePage({
  params,
}: {
  params: Promise<{ id: string; roleId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id, roleId } = await params;
  await requirePermission(id, "crew", "edit");
  const layout = await getLayout(id);
  const role = await getRole(roleId, id);
  if (!role) redirect(`/dashboard/railroad/${id}/crew/roles`);

  const allRoles = await getRoles(id);
  const otherRoles = allRoles
    .filter((r) => r.id !== roleId)
    .map((r) => ({ id: r.id, name: r.name }));

  const memberCount = await (await import("@/lib/db")).db.crewMember.count({
    where: { roleId, layoutId: id, removedAt: null },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/railroad/${id}/crew/roles`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Role: {role.name}</h1>
          <p className="text-sm text-muted-foreground">{layout.name}</p>
        </div>
      </div>

      <RoleForm
        layoutId={id}
        mode="edit"
        roleId={role.id}
        initialName={role.name}
        initialPermissions={role.permissions.map((p) => ({
          section: p.section,
          canView: p.canView,
          canEdit: p.canEdit,
        }))}
        isDefault={role.isDefault}
        memberCount={memberCount}
        otherRoles={otherRoles}
      />
    </div>
  );
}
```

- [ ] **Step 4: Verify in browser**

Navigate to `/dashboard/railroad/{id}/crew/roles/new`. Create a custom role with a name and permissions. Verify it appears on the roles page. Click it to edit. Verify default roles show the disabled name field.

- [ ] **Step 5: Commit**

```bash
git add components/crew/role-form.tsx "app/(dashboard)/dashboard/railroad/[id]/crew/roles/new/page.tsx" "app/(dashboard)/dashboard/railroad/[id]/crew/roles/[roleId]/page.tsx"
git commit -m "feat(crew): add create and edit role pages with permission form"
```

---

## Task 20: Remove Member Page

**Files:**
- Create: `components/crew/remove-member-form.tsx`
- Create: `app/(dashboard)/dashboard/railroad/[id]/crew/[memberId]/remove/page.tsx`

- [ ] **Step 1: Create the remove member form**

```typescript
// components/crew/remove-member-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { removeCrewMember } from "@/app/actions/crew";
import { toast } from "sonner";

interface RemoveMemberFormProps {
  layoutId: string;
  memberId: string;
  memberName: string;
  transferTargets: { id: string; name: string }[];
}

export function RemoveMemberForm({
  layoutId,
  memberId,
  memberName,
  transferTargets,
}: RemoveMemberFormProps) {
  const router = useRouter();
  const [transferTo, setTransferTo] = useState(transferTargets[0]?.id || "");
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    setLoading(true);
    const result = await removeCrewMember({
      layoutId,
      memberId,
      transferToUserId: transferTo || undefined,
    });

    if (result.error) {
      toast.error(result.error);
      setLoading(false);
      return;
    }

    toast.success(`${memberName} has been removed`);
    router.push(`/dashboard/railroad/${layoutId}/crew`);
  }

  return (
    <div className="space-y-6 max-w-md">
      <div className="p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
        <p className="text-sm">
          This will immediately revoke <strong>{memberName}</strong>&apos;s access to this railroad.
        </p>
      </div>

      {transferTargets.length > 0 && (
        <div className="space-y-2">
          <Label>Transfer content to</Label>
          <Select value={transferTo} onValueChange={setTransferTo}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {transferTargets.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="destructive"
          onClick={handleRemove}
          disabled={loading}
        >
          {loading ? "Removing..." : "Remove & Transfer"}
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/railroad/${layoutId}/crew`)}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the remove member page**

```typescript
// app/(dashboard)/dashboard/railroad/[id]/crew/[memberId]/remove/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { getLayout } from "@/app/actions/layouts";
import { requirePermission } from "@/lib/crew/context";
import { RemoveMemberForm } from "@/components/crew/remove-member-form";

export default async function RemoveMemberPage({
  params,
}: {
  params: Promise<{ id: string; memberId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id, memberId } = await params;
  await requirePermission(id, "crew", "edit");
  const layout = await getLayout(id);

  const member = await db.crewMember.findFirst({
    where: { id: memberId, layoutId: id, removedAt: null },
    include: {
      user: { select: { id: true, name: true, email: true } },
      role: { select: { name: true } },
    },
  });

  if (!member) redirect(`/dashboard/railroad/${id}/crew`);

  // Build transfer target list: owner + other active members
  const otherMembers = await db.crewMember.findMany({
    where: { layoutId: id, removedAt: null, id: { not: memberId } },
    include: { user: { select: { id: true, name: true } } },
  });

  const transferTargets = [
    { id: layout.userId, name: `${session.user.name || "Owner"} (Owner)` },
    ...otherMembers.map((m) => ({
      id: m.user.id,
      name: m.user.name || m.user.id,
    })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/railroad/${id}/crew`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Remove Crew Member</h1>
          <p className="text-sm text-muted-foreground">
            {member.user.name || member.user.email} — {member.role.name}
          </p>
        </div>
      </div>

      <RemoveMemberForm
        layoutId={id}
        memberId={memberId}
        memberName={member.user.name || member.user.email}
        transferTargets={transferTargets}
      />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/crew/remove-member-form.tsx "app/(dashboard)/dashboard/railroad/[id]/crew/[memberId]/remove/page.tsx"
git commit -m "feat(crew): add remove member page with content transfer"
```

---

## Task 21: Invite Accept Pages

**Files:**
- Create: `app/(invite)/layout.tsx`
- Create: `app/(invite)/invite/[code]/page.tsx`
- Create: `app/(invite)/invite/accept/[token]/page.tsx`
- Create: `components/crew/accept-invite-button.tsx`

- [ ] **Step 1: Create the invite route group layout**

```typescript
// app/(invite)/layout.tsx
export default function InviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Create the accept invite button component**

```typescript
// components/crew/accept-invite-button.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { joinViaInviteLink } from "@/app/actions/invite-links";
import { acceptEmailInvite } from "@/app/actions/crew";
import { toast } from "sonner";

interface AcceptInviteButtonProps {
  type: "link" | "email";
  code?: string;
  token?: string;
}

export function AcceptInviteButton({ type, code, token }: AcceptInviteButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleAccept() {
    setLoading(true);

    if (type === "link" && code) {
      const result = await joinViaInviteLink(code);
      if (result.error) {
        toast.error(result.error);
        setLoading(false);
        return;
      }
      toast.success(`Joined ${result.railroadName}!`);
      router.push(`/dashboard/railroad/${result.layoutId}`);
    } else if (type === "email" && token) {
      const result = await acceptEmailInvite(token);
      if (result.error) {
        toast.error(result.error);
        setLoading(false);
        return;
      }
      toast.success("Invitation accepted!");
      router.push(`/dashboard/railroad/${result.layoutId}`);
    }
  }

  return (
    <Button onClick={handleAccept} disabled={loading} className="w-full">
      {loading ? "Joining..." : "Join Railroad"}
    </Button>
  );
}
```

- [ ] **Step 3: Create the invite link accept page**

```typescript
// app/(invite)/invite/[code]/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getInviteLinkInfo } from "@/app/actions/invite-links";
import { AcceptInviteButton } from "@/components/crew/accept-invite-button";

export default async function InviteLinkPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const info = await getInviteLinkInfo(code);

  if (!info) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Invalid Invite Link</h1>
        <p className="text-muted-foreground">This invite link is invalid or has been revoked.</p>
        <Button asChild>
          <Link href="/auth/login">Go to Login</Link>
        </Button>
      </div>
    );
  }

  if (info.paused || info.expired || info.maxedOut) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Invite Unavailable</h1>
        <p className="text-muted-foreground">
          {info.paused && "This invite link is currently paused."}
          {info.expired && "This invite link has expired."}
          {info.maxedOut && "This invite link has reached its maximum uses."}
        </p>
      </div>
    );
  }

  const session = await auth();

  if (!session) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Join {info.railroadName}</h1>
        <p className="text-muted-foreground">
          You&apos;ve been invited to join as a <strong>{info.roleName}</strong>.
        </p>
        <p className="text-sm text-muted-foreground">Log in or create an account to accept.</p>
        <div className="flex flex-col gap-2">
          <Button asChild>
            <Link href={`/auth/login?callbackUrl=/invite/${code}`}>Log In</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/auth/register?callbackUrl=/invite/${code}`}>Create Account</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center space-y-4">
      <h1 className="text-2xl font-bold">Join {info.railroadName}</h1>
      <p className="text-muted-foreground">
        You&apos;ve been invited to join as a <strong>{info.roleName}</strong>.
      </p>
      {info.creatorName && (
        <p className="text-sm text-muted-foreground">Invited by {info.creatorName}</p>
      )}
      <AcceptInviteButton type="link" code={code} />
    </div>
  );
}
```

- [ ] **Step 4: Create the email invite accept page**

```typescript
// app/(invite)/invite/accept/[token]/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getInviteInfo } from "@/app/actions/crew";
import { AcceptInviteButton } from "@/components/crew/accept-invite-button";

export default async function AcceptEmailInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const info = await getInviteInfo(token);

  if (!info) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Invalid Invitation</h1>
        <p className="text-muted-foreground">
          This invitation is invalid or has expired.
        </p>
        <Button asChild>
          <Link href="/auth/login">Go to Login</Link>
        </Button>
      </div>
    );
  }

  if (info.alreadyAccepted) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Already Accepted</h1>
        <p className="text-muted-foreground">
          You&apos;ve already accepted this invitation.
        </p>
        <Button asChild>
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const session = await auth();

  if (!session) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Join {info.railroadName}</h1>
        <p className="text-muted-foreground">
          {info.inviterName || "Someone"} invited you to join as a <strong>{info.roleName}</strong>.
        </p>
        <div className="flex flex-col gap-2">
          <Button asChild>
            <Link href={`/auth/login?callbackUrl=/invite/accept/${token}`}>Log In</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/auth/register?callbackUrl=/invite/accept/${token}`}>Create Account</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center space-y-4">
      <h1 className="text-2xl font-bold">Join {info.railroadName}</h1>
      <p className="text-muted-foreground">
        {info.inviterName || "Someone"} invited you to join as a <strong>{info.roleName}</strong>.
      </p>
      <AcceptInviteButton type="email" token={token} />
    </div>
  );
}
```

- [ ] **Step 5: Verify in browser**

Visit `/invite/nonexistent-code` — should show "Invalid Invite Link". The full flow requires creating an invite link first (via the crew page), then visiting the generated URL.

- [ ] **Step 6: Commit**

```bash
git add "app/(invite)" components/crew/accept-invite-button.tsx
git commit -m "feat(crew): add invite accept pages (link and email token)"
```

---

## Task 22: usePermissions Hook

**Files:**
- Create: `hooks/use-permissions.ts`

- [ ] **Step 1: Create the permissions hook**

```typescript
// hooks/use-permissions.ts
"use client";

import { createContext, useContext } from "react";
import type { PermissionMap } from "@/lib/crew/permissions";

interface PermissionsContextValue {
  isOwner: boolean;
  permissions: PermissionMap;
  roleName: string | null;
}

export const PermissionsContext = createContext<PermissionsContextValue>({
  isOwner: true,
  permissions: {},
  roleName: null,
});

export function usePermissions() {
  return useContext(PermissionsContext);
}

export function canView(permissions: PermissionMap, section: string): boolean {
  return permissions[section]?.canView ?? false;
}

export function canEdit(permissions: PermissionMap, section: string): boolean {
  return permissions[section]?.canEdit ?? false;
}
```

This hook is designed to be used with a `PermissionsContext.Provider` wrapping the railroad layout. The provider would be set up in the railroad layout component, passing down the resolved permissions from `getCrewContext()`. This integration with the layout will be done when the existing pages are updated to use permission gating (a follow-up step after the core crew system is working).

- [ ] **Step 2: Commit**

```bash
git add hooks/use-permissions.ts
git commit -m "feat(crew): add usePermissions hook for client-side permission gating"
```

---

## Task 23: End-to-End Verification

- [ ] **Step 1: Verify Prisma schema is clean**

Run:
```bash
npx prisma generate && npx prisma db push
```

Expected: "Your database is now in sync with your Prisma schema."

- [ ] **Step 2: Verify the build passes**

Run:
```bash
npm run build
```

Fix any type errors. Common issues:
- Missing imports
- Type mismatches between server actions and client components (Date vs string serialization)
- Unused imports

- [ ] **Step 3: Manual smoke test**

1. Start dev server: `npm run dev`
2. Navigate to a railroad → Crew page. Verify owner is shown, empty members table, action buttons present.
3. Click "Create Invite Link" → Select a role, create link → Copy the generated link.
4. Open the link in an incognito window → Should see "Join [Railroad Name]" page with login/register options.
5. Click "Manage Roles & Permissions" → Should see the 4 default roles in a grid with checkboxes.
6. Click "Create Role" → Create a custom role → Verify it appears in the grid.
7. Click a role name → Edit page. Toggle some permissions. Verify the save works.
8. Click "Invite Member" → Enter an email + role → Submit. Check that no errors occur (email will only send if SMTP is configured).

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(crew): complete crew foundation - roles, permissions, invites, management UI"
```

---

## Self-Review Results

**Spec coverage:**
- ✅ Data model (Role, RolePermission, InviteLink, CrewMember changes) — Task 1
- ✅ Access control (getCrewContext, requirePermission) — Task 4
- ✅ Middleware update — Task 11
- ✅ Invite system (email + links) — Tasks 8, 10
- ✅ Crew management UI (all pages) — Tasks 13-20
- ✅ Roles & permissions UI — Tasks 18-19
- ✅ Invite accept pages — Task 21
- ✅ Sidebar Crew nav — Task 12
- ✅ usePermissions hook — Task 22
- ✅ Crew limit checking — Task 6
- ✅ Email notifications (invite, role change, removal) — Task 7

**Placeholder scan:** No TBD/TODO/incomplete steps found. One `// TODO` in removeCrewMember for content transfer — this is an acknowledged scope limitation documented inline.

**Type consistency:**
- `CrewSection` type used consistently across permissions.ts, context.ts, roles.ts actions
- `PermissionMap` type consistent between context.ts and use-permissions.ts
- `requirePermission` signature `(layoutId, section, action)` used consistently in all server actions
- Role/CrewMember types match between Prisma schema and server action return types
