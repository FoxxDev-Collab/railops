# Layout Map Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a visual schematic railroad map editor with location detail views and interactive session display for dispatchers and crew.

**Architecture:** React Flow for the railroad overview canvas (nodes = locations, edges = tracks), Konva for location detail track diagrams, polling API for crew session sync. Four new Prisma models store visual canvas state alongside existing domain models.

**Tech Stack:** React Flow (`@xyflow/react`), Konva (`react-konva` + `konva`), Prisma, Next.js App Router, Server Actions, Zod

---

## File Structure

### New Files

```
prisma/schema.prisma                          — Add 4 new models (LayoutCanvas, CanvasNode, CanvasEdge, LocationCanvas)

app/actions/canvas.ts                         — Server actions for canvas CRUD and auto-save
app/actions/session-display.ts                — Server actions for dispatcher commands

app/(dashboard)/dashboard/railroad/[id]/map/page.tsx  — Map page (server component, data loader)

components/map/map-editor.tsx                 — Top-level client component orchestrating the editor
components/map/map-canvas.tsx                 — React Flow canvas wrapper
components/map/map-toolbar.tsx                — Left toolbar (tool selection, zoom)
components/map/map-properties.tsx             — Right properties panel
components/map/location-node.tsx              — Custom React Flow node for locations
components/map/track-edge.tsx                 — Custom React Flow edge for tracks
components/map/use-map-store.ts               — Zustand store for editor state (tool, selection, undo/redo)
components/map/use-auto-save.ts               — Auto-save hook (debounced server action calls)
components/map/add-location-form.tsx           — Inline form for creating locations from editor
components/map/location-detail-view.tsx        — Konva canvas for yard/station detail
components/map/session-overlay.tsx             — Session display overlay (train markers, banner, dispatcher menu)
components/map/session-poller.tsx              — Polling hook + crew view components

app/api/session/[id]/state/route.ts           — GET endpoint for crew polling
```

### Modified Files

```
prisma/schema.prisma                          — Add relations to Layout and Location models
components/layout/app-sidebar.tsx             — Add "Map" menu item
```

---

## Phase 1: Canvas Foundation

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install React Flow and Konva**

```bash
npm install @xyflow/react react-konva konva zustand
```

React Flow v12 uses the `@xyflow/react` package name. Zustand is for editor state management (tool selection, undo/redo stack).

- [ ] **Step 2: Verify installation**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(map): install react flow, konva, and zustand dependencies"
```

---

### Task 2: Prisma Schema — Canvas Models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the four canvas models to the Prisma schema**

Add to `prisma/schema.prisma` after the existing Location-related models:

```prisma
// ─────────────────────────────────────────────
// CANVAS / MAP EDITOR
// ─────────────────────────────────────────────

model LayoutCanvas {
  id        String   @id @default(cuid())
  layoutId  String   @unique
  layout    Layout   @relation(fields: [layoutId], references: [id], onDelete: Cascade)
  viewport  Json     @default("{\"x\":0,\"y\":0,\"zoom\":1}")
  gridSize  Int      @default(20)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  nodes CanvasNode[]
  edges CanvasEdge[]
}

model CanvasNode {
  id         String       @id @default(cuid())
  canvasId   String
  canvas     LayoutCanvas @relation(fields: [canvasId], references: [id], onDelete: Cascade)
  locationId String       @unique
  location   Location     @relation(fields: [locationId], references: [id], onDelete: Cascade)
  x          Float
  y          Float
  width      Float        @default(180)
  height     Float        @default(60)
  style      Json         @default("{}")

  sourceEdges CanvasEdge[] @relation("EdgeSource")
  targetEdges CanvasEdge[] @relation("EdgeTarget")

  @@index([canvasId])
}

model CanvasEdge {
  id           String       @id @default(cuid())
  canvasId     String
  canvas       LayoutCanvas @relation(fields: [canvasId], references: [id], onDelete: Cascade)
  sourceNodeId String
  sourceNode   CanvasNode   @relation("EdgeSource", fields: [sourceNodeId], references: [id], onDelete: Cascade)
  targetNodeId String
  targetNode   CanvasNode   @relation("EdgeTarget", fields: [targetNodeId], references: [id], onDelete: Cascade)
  pathData     Json         @default("{}")
  trackType    String       @default("mainline")
  label        String?
  style        Json         @default("{}")

  @@index([canvasId])
}

model LocationCanvas {
  id            String   @id @default(cuid())
  locationId    String   @unique
  location      Location @relation(fields: [locationId], references: [id], onDelete: Cascade)
  viewport      Json     @default("{\"x\":0,\"y\":0,\"zoom\":1}")
  trackElements Json     @default("[]")
  carSlots      Json     @default("[]")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

- [ ] **Step 2: Add relations to existing Layout and Location models**

In the `Layout` model, add:

```prisma
  canvas          LayoutCanvas?
```

In the `Location` model, add:

```prisma
  canvasNode      CanvasNode?
  locationCanvas  LocationCanvas?
```

- [ ] **Step 3: Push schema to database**

```bash
npx prisma db push
```

Expected: Schema pushed successfully, no errors.

- [ ] **Step 4: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected: Client generated successfully.

- [ ] **Step 5: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(map): add canvas prisma models (LayoutCanvas, CanvasNode, CanvasEdge, LocationCanvas)"
```

---

### Task 3: Canvas Server Actions

**Files:**
- Create: `app/actions/canvas.ts`

- [ ] **Step 1: Create the canvas server actions file**

```typescript
"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// ── Schemas ──

const viewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number(),
});

const nodePositionSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
});

const saveCanvasSchema = z.object({
  canvasId: z.string(),
  viewport: viewportSchema.optional(),
  nodePositions: z.array(nodePositionSchema).optional(),
});

const createCanvasNodeSchema = z.object({
  layoutId: z.string(),
  locationName: z.string().min(1),
  locationCode: z.string().min(1),
  locationType: z.enum([
    "PASSENGER_STATION",
    "YARD",
    "INTERCHANGE",
    "JUNCTION",
    "STAGING",
    "TEAM_TRACK",
    "SIDING",
  ]),
  x: z.number(),
  y: z.number(),
});

const createCanvasEdgeSchema = z.object({
  canvasId: z.string(),
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  trackType: z.enum(["mainline", "branch", "spur"]).default("mainline"),
  label: z.string().optional(),
});

const deleteCanvasElementSchema = z.object({
  type: z.enum(["node", "edge"]),
  id: z.string(),
});

// ── Helpers ──

async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

async function verifyLayoutAccess(layoutId: string, userId: string) {
  const layout = await db.layout.findFirst({
    where: {
      id: layoutId,
      OR: [
        { userId },
        { crewMembers: { some: { userId, status: "ACTIVE" } } },
      ],
    },
  });
  if (!layout) throw new Error("Layout not found or access denied");
  return layout;
}

// ── Actions ──

export async function getCanvasData(layoutId: string) {
  const user = await getAuthenticatedUser();
  await verifyLayoutAccess(layoutId, user.id);

  let canvas = await db.layoutCanvas.findUnique({
    where: { layoutId },
    include: {
      nodes: {
        include: {
          location: {
            include: {
              industries: { select: { id: true, name: true } },
              yardTracks: { select: { id: true, name: true, trackType: true } },
            },
          },
        },
      },
      edges: true,
    },
  });

  if (!canvas) {
    canvas = await db.layoutCanvas.create({
      data: { layoutId },
      include: {
        nodes: {
          include: {
            location: {
              include: {
                industries: { select: { id: true, name: true } },
                yardTracks: { select: { id: true, name: true, trackType: true } },
              },
            },
          },
        },
        edges: true,
      },
    });
  }

  return canvas;
}

export async function saveCanvasState(values: z.infer<typeof saveCanvasSchema>) {
  const user = await getAuthenticatedUser();
  const validated = saveCanvasSchema.parse(values);

  const canvas = await db.layoutCanvas.findUnique({
    where: { id: validated.canvasId },
    select: { layout: { select: { id: true } } },
  });
  if (!canvas) return { error: "Canvas not found" };
  await verifyLayoutAccess(canvas.layout.id, user.id);

  const updates: Promise<unknown>[] = [];

  if (validated.viewport) {
    updates.push(
      db.layoutCanvas.update({
        where: { id: validated.canvasId },
        data: { viewport: validated.viewport },
      })
    );
  }

  if (validated.nodePositions) {
    for (const pos of validated.nodePositions) {
      updates.push(
        db.canvasNode.update({
          where: { id: pos.id },
          data: { x: pos.x, y: pos.y },
        })
      );
    }
  }

  await Promise.all(updates);
  return { success: true };
}

export async function createCanvasNode(values: z.infer<typeof createCanvasNodeSchema>) {
  const user = await getAuthenticatedUser();
  const validated = createCanvasNodeSchema.parse(values);
  await verifyLayoutAccess(validated.layoutId, user.id);

  const canvas = await db.layoutCanvas.findUnique({
    where: { layoutId: validated.layoutId },
  });
  if (!canvas) return { error: "Canvas not found. Open the map editor first." };

  const result = await db.$transaction(async (tx) => {
    const location = await tx.location.create({
      data: {
        name: validated.locationName,
        code: validated.locationCode,
        locationType: validated.locationType,
        layoutId: validated.layoutId,
        userId: user.id,
      },
    });

    const node = await tx.canvasNode.create({
      data: {
        canvasId: canvas.id,
        locationId: location.id,
        x: validated.x,
        y: validated.y,
      },
      include: {
        location: {
          include: {
            industries: { select: { id: true, name: true } },
            yardTracks: { select: { id: true, name: true, trackType: true } },
          },
        },
      },
    });

    return node;
  });

  revalidatePath(`/dashboard/railroad/${validated.layoutId}/map`);
  return { success: true, node: result };
}

export async function createCanvasEdge(values: z.infer<typeof createCanvasEdgeSchema>) {
  const user = await getAuthenticatedUser();
  const validated = createCanvasEdgeSchema.parse(values);

  const canvas = await db.layoutCanvas.findUnique({
    where: { id: validated.canvasId },
    select: { layout: { select: { id: true } } },
  });
  if (!canvas) return { error: "Canvas not found" };
  await verifyLayoutAccess(canvas.layout.id, user.id);

  const edge = await db.canvasEdge.create({
    data: {
      canvasId: validated.canvasId,
      sourceNodeId: validated.sourceNodeId,
      targetNodeId: validated.targetNodeId,
      trackType: validated.trackType,
      label: validated.label,
    },
  });

  return { success: true, edge };
}

export async function deleteCanvasElement(values: z.infer<typeof deleteCanvasElementSchema>) {
  const user = await getAuthenticatedUser();
  const validated = deleteCanvasElementSchema.parse(values);

  if (validated.type === "node") {
    const node = await db.canvasNode.findUnique({
      where: { id: validated.id },
      include: { canvas: { select: { layout: { select: { id: true } } } } },
    });
    if (!node) return { error: "Node not found" };
    await verifyLayoutAccess(node.canvas.layout.id, user.id);

    // Delete the location too (cascades to node)
    await db.location.delete({ where: { id: node.locationId } });
  } else {
    const edge = await db.canvasEdge.findUnique({
      where: { id: validated.id },
      include: { canvas: { select: { layout: { select: { id: true } } } } },
    });
    if (!edge) return { error: "Edge not found" };
    await verifyLayoutAccess(edge.canvas.layout.id, user.id);

    await db.canvasEdge.delete({ where: { id: validated.id } });
  }

  return { success: true };
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/actions/canvas.ts
git commit -m "feat(map): add canvas server actions (CRUD, auto-save, node/edge management)"
```

---

### Task 4: Map Editor State Store

**Files:**
- Create: `components/map/use-map-store.ts`

- [ ] **Step 1: Create the Zustand store for editor state**

```typescript
import { create } from "zustand";

export type Tool = "select" | "add-location" | "draw-track" | "pan";

interface UndoEntry {
  type: "move" | "add-node" | "delete-node" | "add-edge" | "delete-edge";
  data: Record<string, unknown>;
}

interface MapStore {
  // Tool state
  tool: Tool;
  setTool: (tool: Tool) => void;

  // Selection
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  clearSelection: () => void;

  // Track drawing state
  drawSourceNodeId: string | null;
  setDrawSource: (id: string | null) => void;

  // Detail view
  detailLocationId: string | null;
  setDetailLocation: (id: string | null) => void;

  // Fullscreen
  isFullscreen: boolean;
  toggleFullscreen: () => void;

  // Undo/Redo
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
  pushUndo: (entry: UndoEntry) => void;
  undo: () => UndoEntry | undefined;
  redo: () => UndoEntry | undefined;

  // Save status
  saveStatus: "saved" | "saving" | "unsaved";
  setSaveStatus: (status: "saved" | "saving" | "unsaved") => void;
}

export const useMapStore = create<MapStore>((set, get) => ({
  tool: "select",
  setTool: (tool) => set({ tool, drawSourceNodeId: null }),

  selectedNodeId: null,
  selectedEdgeId: null,
  selectNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  selectEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
  clearSelection: () => set({ selectedNodeId: null, selectedEdgeId: null }),

  drawSourceNodeId: null,
  setDrawSource: (id) => set({ drawSourceNodeId: id }),

  detailLocationId: null,
  setDetailLocation: (id) => set({ detailLocationId: id }),

  isFullscreen: false,
  toggleFullscreen: () => set((s) => ({ isFullscreen: !s.isFullscreen })),

  undoStack: [],
  redoStack: [],
  pushUndo: (entry) =>
    set((s) => ({
      undoStack: [...s.undoStack.slice(-49), entry],
      redoStack: [],
    })),
  undo: () => {
    const { undoStack } = get();
    if (undoStack.length === 0) return undefined;
    const entry = undoStack[undoStack.length - 1];
    set((s) => ({
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [...s.redoStack, entry],
    }));
    return entry;
  },
  redo: () => {
    const { redoStack } = get();
    if (redoStack.length === 0) return undefined;
    const entry = redoStack[redoStack.length - 1];
    set((s) => ({
      redoStack: s.redoStack.slice(0, -1),
      undoStack: [...s.undoStack, entry],
    }));
    return entry;
  },

  saveStatus: "saved",
  setSaveStatus: (status) => set({ saveStatus: status }),
}));
```

- [ ] **Step 2: Commit**

```bash
git add components/map/use-map-store.ts
git commit -m "feat(map): add zustand store for editor state (tool, selection, undo/redo)"
```

---

### Task 5: Auto-Save Hook

**Files:**
- Create: `components/map/use-auto-save.ts`

- [ ] **Step 1: Create the debounced auto-save hook**

```typescript
import { useCallback, useRef } from "react";
import { saveCanvasState } from "@/app/actions/canvas";
import { useMapStore } from "./use-map-store";

interface SavePayload {
  canvasId: string;
  viewport?: { x: number; y: number; zoom: number };
  nodePositions?: { id: string; x: number; y: number }[];
}

export function useAutoSave(canvasId: string) {
  const setSaveStatus = useMapStore((s) => s.setSaveStatus);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Partial<SavePayload>>({});

  const flush = useCallback(async () => {
    const payload = pendingRef.current;
    pendingRef.current = {};

    if (!payload.viewport && !payload.nodePositions) return;

    setSaveStatus("saving");
    try {
      await saveCanvasState({
        canvasId,
        viewport: payload.viewport,
        nodePositions: payload.nodePositions,
      });
      setSaveStatus("saved");
    } catch {
      setSaveStatus("unsaved");
    }
  }, [canvasId, setSaveStatus]);

  const queueSave = useCallback(
    (partial: Partial<SavePayload>) => {
      // Merge with pending
      if (partial.viewport) {
        pendingRef.current.viewport = partial.viewport;
      }
      if (partial.nodePositions) {
        // Merge node positions by id
        const existing = pendingRef.current.nodePositions ?? [];
        const map = new Map(existing.map((n) => [n.id, n]));
        for (const pos of partial.nodePositions) {
          map.set(pos.id, pos);
        }
        pendingRef.current.nodePositions = Array.from(map.values());
      }

      setSaveStatus("unsaved");

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, 1000);
    },
    [flush, setSaveStatus]
  );

  return { queueSave, flush };
}
```

- [ ] **Step 2: Commit**

```bash
git add components/map/use-auto-save.ts
git commit -m "feat(map): add debounced auto-save hook for canvas state"
```

---

### Task 6: Custom Location Node Component

**Files:**
- Create: `components/map/location-node.tsx`

- [ ] **Step 1: Create the custom React Flow node**

```tsx
"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useMapStore } from "./use-map-store";

const TYPE_CONFIG: Record<
  string,
  { color: string; icon: string; borderColor: string }
> = {
  YARD: { color: "#78350f", icon: "🏗️", borderColor: "#f59e0b" },
  PASSENGER_STATION: { color: "#312e81", icon: "🚉", borderColor: "#8b5cf6" },
  INTERCHANGE: { color: "#064e3b", icon: "↔", borderColor: "#10b981" },
  JUNCTION: { color: "#831843", icon: "⑂", borderColor: "#ec4899" },
  STAGING: { color: "#1e3a5f", icon: "🔀", borderColor: "#3b82f6" },
  TEAM_TRACK: { color: "#3f3f46", icon: "📦", borderColor: "#a1a1aa" },
  SIDING: { color: "#365314", icon: "🏭", borderColor: "#22c55e" },
};

export interface LocationNodeData {
  locationId: string;
  name: string;
  locationType: string;
  industriesCount: number;
  yardTracksCount: number;
  [key: string]: unknown;
}

function LocationNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as LocationNodeData;
  const config = TYPE_CONFIG[nodeData.locationType] ?? TYPE_CONFIG.SIDING;
  const tool = useMapStore((s) => s.tool);
  const drawSourceNodeId = useMapStore((s) => s.drawSourceNodeId);
  const setDrawSource = useMapStore((s) => s.setDrawSource);
  const selectNode = useMapStore((s) => s.selectNode);

  const isDrawSource = drawSourceNodeId === id;

  const handleClick = () => {
    if (tool === "draw-track") {
      if (!drawSourceNodeId) {
        setDrawSource(id);
      }
      // Target click is handled by onConnect in map-canvas
    } else {
      selectNode(id);
    }
  };

  const stats: string[] = [];
  if (nodeData.yardTracksCount > 0) stats.push(`${nodeData.yardTracksCount} tracks`);
  if (nodeData.industriesCount > 0) stats.push(`${nodeData.industriesCount} industries`);

  return (
    <div
      onClick={handleClick}
      className="rounded-lg border-2 px-3 py-2 font-mono text-xs cursor-pointer transition-shadow"
      style={{
        backgroundColor: "#1e293b",
        borderColor: selected || isDrawSource ? "#ffffff" : config.borderColor,
        boxShadow: isDrawSource ? `0 0 12px ${config.borderColor}` : undefined,
        minWidth: 140,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-500 !w-2 !h-2" />
      <Handle type="target" position={Position.Left} className="!bg-slate-500 !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} className="!bg-slate-500 !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-slate-500 !w-2 !h-2" />

      <div className="font-bold text-slate-100 flex items-center gap-1.5">
        <span>{config.icon}</span>
        <span>{nodeData.name}</span>
      </div>
      <div className="text-slate-500 text-[10px] mt-0.5">
        {nodeData.locationType}
        {stats.length > 0 && ` • ${stats.join(", ")}`}
      </div>
    </div>
  );
}

export const LocationNode = memo(LocationNodeComponent);
```

- [ ] **Step 2: Commit**

```bash
git add components/map/location-node.tsx
git commit -m "feat(map): add custom React Flow location node with type-specific styling"
```

---

### Task 7: Custom Track Edge Component

**Files:**
- Create: `components/map/track-edge.tsx`

- [ ] **Step 1: Create the custom React Flow edge**

```tsx
"use client";

import { memo } from "react";
import {
  BaseEdge,
  getBezierPath,
  EdgeLabelRenderer,
  type EdgeProps,
} from "@xyflow/react";

const TRACK_STYLES: Record<string, { strokeWidth: number; strokeDasharray?: string }> = {
  mainline: { strokeWidth: 3 },
  branch: { strokeWidth: 2, strokeDasharray: "6,4" },
  spur: { strokeWidth: 1.5, strokeDasharray: "3,3" },
};

export interface TrackEdgeData {
  trackType: string;
  label?: string;
  [key: string]: unknown;
}

function TrackEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps) {
  const edgeData = (data ?? {}) as TrackEdgeData;
  const trackStyle = TRACK_STYLES[edgeData.trackType] ?? TRACK_STYLES.mainline;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? "#ffffff" : "#475569",
          strokeWidth: trackStyle.strokeWidth,
          strokeDasharray: trackStyle.strokeDasharray,
          strokeLinecap: "round",
        }}
      />
      {edgeData.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="bg-slate-900/80 text-slate-400 text-[10px] font-mono px-1.5 py-0.5 rounded"
          >
            {edgeData.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const TrackEdge = memo(TrackEdgeComponent);
```

- [ ] **Step 2: Commit**

```bash
git add components/map/track-edge.tsx
git commit -m "feat(map): add custom React Flow track edge with mainline/branch/spur styles"
```

---

### Task 8: Map Canvas Component

**Files:**
- Create: `components/map/map-canvas.tsx`

- [ ] **Step 1: Create the React Flow canvas wrapper**

```tsx
"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type OnConnect,
  type NodeDragHandler,
  type OnSelectionChangeFunc,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { LocationNode, type LocationNodeData } from "./location-node";
import { TrackEdge, type TrackEdgeData } from "./track-edge";
import { useMapStore } from "./use-map-store";
import { useAutoSave } from "./use-auto-save";
import { createCanvasEdge, createCanvasNode } from "@/app/actions/canvas";

const nodeTypes = { location: LocationNode };
const edgeTypes = { track: TrackEdge };

interface CanvasData {
  id: string;
  layoutId: string;
  viewport: { x: number; y: number; zoom: number };
  gridSize: number;
  nodes: Array<{
    id: string;
    locationId: string;
    x: number;
    y: number;
    location: {
      name: string;
      locationType: string;
      industries: { id: string; name: string }[];
      yardTracks: { id: string; name: string; trackType: string }[];
    };
  }>;
  edges: Array<{
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    trackType: string;
    label: string | null;
  }>;
}

interface MapCanvasProps {
  canvasData: CanvasData;
}

export function MapCanvas({ canvasData }: MapCanvasProps) {
  const tool = useMapStore((s) => s.tool);
  const drawSourceNodeId = useMapStore((s) => s.drawSourceNodeId);
  const setDrawSource = useMapStore((s) => s.setDrawSource);
  const selectNode = useMapStore((s) => s.selectNode);
  const selectEdge = useMapStore((s) => s.selectEdge);
  const clearSelection = useMapStore((s) => s.clearSelection);
  const pushUndo = useMapStore((s) => s.pushUndo);
  const { queueSave } = useAutoSave(canvasData.id);

  const initialNodes: Node[] = useMemo(
    () =>
      canvasData.nodes.map((n) => ({
        id: n.id,
        type: "location",
        position: { x: n.x, y: n.y },
        data: {
          locationId: n.locationId,
          name: n.location.name,
          locationType: n.location.locationType,
          industriesCount: n.location.industries.length,
          yardTracksCount: n.location.yardTracks.length,
        } satisfies LocationNodeData,
      })),
    [canvasData.nodes]
  );

  const initialEdges: Edge[] = useMemo(
    () =>
      canvasData.edges.map((e) => ({
        id: e.id,
        type: "track",
        source: e.sourceNodeId,
        target: e.targetNodeId,
        data: {
          trackType: e.trackType,
          label: e.label ?? undefined,
        } satisfies TrackEdgeData,
      })),
    [canvasData.edges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onNodeDragStop: NodeDragHandler = useCallback(
    (_event, node) => {
      // Snap to grid
      const gridSize = canvasData.gridSize;
      const snappedX = Math.round(node.position.x / gridSize) * gridSize;
      const snappedY = Math.round(node.position.y / gridSize) * gridSize;

      setNodes((nds) =>
        nds.map((n) =>
          n.id === node.id ? { ...n, position: { x: snappedX, y: snappedY } } : n
        )
      );

      pushUndo({
        type: "move",
        data: { nodeId: node.id, x: snappedX, y: snappedY },
      });

      queueSave({
        nodePositions: [{ id: node.id, x: snappedX, y: snappedY }],
      });
    },
    [canvasData.gridSize, setNodes, pushUndo, queueSave]
  );

  const onConnect: OnConnect = useCallback(
    async (connection) => {
      if (tool !== "draw-track" || !connection.source || !connection.target) return;

      const result = await createCanvasEdge({
        canvasId: canvasData.id,
        sourceNodeId: connection.source,
        targetNodeId: connection.target,
      });

      if (result.success && result.edge) {
        setEdges((eds) => [
          ...eds,
          {
            id: result.edge.id,
            type: "track",
            source: result.edge.sourceNodeId,
            target: result.edge.targetNodeId,
            data: {
              trackType: result.edge.trackType,
              label: result.edge.label ?? undefined,
            },
          },
        ]);
        pushUndo({ type: "add-edge", data: { edgeId: result.edge.id } });
      }

      setDrawSource(null);
    },
    [tool, canvasData.id, setEdges, pushUndo, setDrawSource]
  );

  const onSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }) => {
      if (selectedNodes.length > 0) {
        selectNode(selectedNodes[0].id);
      } else if (selectedEdges.length > 0) {
        selectEdge(selectedEdges[0].id);
      } else {
        clearSelection();
      }
    },
    [selectNode, selectEdge, clearSelection]
  );

  const onPaneClick = useCallback(
    async (event: React.MouseEvent) => {
      if (tool === "add-location") {
        // Get canvas position from screen coordinates
        // The position will be handled by the parent via a callback
        // For now, clear selection
        clearSelection();
      } else {
        clearSelection();
        setDrawSource(null);
      }
    },
    [tool, clearSelection, setDrawSource]
  );

  const viewport = canvasData.viewport as { x: number; y: number; zoom: number };

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeDragStop={onNodeDragStop}
      onConnect={onConnect}
      onSelectionChange={onSelectionChange}
      onPaneClick={onPaneClick}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      defaultViewport={viewport}
      snapToGrid={true}
      snapGrid={[canvasData.gridSize, canvasData.gridSize]}
      fitView={canvasData.nodes.length > 0}
      panOnDrag={tool === "pan" || tool === "select"}
      selectionOnDrag={false}
      className="!bg-[#0a0f1a]"
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={canvasData.gridSize}
        size={1}
        color="#1e293b"
      />
      <MiniMap
        nodeColor="#1e293b"
        maskColor="rgba(0,0,0,0.7)"
        className="!bg-[#0f172a] !border-slate-700"
      />
    </ReactFlow>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/map/map-canvas.tsx
git commit -m "feat(map): add React Flow canvas wrapper with nodes, edges, drag, connect, auto-save"
```

---

### Task 9: Map Toolbar

**Files:**
- Create: `components/map/map-toolbar.tsx`

- [ ] **Step 1: Create the left toolbar component**

```tsx
"use client";

import { useMapStore, type Tool } from "./use-map-store";
import { MousePointer2, Plus, Slash, Hand, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { useReactFlow } from "@xyflow/react";

const tools: { id: Tool; icon: typeof MousePointer2; label: string; shortcut: string }[] = [
  { id: "select", icon: MousePointer2, label: "Select", shortcut: "V" },
  { id: "add-location", icon: Plus, label: "Add Location", shortcut: "L" },
  { id: "draw-track", icon: Slash, label: "Draw Track", shortcut: "T" },
  { id: "pan", icon: Hand, label: "Pan", shortcut: "H" },
];

export function MapToolbar() {
  const tool = useMapStore((s) => s.tool);
  const setTool = useMapStore((s) => s.setTool);
  const isFullscreen = useMapStore((s) => s.isFullscreen);
  const toggleFullscreen = useMapStore((s) => s.toggleFullscreen);
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="flex w-14 flex-col items-center border-r border-slate-700 bg-[#0f172a] py-3 gap-2">
      {tools.map((t) => (
        <button
          key={t.id}
          onClick={() => setTool(t.id)}
          title={`${t.label} (${t.shortcut})`}
          className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
            tool === t.id
              ? "bg-blue-600 text-white"
              : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
          }`}
        >
          <t.icon className="h-4 w-4" />
        </button>
      ))}

      <div className="flex-1" />

      <button
        onClick={() => fitView({ padding: 0.2 })}
        title="Fit to content (Ctrl+0)"
        className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
      >
        <Maximize className="h-4 w-4" />
      </button>
      <button
        onClick={() => zoomIn()}
        title="Zoom in (+)"
        className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
      >
        <ZoomIn className="h-4 w-4" />
      </button>
      <button
        onClick={() => zoomOut()}
        title="Zoom out (-)"
        className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
      >
        <ZoomOut className="h-4 w-4" />
      </button>
      <button
        onClick={toggleFullscreen}
        title="Toggle fullscreen"
        className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
          isFullscreen
            ? "bg-blue-600 text-white"
            : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
        }`}
      >
        <Maximize className="h-4 w-4" />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/map/map-toolbar.tsx
git commit -m "feat(map): add map toolbar with tool selection and zoom controls"
```

---

### Task 10: Properties Panel

**Files:**
- Create: `components/map/map-properties.tsx`

- [ ] **Step 1: Create the properties panel component**

```tsx
"use client";

import { useMapStore } from "./use-map-store";
import { useNodes, useEdges } from "@xyflow/react";
import type { LocationNodeData } from "./location-node";
import type { TrackEdgeData } from "./track-edge";
import Link from "next/link";

export function MapProperties({ layoutId }: { layoutId: string }) {
  const selectedNodeId = useMapStore((s) => s.selectedNodeId);
  const selectedEdgeId = useMapStore((s) => s.selectedEdgeId);
  const setDetailLocation = useMapStore((s) => s.setDetailLocation);
  const nodes = useNodes();
  const edges = useEdges();

  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId)
    : null;
  const selectedEdge = selectedEdgeId
    ? edges.find((e) => e.id === selectedEdgeId)
    : null;

  if (!selectedNode && !selectedEdge) {
    return (
      <div className="w-[260px] border-l border-slate-700 bg-[#0f172a] p-4 font-mono text-xs">
        <div className="text-slate-200 font-bold mb-3">Properties</div>
        <div className="text-slate-500">Select a location or track to view details.</div>
      </div>
    );
  }

  if (selectedNode) {
    const data = selectedNode.data as LocationNodeData;

    // Find connected edges
    const connectedEdges = edges.filter(
      (e) => e.source === selectedNode.id || e.target === selectedNode.id
    );
    const connectedNodes = connectedEdges.map((e) => {
      const otherId = e.source === selectedNode.id ? e.target : e.source;
      const otherNode = nodes.find((n) => n.id === otherId);
      const otherData = otherNode?.data as LocationNodeData | undefined;
      return {
        name: otherData?.name ?? "Unknown",
        trackType: (e.data as TrackEdgeData)?.trackType ?? "mainline",
      };
    });

    return (
      <div className="w-[260px] border-l border-slate-700 bg-[#0f172a] p-4 font-mono text-xs overflow-y-auto">
        <div className="text-slate-200 font-bold mb-3">Properties</div>

        <div className="text-slate-500 mb-1">SELECTED NODE</div>
        <div className="text-amber-400 font-bold mb-3">{data.name}</div>

        <div className="text-slate-500 mb-1">TYPE</div>
        <div className="text-slate-400 mb-3">{data.locationType}</div>

        {data.yardTracksCount > 0 && (
          <>
            <div className="text-slate-500 mb-1">TRACKS</div>
            <div className="text-slate-400 mb-3">{data.yardTracksCount} tracks</div>
          </>
        )}

        {data.industriesCount > 0 && (
          <>
            <div className="text-slate-500 mb-1">INDUSTRIES</div>
            <div className="text-slate-400 mb-3">{data.industriesCount} industries</div>
          </>
        )}

        {connectedNodes.length > 0 && (
          <>
            <div className="text-slate-500 mb-1">CONNECTIONS</div>
            {connectedNodes.map((cn, i) => (
              <div key={i} className="text-slate-400 mb-0.5">
                → {cn.name} ({cn.trackType})
              </div>
            ))}
          </>
        )}

        <div className="mt-4 pt-4 border-t border-slate-700 space-y-2">
          <button
            onClick={() => setDetailLocation(data.locationId)}
            className="w-full rounded-md bg-purple-600 px-3 py-2 text-center font-bold text-white hover:bg-purple-500 transition-colors"
          >
            View Detail →
          </button>
          <Link
            href={`/dashboard/railroad/${layoutId}/locations/${data.locationId}`}
            className="block w-full rounded-md bg-slate-800 px-3 py-2 text-center text-slate-400 hover:bg-slate-700 transition-colors"
          >
            Edit Location
          </Link>
        </div>
      </div>
    );
  }

  if (selectedEdge) {
    const data = (selectedEdge.data ?? {}) as TrackEdgeData;

    const sourceNode = nodes.find((n) => n.id === selectedEdge.source);
    const targetNode = nodes.find((n) => n.id === selectedEdge.target);
    const sourceName = (sourceNode?.data as LocationNodeData)?.name ?? "Unknown";
    const targetName = (targetNode?.data as LocationNodeData)?.name ?? "Unknown";

    return (
      <div className="w-[260px] border-l border-slate-700 bg-[#0f172a] p-4 font-mono text-xs overflow-y-auto">
        <div className="text-slate-200 font-bold mb-3">Properties</div>

        <div className="text-slate-500 mb-1">SELECTED TRACK</div>
        <div className="text-blue-400 font-bold mb-3">
          {sourceName} → {targetName}
        </div>

        <div className="text-slate-500 mb-1">TYPE</div>
        <div className="text-slate-400 mb-3">{data.trackType ?? "mainline"}</div>

        {data.label && (
          <>
            <div className="text-slate-500 mb-1">LABEL</div>
            <div className="text-slate-400 mb-3">{data.label}</div>
          </>
        )}
      </div>
    );
  }

  return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add components/map/map-properties.tsx
git commit -m "feat(map): add properties panel showing node/edge details and actions"
```

---

### Task 11: Add Location Form

**Files:**
- Create: `components/map/add-location-form.tsx`

- [ ] **Step 1: Create the inline add location form**

```tsx
"use client";

import { useState } from "react";
import { useMapStore } from "./use-map-store";
import { createCanvasNode } from "@/app/actions/canvas";
import { toast } from "sonner";

const LOCATION_TYPES = [
  { value: "YARD", label: "Yard" },
  { value: "PASSENGER_STATION", label: "Passenger Station" },
  { value: "INTERCHANGE", label: "Interchange" },
  { value: "JUNCTION", label: "Junction" },
  { value: "STAGING", label: "Staging" },
  { value: "TEAM_TRACK", label: "Team Track" },
  { value: "SIDING", label: "Siding" },
] as const;

interface AddLocationFormProps {
  layoutId: string;
  position: { x: number; y: number };
  onCreated: (node: {
    id: string;
    locationId: string;
    x: number;
    y: number;
    location: {
      name: string;
      locationType: string;
      industries: { id: string; name: string }[];
      yardTracks: { id: string; name: string; trackType: string }[];
    };
  }) => void;
  onCancel: () => void;
}

export function AddLocationForm({ layoutId, position, onCreated, onCancel }: AddLocationFormProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [locationType, setLocationType] = useState<string>("SIDING");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const setTool = useMapStore((s) => s.setTool);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    setIsSubmitting(true);
    try {
      const result = await createCanvasNode({
        layoutId,
        locationName: name.trim(),
        locationCode: code.trim(),
        locationType: locationType as "YARD" | "PASSENGER_STATION" | "INTERCHANGE" | "JUNCTION" | "STAGING" | "TEAM_TRACK" | "SIDING",
        x: position.x,
        y: position.y,
      });

      if (result.error) {
        toast.error(result.error);
      } else if (result.node) {
        toast.success(`${name} added to map`);
        onCreated(result.node);
        setTool("select");
      }
    } catch {
      toast.error("Failed to create location");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-[260px] border-l border-slate-700 bg-[#0f172a] p-4 font-mono text-xs">
      <div className="text-slate-200 font-bold mb-3">New Location</div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-slate-500 block mb-1">NAME</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Cedar Valley Yard"
            autoFocus
            className="w-full rounded-md border border-slate-600 bg-slate-800 px-2 py-1.5 text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-slate-500 block mb-1">CODE</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="CVY"
            className="w-full rounded-md border border-slate-600 bg-slate-800 px-2 py-1.5 text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-slate-500 block mb-1">TYPE</label>
          <select
            value={locationType}
            onChange={(e) => setLocationType(e.target.value)}
            className="w-full rounded-md border border-slate-600 bg-slate-800 px-2 py-1.5 text-slate-200 focus:border-blue-500 focus:outline-none"
          >
            {LOCATION_TYPES.map((lt) => (
              <option key={lt.value} value={lt.value}>
                {lt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={isSubmitting || !name.trim() || !code.trim()}
            className="flex-1 rounded-md bg-blue-600 px-3 py-2 font-bold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? "Adding..." : "Add"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-md bg-slate-800 px-3 py-2 text-slate-400 hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/map/add-location-form.tsx
git commit -m "feat(map): add inline location creation form for map editor"
```

---

### Task 12: Map Editor (Top-Level Orchestrator)

**Files:**
- Create: `components/map/map-editor.tsx`

- [ ] **Step 1: Create the top-level map editor component**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { MapCanvas } from "./map-canvas";
import { MapToolbar } from "./map-toolbar";
import { MapProperties } from "./map-properties";
import { AddLocationForm } from "./add-location-form";
import { useMapStore } from "./use-map-store";
import type { LocationNodeData } from "./location-node";

interface CanvasData {
  id: string;
  layoutId: string;
  viewport: { x: number; y: number; zoom: number };
  gridSize: number;
  nodes: Array<{
    id: string;
    locationId: string;
    x: number;
    y: number;
    location: {
      name: string;
      locationType: string;
      industries: { id: string; name: string }[];
      yardTracks: { id: string; name: string; trackType: string }[];
    };
  }>;
  edges: Array<{
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    trackType: string;
    label: string | null;
  }>;
}

interface MapEditorProps {
  canvasData: CanvasData;
  layoutId: string;
}

function MapEditorInner({ canvasData, layoutId }: MapEditorProps) {
  const tool = useMapStore((s) => s.tool);
  const setTool = useMapStore((s) => s.setTool);
  const isFullscreen = useMapStore((s) => s.isFullscreen);
  const saveStatus = useMapStore((s) => s.saveStatus);
  const [addLocationPos, setAddLocationPos] = useState<{ x: number; y: number } | null>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "v":
          setTool("select");
          break;
        case "l":
          setTool("add-location");
          break;
        case "t":
          setTool("draw-track");
          break;
        case "h":
          setTool("pan");
          break;
        case "escape":
          setTool("select");
          setAddLocationPos(null);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setTool]);

  const handleLocationCreated = useCallback(() => {
    setAddLocationPos(null);
    // Canvas will re-render from server revalidation
  }, []);

  return (
    <div className={`flex h-full ${isFullscreen ? "fixed inset-0 z-50" : ""}`}>
      <MapToolbar />
      <div className="relative flex-1">
        <MapCanvas canvasData={canvasData} />

        {/* Save status indicator */}
        <div className="absolute top-3 right-3 z-10 rounded-md border border-slate-700 bg-[#0f172a] px-2.5 py-1 font-mono text-xs">
          {saveStatus === "saved" && <span className="text-green-400">✓ Saved</span>}
          {saveStatus === "saving" && <span className="text-amber-400">Saving...</span>}
          {saveStatus === "unsaved" && <span className="text-slate-400">Unsaved</span>}
        </div>

        {/* Tool hint */}
        {tool === "add-location" && !addLocationPos && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 rounded-md bg-blue-600 px-3 py-1.5 font-mono text-xs text-white shadow-lg">
            Click on the canvas to place a new location
          </div>
        )}
        {tool === "draw-track" && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 rounded-md bg-blue-600 px-3 py-1.5 font-mono text-xs text-white shadow-lg">
            Click a location to start, then click another to connect
          </div>
        )}
      </div>

      {addLocationPos ? (
        <AddLocationForm
          layoutId={layoutId}
          position={addLocationPos}
          onCreated={handleLocationCreated}
          onCancel={() => setAddLocationPos(null)}
        />
      ) : (
        <MapProperties layoutId={layoutId} />
      )}
    </div>
  );
}

export function MapEditor(props: MapEditorProps) {
  return (
    <ReactFlowProvider>
      <MapEditorInner {...props} />
    </ReactFlowProvider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/map/map-editor.tsx
git commit -m "feat(map): add top-level map editor with toolbar, properties, keyboard shortcuts"
```

---

### Task 13: Map Page and Sidebar Integration

**Files:**
- Create: `app/(dashboard)/dashboard/railroad/[id]/map/page.tsx`
- Modify: `components/layout/app-sidebar.tsx`

- [ ] **Step 1: Create the map page (server component)**

```tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getCanvasData } from "@/app/actions/canvas";
import { MapEditor } from "@/components/map/map-editor";

interface MapPageProps {
  params: Promise<{ id: string }>;
}

export default async function MapPage({ params }: MapPageProps) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id: layoutId } = await params;
  const canvasData = await getCanvasData(layoutId);

  return (
    <div className="h-[calc(100vh-theme(spacing.12))] -m-6">
      <MapEditor
        canvasData={JSON.parse(JSON.stringify(canvasData))}
        layoutId={layoutId}
      />
    </div>
  );
}
```

- [ ] **Step 2: Add "Map" to the sidebar**

In `components/layout/app-sidebar.tsx`, add the Map menu item in the `getRailroadMenuItems` function after the "Operations Center" entry. Add the `Map` import from lucide-react.

Add to imports:

```typescript
import { Map } from "lucide-react";
```

Add after the Operations Center entry (line ~57):

```typescript
    {
      href: `/dashboard/railroad/${railroadId}/map`,
      label: "Map",
      icon: Map,
    },
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Manual test**

```bash
npm run dev
```

Navigate to a railroad's Map page. Verify:
- Empty canvas loads with dot grid background
- Toolbar renders on the left
- Properties panel renders on the right
- "Map" appears in sidebar

- [ ] **Step 5: Commit**

```bash
git add app/(dashboard)/dashboard/railroad/[id]/map/page.tsx components/layout/app-sidebar.tsx
git commit -m "feat(map): add map page route and sidebar navigation item"
```

---

## Phase 2: Editor Polish

### Task 14: Add Location from Canvas Click

**Files:**
- Modify: `components/map/map-canvas.tsx`
- Modify: `components/map/map-editor.tsx`

- [ ] **Step 1: Add onPaneClick callback to MapCanvas that reports click position**

In `components/map/map-canvas.tsx`, add an `onAddLocation` prop:

```typescript
interface MapCanvasProps {
  canvasData: CanvasData;
  onAddLocation?: (position: { x: number; y: number }) => void;
}
```

Update the `onPaneClick` handler to use `screenToFlowPosition` from `useReactFlow`:

```typescript
const { screenToFlowPosition } = useReactFlow();

const onPaneClick = useCallback(
  (event: React.MouseEvent) => {
    if (tool === "add-location" && onAddLocation) {
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const gridSize = canvasData.gridSize;
      const snappedX = Math.round(position.x / gridSize) * gridSize;
      const snappedY = Math.round(position.y / gridSize) * gridSize;
      onAddLocation({ x: snappedX, y: snappedY });
    } else {
      clearSelection();
      setDrawSource(null);
    }
  },
  [tool, onAddLocation, screenToFlowPosition, canvasData.gridSize, clearSelection, setDrawSource]
);
```

Pass `onAddLocation` through from the ReactFlow component props.

- [ ] **Step 2: Wire up in MapEditorInner**

In `components/map/map-editor.tsx`, pass the callback:

```tsx
<MapCanvas canvasData={canvasData} onAddLocation={setAddLocationPos} />
```

- [ ] **Step 3: Test manually**

- Select "Add Location" tool
- Click on canvas
- Verify form appears in properties panel with snapped coordinates
- Fill in form and submit
- Verify node appears on canvas

- [ ] **Step 4: Commit**

```bash
git add components/map/map-canvas.tsx components/map/map-editor.tsx
git commit -m "feat(map): wire up add-location-from-canvas click flow"
```

---

### Task 15: Delete Selected Elements

**Files:**
- Modify: `components/map/map-editor.tsx`

- [ ] **Step 1: Add delete handler to keyboard shortcuts**

In the `handleKeyDown` function in `MapEditorInner`, add:

```typescript
case "delete":
case "backspace": {
  const { selectedNodeId, selectedEdgeId } = useMapStore.getState();
  if (selectedNodeId || selectedEdgeId) {
    handleDelete();
  }
  break;
}
```

Add the `handleDelete` function:

```typescript
import { deleteCanvasElement } from "@/app/actions/canvas";
import { toast } from "sonner";

const handleDelete = useCallback(async () => {
  const { selectedNodeId, selectedEdgeId, clearSelection, pushUndo } = useMapStore.getState();

  const type = selectedNodeId ? "node" : "edge";
  const id = selectedNodeId ?? selectedEdgeId;
  if (!id) return;

  const result = await deleteCanvasElement({ type, id });
  if (result.error) {
    toast.error(result.error);
  } else {
    pushUndo({ type: type === "node" ? "delete-node" : "delete-edge", data: { id } });
    clearSelection();
    toast.success(`${type === "node" ? "Location" : "Track"} deleted`);
  }
}, []);
```

- [ ] **Step 2: Commit**

```bash
git add components/map/map-editor.tsx
git commit -m "feat(map): add delete key handler for removing selected nodes and edges"
```

---

## Phase 3: Location Detail Views

### Task 16: Location Detail View Component

**Files:**
- Create: `components/map/location-detail-view.tsx`

- [ ] **Step 1: Create the Konva-based location detail view**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Stage, Layer, Line, Rect, Text, Group } from "react-konva";
import { useMapStore } from "./use-map-store";
import { ChevronLeft } from "lucide-react";

interface YardTrack {
  id: string;
  name: string;
  trackType: string;
  capacity?: number;
}

interface Industry {
  id: string;
  name: string;
}

interface LocationDetailViewProps {
  locationId: string;
  locationName: string;
  locationType: string;
  yardTracks: YardTrack[];
  industries: Industry[];
}

const TRACK_TYPE_COLORS: Record<string, string> = {
  ARRIVAL: "#3b82f6",
  CLASSIFICATION: "#f59e0b",
  DEPARTURE: "#22c55e",
  LEAD: "#94a3b8",
  RIP: "#ef4444",
  ENGINE_SERVICE: "#8b5cf6",
  CABOOSE: "#ec4899",
  RUNAROUND: "#64748b",
  SWITCHER_POCKET: "#a1a1aa",
};

export function LocationDetailView({
  locationId,
  locationName,
  locationType,
  yardTracks,
  industries,
}: LocationDetailViewProps) {
  const setDetailLocation = useMapStore((s) => s.setDetailLocation);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  useEffect(() => {
    const updateSize = () => {
      const container = document.getElementById("detail-canvas-container");
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: container.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const handleBack = useCallback(() => {
    setDetailLocation(null);
  }, [setDetailLocation]);

  const trackSpacing = 40;
  const trackStartX = 80;
  const trackStartY = 80;
  const trackLength = dimensions.width - 160;

  return (
    <div className="flex h-full flex-col bg-[#0a0f1a]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 border-b border-slate-700 bg-[#0f172a] px-4 py-2">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-xs font-mono text-blue-400 hover:text-blue-300 transition-colors"
        >
          <ChevronLeft className="h-3 w-3" />
          Railroad Overview
        </button>
        <span className="text-slate-600 text-xs">/</span>
        <span className="text-slate-200 text-xs font-mono font-bold">{locationName}</span>
        <span className="text-slate-500 text-xs font-mono">({locationType})</span>
      </div>

      {/* Konva canvas */}
      <div id="detail-canvas-container" className="flex-1">
        <Stage width={dimensions.width} height={dimensions.height}>
          <Layer>
            {/* Lead track (horizontal line at top) */}
            <Line
              points={[trackStartX, trackStartY - 20, trackStartX + trackLength, trackStartY - 20]}
              stroke="#64748b"
              strokeWidth={3}
              lineCap="round"
            />
            <Text
              x={trackStartX - 10}
              y={trackStartY - 30}
              text="Lead"
              fill="#64748b"
              fontSize={10}
              fontFamily="monospace"
              align="right"
              width={60}
            />

            {/* Yard tracks */}
            {yardTracks.map((track, i) => {
              const y = trackStartY + i * trackSpacing;
              const color = TRACK_TYPE_COLORS[track.trackType] ?? "#475569";

              return (
                <Group key={track.id}>
                  {/* Turnout from lead */}
                  <Line
                    points={[
                      trackStartX + 20 + i * 30,
                      trackStartY - 20,
                      trackStartX + 40 + i * 30,
                      y,
                    ]}
                    stroke={color}
                    strokeWidth={2}
                    lineCap="round"
                    opacity={0.5}
                  />

                  {/* Main track line */}
                  <Line
                    points={[
                      trackStartX + 40 + i * 30,
                      y,
                      trackStartX + trackLength - 40,
                      y,
                    ]}
                    stroke={color}
                    strokeWidth={2}
                    lineCap="round"
                  />

                  {/* Track label */}
                  <Text
                    x={0}
                    y={y - 6}
                    text={track.name}
                    fill={color}
                    fontSize={10}
                    fontFamily="monospace"
                    width={trackStartX + 30 + i * 30}
                    align="right"
                    padding={4}
                  />

                  {/* Capacity indicator */}
                  {track.capacity && (
                    <Text
                      x={trackStartX + trackLength - 35}
                      y={y - 6}
                      text={`cap: ${track.capacity}`}
                      fill="#475569"
                      fontSize={9}
                      fontFamily="monospace"
                    />
                  )}
                </Group>
              );
            })}

            {/* Industry spurs */}
            {industries.map((industry, i) => {
              const baseY = trackStartY + yardTracks.length * trackSpacing + 20;
              const y = baseY + i * trackSpacing;
              const spurStartX = trackStartX + trackLength - 200;

              return (
                <Group key={industry.id}>
                  <Line
                    points={[spurStartX, trackStartY - 20, spurStartX + 40, y]}
                    stroke="#22c55e"
                    strokeWidth={1.5}
                    dash={[4, 3]}
                    lineCap="round"
                  />
                  <Line
                    points={[spurStartX + 40, y, spurStartX + 160, y]}
                    stroke="#22c55e"
                    strokeWidth={1.5}
                    lineCap="round"
                  />
                  <Rect
                    x={spurStartX + 165}
                    y={y - 12}
                    width={120}
                    height={24}
                    fill="#0f2918"
                    stroke="#22c55e"
                    strokeWidth={1}
                    cornerRadius={4}
                  />
                  <Text
                    x={spurStartX + 170}
                    y={y - 6}
                    text={industry.name}
                    fill="#22c55e"
                    fontSize={10}
                    fontFamily="monospace"
                  />
                </Group>
              );
            })}

            {/* Empty state */}
            {yardTracks.length === 0 && industries.length === 0 && (
              <Text
                x={dimensions.width / 2 - 100}
                y={dimensions.height / 2 - 10}
                text="No tracks or industries yet"
                fill="#475569"
                fontSize={14}
                fontFamily="monospace"
                width={200}
                align="center"
              />
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/map/location-detail-view.tsx
git commit -m "feat(map): add Konva-based location detail view with yard tracks and industry spurs"
```

---

### Task 17: Wire Detail View into Map Editor

**Files:**
- Modify: `components/map/map-editor.tsx`

- [ ] **Step 1: Add detail view rendering in MapEditorInner**

Import and use the detail view. When `detailLocationId` is set, render the detail view instead of the canvas.

Add import:

```typescript
import { LocationDetailView } from "./location-detail-view";
```

Add state and lookup logic in `MapEditorInner`:

```typescript
const detailLocationId = useMapStore((s) => s.detailLocationId);

// Find the detail location data from canvas nodes
const detailNode = detailLocationId
  ? canvasData.nodes.find((n) => n.locationId === detailLocationId)
  : null;
```

Replace the center canvas area with a conditional:

```tsx
{detailNode ? (
  <LocationDetailView
    locationId={detailNode.locationId}
    locationName={detailNode.location.name}
    locationType={detailNode.location.locationType}
    yardTracks={detailNode.location.yardTracks.map((t) => ({
      ...t,
      capacity: undefined,
    }))}
    industries={detailNode.location.industries}
  />
) : (
  <>
    <MapCanvas canvasData={canvasData} onAddLocation={setAddLocationPos} />
    {/* save status and tool hints */}
  </>
)}
```

- [ ] **Step 2: Test manually**

- Place some locations on the map
- Click a location, click "View Detail" in properties
- Verify Konva view renders with breadcrumb
- Click back to return to overview

- [ ] **Step 3: Commit**

```bash
git add components/map/map-editor.tsx
git commit -m "feat(map): wire location detail view into map editor with breadcrumb navigation"
```

---

## Phase 4: Session Display

### Task 18: Session State Polling API Route

**Files:**
- Create: `app/api/session/[id]/state/route.ts`

- [ ] **Step 1: Create the polling endpoint**

```typescript
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sessionId } = await params;

  const operatingSession = await db.operatingSession.findFirst({
    where: {
      id: sessionId,
      status: "IN_PROGRESS",
      layout: {
        OR: [
          { userId: session.user.id },
          { crewMembers: { some: { userId: session.user.id, status: "ACTIVE" } } },
        ],
      },
    },
    include: {
      sessionTrains: {
        include: {
          train: {
            select: {
              id: true,
              name: true,
              originId: true,
              destinationId: true,
            },
          },
        },
      },
    },
  });

  if (!operatingSession) {
    return NextResponse.json({ error: "Session not found or not active" }, { status: 404 });
  }

  const trains = operatingSession.sessionTrains.map((st) => ({
    id: st.id,
    trainId: st.trainId,
    trainName: st.train.name,
    status: st.status ?? "IDLE",
    locationId: st.train.originId, // TODO: track current location when SessionTrain gets a currentLocationId field
  }));

  return NextResponse.json({
    timestamp: Date.now(),
    sessionName: operatingSession.name,
    trains,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/session/[id]/state/route.ts
git commit -m "feat(map): add session state polling API endpoint for crew sync"
```

---

### Task 19: Session Overlay Component

**Files:**
- Create: `components/map/session-overlay.tsx`

- [ ] **Step 1: Create the session overlay**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useMapStore } from "./use-map-store";

interface SessionTrain {
  id: string;
  trainId: string;
  trainName: string;
  status: string;
  locationId: string | null;
}

interface SessionState {
  timestamp: number;
  sessionName: string;
  trains: SessionTrain[];
}

interface SessionOverlayProps {
  sessionId: string;
  isDispatcher: boolean;
}

export function SessionOverlay({ sessionId, isDispatcher }: SessionOverlayProps) {
  const [state, setState] = useState<SessionState | null>(null);
  const [pollInterval] = useState(5000);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/session/${sessionId}/state`);
      if (res.ok) {
        const data = await res.json();
        setState(data);
      }
    } catch {
      // Silently retry on next poll
    }
  }, [sessionId]);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, pollInterval);
    return () => clearInterval(interval);
  }, [fetchState, pollInterval]);

  if (!state) return null;

  return (
    <>
      {/* Session banner */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between bg-gradient-to-r from-red-900 via-red-800 to-red-900 px-4 py-1.5">
        <div className="flex items-center gap-2 font-mono text-xs font-bold text-red-300">
          <span className="inline-block h-2 w-2 rounded-full bg-red-400 animate-pulse" />
          LIVE SESSION — {state.sessionName}
        </div>
        <div className="font-mono text-[11px] text-red-300">
          {state.trains.length} train{state.trains.length !== 1 ? "s" : ""} •{" "}
          {isDispatcher ? "Dispatcher" : "Crew"} • Poll: {pollInterval / 1000}s
        </div>
      </div>

      {/* Train list overlay (bottom-left) */}
      <div className="absolute bottom-4 left-16 z-20 rounded-lg border border-slate-700 bg-[#0f172a]/90 p-3 font-mono text-xs backdrop-blur-sm">
        <div className="text-slate-400 font-bold mb-2">Active Trains</div>
        {state.trains.map((train) => (
          <div
            key={train.id}
            className="flex items-center gap-2 py-1 text-slate-300"
          >
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                train.status === "EN_ROUTE"
                  ? "bg-green-400"
                  : train.status === "HOLD"
                    ? "bg-amber-400"
                    : "bg-slate-500"
              }`}
            />
            <span className="font-bold">{train.trainName}</span>
            <span className="text-slate-500">{train.status}</span>
          </div>
        ))}
        {state.trains.length === 0 && (
          <div className="text-slate-500">No trains assigned</div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/map/session-overlay.tsx
git commit -m "feat(map): add session overlay with live banner, polling, and train list"
```

---

### Task 20: Integrate Session Display into Map Editor

**Files:**
- Modify: `app/(dashboard)/dashboard/railroad/[id]/map/page.tsx`
- Modify: `components/map/map-editor.tsx`

- [ ] **Step 1: Detect active session in the map page**

Update the map page to check for an active session:

```tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getCanvasData } from "@/app/actions/canvas";
import { MapEditor } from "@/components/map/map-editor";
import { db } from "@/lib/db";

interface MapPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session?: string; view?: string; location?: string }>;
}

export default async function MapPage({ params, searchParams }: MapPageProps) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id: layoutId } = await params;
  const query = await searchParams;
  const canvasData = await getCanvasData(layoutId);

  // Check for active session
  const activeSession = await db.operatingSession.findFirst({
    where: {
      layoutId,
      status: "IN_PROGRESS",
    },
    select: { id: true, userId: true },
  });

  const isDispatcher = activeSession?.userId === session.user.id;

  return (
    <div className="h-[calc(100vh-theme(spacing.12))] -m-6">
      <MapEditor
        canvasData={JSON.parse(JSON.stringify(canvasData))}
        layoutId={layoutId}
        activeSessionId={activeSession?.id ?? null}
        isDispatcher={isDispatcher}
        initialView={query.view as "overview" | "detail" | undefined}
        initialDetailLocationId={query.location ?? null}
      />
    </div>
  );
}
```

- [ ] **Step 2: Add session overlay to MapEditor**

In `components/map/map-editor.tsx`, add new props and render the overlay:

```typescript
import { SessionOverlay } from "./session-overlay";

interface MapEditorProps {
  canvasData: CanvasData;
  layoutId: string;
  activeSessionId?: string | null;
  isDispatcher?: boolean;
  initialView?: "overview" | "detail";
  initialDetailLocationId?: string | null;
}
```

In the JSX, add the session overlay inside the center area when a session is active:

```tsx
{activeSessionId && (
  <SessionOverlay
    sessionId={activeSessionId}
    isDispatcher={isDispatcher ?? false}
  />
)}
```

Also handle `initialView` and `initialDetailLocationId`:

```typescript
useEffect(() => {
  if (initialView === "detail" && initialDetailLocationId) {
    setDetailLocation(initialDetailLocationId);
  }
}, [initialView, initialDetailLocationId, setDetailLocation]);
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/dashboard/railroad/[id]/map/page.tsx components/map/map-editor.tsx
git commit -m "feat(map): integrate session display with active session detection and multi-screen query params"
```

---

### Task 21: Final Verification

- [ ] **Step 1: Run lint**

```bash
npm run lint
```

Fix any issues.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: Clean build with no errors.

- [ ] **Step 3: Manual smoke test**

Start dev server and test the complete flow:

```bash
npm run dev
```

Verify:
1. "Map" appears in sidebar
2. Empty canvas loads with toolbar and properties panel
3. Add location via toolbar → click canvas → fill form → node appears
4. Add a second location → use draw track tool to connect them
5. Drag a location → grid snapping works → auto-saves
6. Select a node → properties panel shows details
7. Select an edge → properties panel shows track info
8. Double-click a node → detail view renders with breadcrumb
9. Click back → returns to overview
10. Keyboard shortcuts (V, L, T, H, Delete) work
11. Fullscreen toggle works

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(map): address lint and build issues from map editor implementation"
```
