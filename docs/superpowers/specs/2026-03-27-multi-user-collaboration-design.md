# Multi-User Collaboration Design Spec

## Overview

Add multi-user crew management and real-time collaboration to RailOps, enabling model railroad clubs and groups to collaboratively build layouts and run operating sessions with role-based access control.

## Goals

- Railroad owners can invite crew members via email or shareable links
- Custom roles with per-section permissions (View/Edit) control access
- Real-time presence and broadcast via Liveblocks (hybrid approach — data stays in server actions)
- Operating sessions support role-scoped views (Dispatcher full board, Conductor "My Work")
- Crew seats billed per active member on the Operator plan ($5/seat/mo)

## Architecture Approach

**Hybrid Liveblocks integration:** Liveblocks handles only presence (who's online, what they're viewing) and broadcast (notify clients to refetch after mutations). All data reads and writes remain in server actions via Prisma. This avoids vendor lock-in on data storage while getting the hardest real-time features (presence, awareness) for free. If richer real-time features are needed later, Liveblocks storage can be selectively adopted per-feature.

---

## 1. Data Model

### New Models

**Role** — Custom and default roles per railroad.

```prisma
model Role {
  id          String           @id @default(cuid())
  layoutId    String
  name        String
  isDefault   Boolean          @default(false)
  permissions RolePermission[]
  members     CrewMember[]
  inviteLinks InviteLink[]
  layout      Layout           @relation(fields: [layoutId], references: [id], onDelete: Cascade)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  @@unique([layoutId, name])
}
```

Each railroad gets four default roles seeded on creation: Dispatcher, Yardmaster, Conductor, Viewer. Default roles can have permissions edited but cannot be deleted or renamed. Owners can create additional custom roles.

**RolePermission** — Maps roles to section-level access.

```prisma
model RolePermission {
  id      String  @id @default(cuid())
  roleId  String
  section String  // "locations", "rolling_stock", "trains", "waybills", "sessions", "crew"
  canView Boolean @default(true)
  canEdit Boolean @default(false)
  role    Role    @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@unique([roleId, section])
}
```

Sections: `locations` (locations, industries, yard tracks), `rolling_stock` (locomotives, freight cars, passenger cars, MOW, cabooses), `trains` (trains, consists, stops), `waybills` (waybills, car cards), `sessions` (operating sessions, switch lists), `crew` (crew member management).

**InviteLink** — Shareable join codes.

```prisma
model InviteLink {
  id        String    @id @default(cuid())
  layoutId  String
  code      String    @unique @default(cuid())
  roleId    String
  maxUses   Int?
  uses      Int       @default(0)
  expiresAt DateTime?
  paused    Boolean   @default(false)
  createdBy String
  createdAt DateTime  @default(now())
  layout    Layout    @relation(fields: [layoutId], references: [id], onDelete: Cascade)
  role      Role      @relation(fields: [roleId], references: [id])
  creator   User      @relation(fields: [createdBy], references: [id])
}
```

### Modified Models

**CrewMember** — Replace `role` enum field with `roleId` FK. Add removal tracking.

```prisma
model CrewMember {
  id         String    @id @default(cuid())
  userId     String
  layoutId   String
  roleId     String
  invitedBy  String?
  invitedAt  DateTime  @default(now())
  acceptedAt DateTime?
  removedAt  DateTime?
  removedBy  String?
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  layout     Layout    @relation(fields: [layoutId], references: [id], onDelete: Cascade)
  role       Role      @relation(fields: [roleId], references: [id])

  @@unique([userId, layoutId])
}
```

**Optimistic locking field** — Most models already have `updatedAt @updatedAt`. For optimistic locking, server actions compare the client's known `updatedAt` against the current DB value before writing. No new fields needed on models that already have `updatedAt`.

### Removed

The `CrewRole` enum is removed, replaced by the `Role` model.

---

## 2. Access Control

### Authorization Helpers

**`getCrewContext(layoutId: string)`** — Returns the current user's relationship to a railroad:
- If owner: `{ isOwner: true, permissions: all }`
- If active crew member: `{ isOwner: false, role: Role, permissions: resolved RolePermission map }`
- If no access: `null`

**`requirePermission(layoutId: string, section: string, action: "view" | "edit")`** — Guard for server actions. Checks owner status or crew role permission. Throws consistent `PermissionDeniedError` if unauthorized.

### Enforcement Points

1. **Server actions** — Every mutation action wraps with `requirePermission(layoutId, section, "edit")`. Read actions check `canView`.
2. **Middleware** — When URL contains `/dashboard/railroad/[id]/...`, verify user is owner or active crew member (`acceptedAt` set, `removedAt` null). Redirect unauthorized users to dashboard with error.
3. **Client-side** — `usePermissions()` hook exposes the current user's resolved permissions for the active railroad. Components conditionally render edit UI based on permissions. This is cosmetic — server actions are the real enforcement.

### Permission Resolution

Owner always bypasses all permission checks. For crew members, permissions are read from their role's `RolePermission` records. Missing section entries default to `{ canView: false, canEdit: false }`.

---

## 3. Invite System

### Email Invites

1. Owner enters email + selects role on crew page
2. Server action creates `CrewMember` with `acceptedAt: null` (pending)
3. Email sent via existing SMTP with signed JWT token (payload: `{ crewMemberId, layoutId }`, 7-day expiry)
4. Recipient clicks link:
   - If logged in → accept page showing railroad name, role, inviter → click "Join" → sets `acceptedAt`
   - If no account → redirect to register with invite token preserved → auto-accepts after registration
5. Duplicate invite to same email resends email, doesn't create second record

### Invite Links

1. Owner creates link: selects role, optional max uses, optional expiry
2. `InviteLink` record created with unique `code`
3. URL: `/invite/[code]`
4. Visitor clicks:
   - If logged in → `CrewMember` created with link's role, immediately accepted. Link `uses` incremented.
   - If not logged in → register flow with auto-join
5. Link disabled when `uses >= maxUses` or past `expiresAt` or `paused: true`
6. Owner can pause (disable without deleting), resume, or revoke (delete) links

### Edge Cases

- Can't invite yourself (owner already has full access)
- Can't invite someone who's already an active crew member (show "already a member")
- Can't join via invite link if already a member

---

## 4. Real-Time Collaboration (Liveblocks Hybrid)

### Room Architecture

- **Railroad room:** `railroad:{layoutId}` — joined when user navigates to any railroad page, left on navigation away
- **Session room:** `session:{sessionId}` — joined when entering an operating session, nested within railroad context

### Presence (Liveblocks Presence API)

Each connected user broadcasts:
- Name and avatar
- Current page/section (e.g., "Locations", "Train #4 Switch List")
- Active editing state (e.g., "Editing Location: Springfield Yard")

### Broadcast Events (Liveblocks Broadcast API)

Server actions broadcast typed events after successful mutations:

```typescript
type BroadcastEvent =
  | { type: "record-created"; section: string; id: string; subtype?: string }
  | { type: "record-updated"; section: string; id: string }
  | { type: "record-deleted"; section: string; id: string }
  | { type: "session-state-changed"; sessionId: string }
  | { type: "car-moved"; carId: string; fromId: string; toId: string }
  | { type: "switch-list-completed"; switchListId: string }
```

### Client Reaction

Clients receive broadcast events and invalidate relevant cached data (using React Query / SWR pattern or Next.js revalidation). The broadcast is a "refetch signal," not a data payload.

### Soft Locking + Optimistic Locking

- **Soft lock (presence-based):** When a user opens an edit form, their presence updates to "editing Record X." Other users see a warning banner: "[Name] is currently editing this — changes may conflict." No hard lock — both can edit.
- **Optimistic lock (server-side):** Records carry a `version` field (or `updatedAt` timestamp). On save, server checks if the record was modified since the client loaded it. If conflict: return error, client shows "This record was updated by [Name] — reload to see changes or overwrite."

### Liveblocks Auth

Liveblocks auth endpoint at `/api/liveblocks-auth`. Validates session, checks crew membership for the requested room, returns Liveblocks token with user info for presence display.

---

## 5. Crew Management UI

All pages, no modals.

### Crew Page — `/dashboard/railroad/[id]/crew`

- **Header:** "Crew" title, member count, online count. "Invite Member" and "Create Invite Link" buttons.
- **Online Now section:** Live presence strip showing connected crew members and what page they're viewing.
- **Members table:** Name, email, role (color-coded badge), status (Active/Pending), joined date, actions menu (change role, remove).
- **Invite Links section:** Active links with role assignment, usage count, expiry, and copy/pause/revoke actions.

Owner row shows "Owner" badge with no action menu.

### Roles & Permissions — `/dashboard/railroad/[id]/crew/roles`

- **Role list** with permission grid: sections as rows, roles as columns, View/Edit checkboxes.
- **Create Role** button → dedicated create role page with name field and permission grid.
- **Edit role** → dedicated page. Default roles: permissions editable, name/delete locked. Custom roles: fully editable, deletable (with member reassignment if in use).

### Invite Member — `/dashboard/railroad/[id]/crew/invite`

- Email input, role selector, send button.
- Shows success with "Invitation sent to [email]" confirmation.

### Create Invite Link — `/dashboard/railroad/[id]/crew/invite-link`

- Role selector, optional max uses input, optional expiry date picker.
- On create, shows the generated link with copy button.

### Member Removal — `/dashboard/railroad/[id]/crew/[memberId]/remove`

- Shows member info and their role.
- Lists content created by the member (switch lists, session notes, custom consists).
- Transfer dropdown to reassign content to another member or owner.
- "Remove & Transfer" confirmation button.

### Accept Invite — `/invite/[code]` and `/invite/accept/[token]`

- Public pages (outside dashboard layout).
- Show railroad name, assigned role, inviter name.
- "Join Railroad" button (or redirect to register if not logged in).

### Sidebar Changes

- New "Crew" nav item in railroad navigation section.
- Online presence indicator: small avatar dots or count in the sidebar header showing connected crew members.
- Crew member railroads appear in the railroad switcher tagged with role name (e.g., "Springfield Division · Dispatcher").

---

## 6. Operating Sessions — Role-Scoped Views

### Shared Overview

Available to all connected session members. Shows:
- Full train board with all trains, their status, and assigned crew
- Real-time progress (which stops are complete, which trains are en route)
- Crew member assignments and online status

### Role-Scoped "My Work" View

- **Dispatcher:** Full train board (same as overview) + ability to assign/reassign trains to crew members, start/end session.
- **Yardmaster:** Filtered to their assigned yard. Shows inbound/outbound trains, car inventory, classification work.
- **Conductor:** Filtered to their assigned train(s). Shows switch list with stops, car pickups/setoffs, progress checkboxes. Marks stops as complete in real-time.
- **Viewer:** Read-only version of the shared overview. No action buttons.

### Real-Time Session Flow

1. Dispatcher starts session → all connected crew see session state change
2. Dispatcher assigns trains to crew → crew members see assignments appear in "My Work"
3. Conductor marks a stop complete → broadcast to all → Dispatcher's board updates, Yardmaster sees inbound train
4. Car movements broadcast in real-time → waybill/car card status updates for all viewers

---

## 7. Subscription & Billing

### Plan Limits

- **Free plan:** `maxCrew: 0`. Invite buttons show upgrade prompt. Invite links can't be created.
- **Operator plan:** Unlimited crew, billed at $5/seat/month. Active seat = `CrewMember` with `acceptedAt` set and `removedAt` null. Owner does not count as a seat.

### Stripe Integration

- Crew seat is a separate line item on the Operator subscription with `quantity` = active seat count.
- When crew member accepts invite → increment Stripe subscription quantity.
- When crew member is removed or leaves → decrement quantity.
- Crew page shows billing context: "4 active seats · $20/mo".

### Downgrade Handling

If owner downgrades from Operator to Free:
- Existing crew members are frozen — they cannot access the railroad.
- No data is deleted. Crew member records remain.
- If owner re-upgrades, crew access is automatically restored.

---

## 8. Crew Member Experience

### Joining

1. Receive email invite or click invite link
2. Register (if needed) → auto-join with preserved invite context
3. Accept page shows railroad name, role, inviter → "Join Railroad"
4. Railroad appears in sidebar under same railroad switcher, tagged with role

### Inside a Railroad

- Same navigation structure as owner, but items conditionally shown/hidden based on `canView` permissions
- Edit buttons, "Add" actions, forms hidden where `canEdit` is false
- Subtle role badge in sidebar header
- Online presence showing other crew members

### Leaving

- "Leave Railroad" option on crew page → confirmation → immediate removal
- Same flow as owner-initiated removal but self-triggered

### Notifications (v1 — Email Only)

- Invited to a railroad
- Role changed
- Removed from a railroad
- No in-app notification system in v1

---

## Scope Boundaries

**In scope for this spec:**
- Data model (Role, RolePermission, InviteLink, CrewMember changes)
- Access control layer (getCrewContext, requirePermission, middleware)
- Invite system (email + links)
- Liveblocks integration (presence + broadcast)
- Crew management UI (all pages)
- Soft locking + optimistic locking
- Billing integration (seat counting, Stripe quantity)
- Operating session role-scoped views

**Out of scope / future work:**
- In-app notification system (push, bell icon, notification center)
- Activity feed / audit log per railroad
- Crew member analytics (who's most active, session participation)
- Hard locking (exclusive edit access)
- Offline support / conflict resolution beyond optimistic locking
- Mobile-optimized crew views
