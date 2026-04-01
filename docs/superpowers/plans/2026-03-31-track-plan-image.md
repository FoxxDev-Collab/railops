# Track Plan Image Upload + Location Pins — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken custom SVG map editor with image upload + clickable location pins.

**Architecture:** Rip out all canvas/map infrastructure (models, components, actions, routes). Add Vercel Blob for image storage. Add `pinX`/`pinY` fields to `Location`. Build a track plan viewer component with pin overlay and edit mode.

**Tech Stack:** Vercel Blob (`@vercel/blob`), Prisma, Next.js Server Actions, React (client component for pin interaction)

---

### Task 1: Remove Canvas Prisma Models + Relations

**Files:**
- Modify: `prisma/schema.prisma:274` (Layout.canvas relation), `:387-388` (Location.canvasNode, Location.locationCanvas), `:1009-1069` (LayoutCanvas, CanvasNode, CanvasEdge, LocationCanvas models)

- [ ] **Step 1: Remove the canvas relation from Layout model**

In `prisma/schema.prisma`, in the `Layout` model (line ~274), delete:
```prisma
  canvas          LayoutCanvas?
```

- [ ] **Step 2: Remove canvas relations from Location model**

In the `Location` model (lines ~387-388), delete:
```prisma
  canvasNode          CanvasNode?
  locationCanvas      LocationCanvas?
```

- [ ] **Step 3: Delete all four canvas models**

Delete the entire `// CANVAS / MAP EDITOR` section (lines ~1009-1069):
```prisma
model LayoutCanvas { ... }
model CanvasNode { ... }
model CanvasEdge { ... }
model LocationCanvas { ... }
```

- [ ] **Step 4: Add pinX/pinY to Location model**

In the `Location` model, after the `sortOrder` field (line ~374), add:
```prisma
  pinX         Float?
  pinY         Float?
```

- [ ] **Step 5: Push schema changes**

Run: `npx prisma db push`
Expected: Schema synced, no errors. The four canvas tables are dropped, Location gets two new nullable float columns.

- [ ] **Step 6: Regenerate Prisma client**

Run: `npx prisma generate`
Expected: Success, client updated.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: remove canvas models, add pinX/pinY to Location"
```

---

### Task 2: Delete Map Editor Files + Actions

**Files:**
- Delete: `components/map/` (entire directory — 30+ files)
- Delete: `app/(dashboard)/dashboard/railroad/[id]/map/page.tsx`
- Delete: `app/actions/canvas.ts`
- Delete: `app/actions/yard-canvas.ts`
- Modify: `components/layout/app-sidebar.tsx` (remove Map nav item)

- [ ] **Step 1: Delete the map components directory**

```bash
rm -rf components/map/
```

- [ ] **Step 2: Delete the map route page**

```bash
rm -rf "app/(dashboard)/dashboard/railroad/[id]/map/"
```

- [ ] **Step 3: Delete canvas server actions**

```bash
rm app/actions/canvas.ts app/actions/yard-canvas.ts
```

- [ ] **Step 4: Remove Map from sidebar navigation**

In `components/layout/app-sidebar.tsx`, remove the `Map` import from lucide-react (line ~24):
```typescript
  Map,
```

And remove the Map menu item from the `menuItems` array (lines ~61-63):
```typescript
      href: `/dashboard/railroad/${railroadId}/map`,
      label: "Map",
      icon: Map,
```

Remove the entire object containing those lines (the `{ href, label, icon }` entry for Map).

- [ ] **Step 5: Verify build compiles**

Run: `npx next build`
Expected: No compilation errors referencing canvas/map imports. If there are broken imports elsewhere, fix them (grep for `canvas`, `map-editor`, `use-map-store`, `getCanvasData`, `saveCanvasData`).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: remove map editor components, routes, and actions"
```

---

### Task 3: Remove Unused Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Check for xyflow usage outside map**

```bash
grep -r "@xyflow" --include="*.ts" --include="*.tsx" -l
```

Expected: No results (was only used by map editor, now deleted). If results appear, skip this removal.

- [ ] **Step 2: Remove @xyflow/react**

```bash
npm uninstall @xyflow/react
```

- [ ] **Step 3: Check for zustand usage outside map**

```bash
grep -r "zustand\|from.*zustand\|create(" --include="*.ts" --include="*.tsx" -l
```

If zustand is used elsewhere, keep it. If only map stores used it, remove it:
```bash
npm uninstall zustand
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove unused xyflow dependency"
```

---

### Task 4: Install Vercel Blob + Add Upload Server Action

**Files:**
- Create: `app/actions/track-plan.ts`
- Modify: `package.json` (add `@vercel/blob`)

- [ ] **Step 1: Install @vercel/blob**

```bash
npm install @vercel/blob
```

- [ ] **Step 2: Create the track plan server actions**

Create `app/actions/track-plan.ts`:

```typescript
"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { put, del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}

async function requireLayoutOwner(layoutId: string, userId: string) {
  const layout = await db.layout.findFirst({
    where: { id: layoutId, userId },
  });
  if (!layout) {
    throw new Error("Layout not found");
  }
  return layout;
}

export async function uploadTrackPlanImage(layoutId: string, formData: FormData) {
  const session = await requireAuth();
  const layout = await requireLayoutOwner(layoutId, session.user.id);

  const file = formData.get("file") as File | null;
  if (!file) {
    return { error: "No file provided" };
  }

  // Validate file type
  const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return { error: "Only PNG, JPG, and WebP images are accepted" };
  }

  // Validate file size (10MB)
  if (file.size > 10 * 1024 * 1024) {
    return { error: "Image must be under 10MB" };
  }

  // Delete old image if exists
  if (layout.imageUrl) {
    try {
      await del(layout.imageUrl);
    } catch {
      // Old blob may not exist, continue
    }
  }

  const blob = await put(`track-plans/${layoutId}/${file.name}`, file, {
    access: "public",
  });

  await db.layout.update({
    where: { id: layoutId },
    data: { imageUrl: blob.url },
  });

  revalidatePath(`/dashboard/railroad/${layoutId}`);
  revalidatePath(`/dashboard/railroad/${layoutId}/settings`);
  return { success: true, imageUrl: blob.url };
}

export async function removeTrackPlanImage(layoutId: string) {
  const session = await requireAuth();
  const layout = await requireLayoutOwner(layoutId, session.user.id);

  if (layout.imageUrl) {
    try {
      await del(layout.imageUrl);
    } catch {
      // Blob may not exist
    }
  }

  await db.layout.update({
    where: { id: layoutId },
    data: { imageUrl: null },
  });

  revalidatePath(`/dashboard/railroad/${layoutId}`);
  revalidatePath(`/dashboard/railroad/${layoutId}/settings`);
  return { success: true };
}

const pinSchema = z.array(
  z.object({
    locationId: z.string(),
    pinX: z.number().min(0).max(1).nullable(),
    pinY: z.number().min(0).max(1).nullable(),
  })
);

export async function updateLocationPins(
  layoutId: string,
  pins: z.infer<typeof pinSchema>
) {
  const session = await requireAuth();
  await requireLayoutOwner(layoutId, session.user.id);

  const validated = pinSchema.safeParse(pins);
  if (!validated.success) {
    return { error: "Invalid pin data" };
  }

  // Batch update all pins in a transaction
  await db.$transaction(
    validated.data.map((pin) =>
      db.location.update({
        where: { id: pin.locationId },
        data: { pinX: pin.pinX, pinY: pin.pinY },
      })
    )
  );

  revalidatePath(`/dashboard/railroad/${layoutId}`);
  return { success: true };
}
```

- [ ] **Step 3: Commit**

```bash
git add app/actions/track-plan.ts package.json package-lock.json
git commit -m "feat: add track plan image upload and location pin server actions"
```

---

### Task 5: Build Track Plan Image Upload Component

**Files:**
- Create: `components/track-plan/image-upload.tsx`

- [ ] **Step 1: Create the image upload drop zone component**

Create `components/track-plan/image-upload.tsx`:

```typescript
"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { uploadTrackPlanImage, removeTrackPlanImage } from "@/app/actions/track-plan";
import Image from "next/image";

interface ImageUploadProps {
  layoutId: string;
  currentImageUrl: string | null;
}

export function TrackPlanImageUpload({ layoutId, currentImageUrl }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [imageUrl, setImageUrl] = useState(currentImageUrl);

  const handleUpload = useCallback(
    async (file: File) => {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const result = await uploadTrackPlanImage(layoutId, formData);
      if (result.error) {
        toast.error(result.error);
      } else if (result.imageUrl) {
        setImageUrl(result.imageUrl);
        toast.success("Track plan uploaded");
      }
      setIsUploading(false);
    },
    [layoutId]
  );

  const handleRemove = async () => {
    const result = await removeTrackPlanImage(layoutId);
    if (result.error) {
      toast.error(result.error);
    } else {
      setImageUrl(null);
      toast.success("Track plan removed");
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  if (imageUrl) {
    return (
      <div className="space-y-3">
        <label className="text-sm font-medium">Track Plan</label>
        <div className="relative rounded-lg border overflow-hidden bg-muted/50">
          <Image
            src={imageUrl}
            alt="Track plan"
            width={800}
            height={400}
            className="w-full h-auto max-h-64 object-contain"
            unoptimized
          />
          <div className="absolute top-2 right-2 flex gap-2">
            <label>
              <Button variant="secondary" size="sm" asChild>
                <span>
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Replace
                </span>
              </Button>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={handleFileSelect}
              />
            </label>
            <Button variant="destructive" size="sm" onClick={handleRemove}>
              <X className="h-3.5 w-3.5 mr-1.5" />
              Remove
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Track Plan</label>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
      >
        <ImageIcon className="h-10 w-10 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium">
            {isUploading ? "Uploading..." : "Drop your track plan image here"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PNG, JPG, or WebP up to 10MB
          </p>
        </div>
        <Button variant="outline" size="sm" disabled={isUploading}>
          <Upload className="h-3.5 w-3.5 mr-1.5" />
          Browse Files
        </Button>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={handleFileSelect}
          disabled={isUploading}
        />
      </label>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/track-plan/image-upload.tsx
git commit -m "feat: add track plan image upload drop zone component"
```

---

### Task 6: Add Image Upload to Settings Page

**Files:**
- Modify: `app/(dashboard)/dashboard/railroad/[id]/settings/page.tsx`

- [ ] **Step 1: Add the upload component to the settings page**

In `app/(dashboard)/dashboard/railroad/[id]/settings/page.tsx`, add the import at the top:

```typescript
import { TrackPlanImageUpload } from "@/components/track-plan/image-upload";
```

Then after the `<LayoutForm>` closing tag (inside the `max-w-2xl` div), add:

```tsx
        <div className="mt-6">
          <TrackPlanImageUpload
            layoutId={id}
            currentImageUrl={layout.imageUrl}
          />
        </div>
```

- [ ] **Step 2: Commit**

```bash
git add "app/(dashboard)/dashboard/railroad/[id]/settings/page.tsx"
git commit -m "feat: add track plan upload to railroad settings page"
```

---

### Task 7: Build Track Plan Viewer with Location Pins

**Files:**
- Create: `components/track-plan/track-plan-viewer.tsx`

- [ ] **Step 1: Create the track plan viewer component**

Create `components/track-plan/track-plan-viewer.tsx`:

```typescript
"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Pencil, Check, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { updateLocationPins } from "@/app/actions/track-plan";

interface LocationPin {
  id: string;
  name: string;
  code: string;
  pinX: number | null;
  pinY: number | null;
}

interface TrackPlanViewerProps {
  layoutId: string;
  imageUrl: string;
  locations: LocationPin[];
}

export function TrackPlanViewer({
  layoutId,
  imageUrl,
  locations,
}: TrackPlanViewerProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [pins, setPins] = useState<LocationPin[]>(locations);
  const [pendingClick, setPendingClick] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const pinnedLocations = pins.filter((l) => l.pinX !== null && l.pinY !== null);
  const unpinnedLocations = pins.filter((l) => l.pinX === null || l.pinY === null);

  const getRelativeCoords = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  const handleImageClick = (e: React.MouseEvent) => {
    if (!editing || dragging) return;
    const coords = getRelativeCoords(e);
    if (!coords) return;

    if (unpinnedLocations.length === 0) {
      toast.info("All locations are pinned");
      return;
    }

    setPendingClick(coords);
  };

  const assignLocation = (locationId: string) => {
    if (!pendingClick) return;
    setPins((prev) =>
      prev.map((l) =>
        l.id === locationId
          ? { ...l, pinX: pendingClick.x, pinY: pendingClick.y }
          : l
      )
    );
    setPendingClick(null);
  };

  const removePin = (locationId: string) => {
    setPins((prev) =>
      prev.map((l) =>
        l.id === locationId ? { ...l, pinX: null, pinY: null } : l
      )
    );
  };

  const handleDragStart = (locationId: string) => {
    if (!editing) return;
    setDragging(locationId);
  };

  const handleDragMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !editing) return;
      const coords = getRelativeCoords(e);
      if (!coords) return;
      setPins((prev) =>
        prev.map((l) =>
          l.id === dragging ? { ...l, pinX: coords.x, pinY: coords.y } : l
        )
      );
    },
    [dragging, editing]
  );

  const handleDragEnd = () => {
    setDragging(null);
  };

  const handleSave = async () => {
    const pinData = pins.map((l) => ({
      locationId: l.id,
      pinX: l.pinX,
      pinY: l.pinY,
    }));
    const result = await updateLocationPins(layoutId, pinData);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Pins saved");
      setEditing(false);
      router.refresh();
    }
  };

  const handleCancel = () => {
    setPins(locations); // Reset to original
    setPendingClick(null);
    setEditing(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Track Plan
        </h2>
        {editing ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              <X className="h-3.5 w-3.5 mr-1.5" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Save Pins
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Edit Pins
          </Button>
        )}
      </div>

      <div
        ref={containerRef}
        className={`relative rounded-lg border overflow-hidden bg-muted/50 select-none ${
          editing ? "cursor-crosshair" : ""
        }`}
        onClick={handleImageClick}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        <Image
          src={imageUrl}
          alt="Track plan"
          width={1200}
          height={800}
          className="w-full h-auto"
          unoptimized
          draggable={false}
        />

        {/* Render pins */}
        {pinnedLocations.map((loc) => (
          <div
            key={loc.id}
            className={`absolute -translate-x-1/2 -translate-y-full group ${
              editing ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
            }`}
            style={{
              left: `${(loc.pinX ?? 0) * 100}%`,
              top: `${(loc.pinY ?? 0) * 100}%`,
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              if (editing) handleDragStart(loc.id);
              else router.push(`/dashboard/railroad/${layoutId}/locations`);
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold bg-background/90 backdrop-blur-sm px-1.5 py-0.5 rounded shadow-sm border mb-0.5 whitespace-nowrap">
                {loc.code}
              </span>
              <MapPin className="h-6 w-6 text-primary drop-shadow-md" fill="currentColor" />
              {editing && (
                <button
                  className="absolute -top-1 -right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive text-destructive-foreground rounded-full p-0.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    removePin(loc.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Pending click — location selector */}
        {pendingClick && (
          <div
            className="absolute z-10 -translate-x-1/2"
            style={{
              left: `${pendingClick.x * 100}%`,
              top: `${pendingClick.y * 100}%`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-background border rounded-lg shadow-lg p-2 mt-2 min-w-[180px]">
              <Select onValueChange={assignLocation}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select location..." />
                </SelectTrigger>
                <SelectContent>
                  {unpinnedLocations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.code} — {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-1 h-7 text-xs"
                onClick={() => setPendingClick(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {editing && unpinnedLocations.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Click on the image to place a pin. {unpinnedLocations.length} location{unpinnedLocations.length !== 1 ? "s" : ""} remaining.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/track-plan/track-plan-viewer.tsx
git commit -m "feat: add track plan viewer with draggable location pins"
```

---

### Task 8: Add Track Plan Viewer to Railroad Detail Page

**Files:**
- Modify: `app/(dashboard)/dashboard/railroad/[id]/page.tsx`

- [ ] **Step 1: Update the railroad detail page to show the track plan**

In `app/(dashboard)/dashboard/railroad/[id]/page.tsx`, add the import:

```typescript
import { TrackPlanViewer } from "@/components/track-plan/track-plan-viewer";
```

Then after the quick stats grid and before the section cards grid, add:

```tsx
      {/* Track plan */}
      {layout.imageUrl && (
        <TrackPlanViewer
          layoutId={id}
          imageUrl={layout.imageUrl}
          locations={layout.locations.map((l) => ({
            id: l.id,
            name: l.name,
            code: l.code,
            pinX: l.pinX,
            pinY: l.pinY,
          }))}
        />
      )}
```

- [ ] **Step 2: Update getLayout to include pinX/pinY in location select**

In `app/actions/layouts.ts`, the `getLayout` function's `locations` include already selects all fields (no explicit `select`, just `include: { industries, yardTracks }`), so `pinX` and `pinY` are already included automatically since they're direct fields on `Location`. No change needed.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/dashboard/railroad/[id]/page.tsx"
git commit -m "feat: show track plan with location pins on railroad detail page"
```

---

### Task 9: Update Sidebar — Replace Map Link with Track Plan

**Files:**
- Modify: `components/layout/app-sidebar.tsx`

- [ ] **Step 1: Replace the Map sidebar item with Track Plan**

The Map item was already removed in Task 2. The track plan is now accessed from the railroad detail page directly (it's displayed inline, not a separate route). No sidebar entry needed.

If the user navigates via the sidebar "Overview" or the railroad name, they'll see the track plan on the detail page. No additional sidebar changes needed.

- [ ] **Step 2: Verify sidebar compiles**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 3: Commit (skip if no changes)**

No changes needed for this task — the Map removal was handled in Task 2.

---

### Task 10: Configure Next.js for Vercel Blob Image Domain

**Files:**
- Modify: `next.config.ts` (or `next.config.mjs`)

- [ ] **Step 1: Check current next config**

Read `next.config.ts` to see existing image config.

- [ ] **Step 2: Add Vercel Blob hostname to images config**

Vercel Blob URLs come from `*.public.blob.vercel-storage.com`. Add this to the Next.js images config:

```typescript
images: {
  remotePatterns: [
    {
      protocol: "https",
      hostname: "*.public.blob.vercel-storage.com",
    },
  ],
},
```

If the file already has an `images` config, merge into it.

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git commit -m "feat: allow Vercel Blob images in Next.js image config"
```

---

### Task 11: Final Build Verification + Cleanup

**Files:**
- Various (any remaining broken imports)

- [ ] **Step 1: Full grep for stale references**

```bash
grep -r "canvas\|CanvasNode\|CanvasEdge\|LayoutCanvas\|LocationCanvas\|map-editor\|use-map-store\|getCanvasData\|saveCanvasData\|yard-canvas" --include="*.ts" --include="*.tsx" -l
```

Fix any remaining broken imports by removing the dead references.

- [ ] **Step 2: Build the project**

Run: `npm run build`
Expected: Clean build with no errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: No new lint errors.

- [ ] **Step 4: Commit any cleanup**

```bash
git add -A
git commit -m "chore: clean up stale canvas/map references"
```
