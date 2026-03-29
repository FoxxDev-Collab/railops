# Map Editor Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the map page into a three-tab editor (Locations, Track Layout, Yard Detail) with survey/topo cartographic visual style, waypoint-based track drawing, and full yard spatial editing.

**Architecture:** Tab system wraps existing ReactFlow canvas (Locations tab unchanged). Track Layout adds SVG overlay for topo-style track rendering with waypoints. Yard Detail is an independent SVG canvas with pan/zoom per-location. All tabs share toolbar and properties panel, which adapt contextually. Yard editor auto-creates YardTrack/Industry DB records.

**Tech Stack:** Next.js 16, React 19, ReactFlow 12, Zustand 5, Prisma (Neon Postgres), SVG for track rendering, Tailwind CSS v4 with OKLch theme variables.

---

### Task 1: Add Tab Bar Component and Wire Into Map Editor

**Files:**
- Create: `components/map/map-tab-bar.tsx`
- Modify: `components/map/map-editor.tsx`
- Modify: `components/map/use-map-store.ts`

- [ ] **Step 1: Add tab state to the Zustand store**

In `components/map/use-map-store.ts`, add a `MapTab` type and store fields:

```typescript
// Add to the top of the file, after the Tool type:
export type MapTab = "locations" | "track-layout" | "yard-detail";

// Add to the MapStore interface:
  activeTab: MapTab;
  setActiveTab: (tab: MapTab) => void;
  yardDetailLocationId: string | null;
  setYardDetailLocation: (id: string | null) => void;

// Add to the create() initializer:
  activeTab: "locations",
  setActiveTab: (tab) => set({ activeTab: tab }),
  yardDetailLocationId: null,
  setYardDetailLocation: (id) => set({ yardDetailLocationId: id }),
```

- [ ] **Step 2: Create the tab bar component**

Create `components/map/map-tab-bar.tsx`:

```tsx
"use client";

import { useMapStore, type MapTab } from "./use-map-store";

interface MapTabBarProps {
  locations: { id: string; name: string; locationType: string }[];
  saveStatus: "saved" | "saving" | "unsaved";
}

const TABS: { id: MapTab; label: string }[] = [
  { id: "locations", label: "Locations" },
  { id: "track-layout", label: "Track Layout" },
  { id: "yard-detail", label: "Yard Detail" },
];

export function MapTabBar({ locations, saveStatus }: MapTabBarProps) {
  const activeTab = useMapStore((s) => s.activeTab);
  const setActiveTab = useMapStore((s) => s.setActiveTab);
  const yardDetailLocationId = useMapStore((s) => s.yardDetailLocationId);
  const setYardDetailLocation = useMapStore((s) => s.setYardDetailLocation);

  return (
    <div className="flex items-center border-b border-border bg-card">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`px-5 py-2 font-mono text-xs transition-colors ${
            activeTab === tab.id
              ? "border-b-2 border-foreground font-bold text-foreground bg-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.label}
        </button>
      ))}

      <div className="flex-1" />

      {/* Location selector for Yard Detail */}
      {activeTab === "yard-detail" && (
        <div className="flex items-center gap-2 px-3">
          <span className="text-muted-foreground font-mono text-[10px] tracking-wider">VIEWING:</span>
          <select
            value={yardDetailLocationId ?? ""}
            onChange={(e) => setYardDetailLocation(e.target.value || null)}
            className="rounded-md border border-border bg-background px-2 py-1 font-mono text-xs text-foreground focus:border-ring focus:outline-none"
          >
            <option value="">Select location...</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Save status */}
      <div className="px-3 font-mono text-xs">
        {saveStatus === "saved" && <span className="text-green-600 dark:text-green-400">Saved</span>}
        {saveStatus === "saving" && <span className="text-amber-600 dark:text-amber-400">Saving...</span>}
        {saveStatus === "unsaved" && <span className="text-muted-foreground">Unsaved</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire tab bar into map-editor.tsx**

Replace the contents of `components/map/map-editor.tsx`. Key changes:
- Import MapTabBar
- Build a locations list from canvasData.nodes for the Yard Detail selector
- Render MapTabBar above the canvas area
- Conditionally render MapCanvas (locations tab), a placeholder for Track Layout, and a placeholder for Yard Detail based on activeTab
- Move save status indicator out of the canvas overlay (it's now in the tab bar)
- When switching to yard-detail, auto-select the currently selected node's location if one is selected

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { MapCanvas, type MapCanvasHandle } from "./map-canvas";
import { MapTabBar } from "./map-tab-bar";
import { MapToolbar } from "./map-toolbar";
import { MapProperties } from "./map-properties";
import { AddLocationForm } from "./add-location-form";
import { SessionOverlay } from "./session-overlay";
import { useMapStore } from "./use-map-store";
import { deleteCanvasElement } from "@/app/actions/canvas";
import { toast } from "sonner";
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
    pathData: Record<string, unknown>;
  }>;
}

interface MapEditorProps {
  canvasData: CanvasData;
  layoutId: string;
  activeSessionId?: string | null;
  isDispatcher?: boolean;
  initialView?: "overview" | "detail";
  initialDetailLocationId?: string | null;
}

function MapEditorInner({ canvasData, layoutId, activeSessionId, isDispatcher, initialView, initialDetailLocationId }: MapEditorProps) {
  const activeTab = useMapStore((s) => s.activeTab);
  const tool = useMapStore((s) => s.tool);
  const setTool = useMapStore((s) => s.setTool);
  const isFullscreen = useMapStore((s) => s.isFullscreen);
  const saveStatus = useMapStore((s) => s.saveStatus);
  const [addLocationPos, setAddLocationPos] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<MapCanvasHandle>(null);

  const locationsList = canvasData.nodes.map((n) => ({
    id: n.locationId,
    name: n.location.name,
    locationType: n.location.locationType,
  }));

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
          if (activeTab === "locations") setTool("add-location");
          break;
        case "t":
          setTool("draw-track");
          break;
        case "h":
          setTool("pan");
          break;
        case "f":
          if (activeTab === "yard-detail") setTool("add-turnout");
          break;
        case "i":
          if (activeTab === "yard-detail") setTool("add-industry");
          break;
        case "escape":
          setTool("select");
          setAddLocationPos(null);
          break;
        case "delete":
        case "backspace":
          handleDelete();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setTool, activeTab]);

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

  const handleLocationCreated = useCallback((node: {
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
  }) => {
    canvasRef.current?.addNode({
      id: node.id,
      type: "location",
      position: { x: node.x, y: node.y },
      data: {
        locationId: node.locationId,
        name: node.location.name,
        locationType: node.location.locationType,
        industriesCount: node.location.industries.length,
        yardTracksCount: node.location.yardTracks.length,
      } satisfies LocationNodeData,
    });

    canvasData.nodes.push(node);
    useMapStore.getState().pushUndo({ type: "add-node", data: { nodeId: node.id } });
    setAddLocationPos(null);
  }, [canvasData]);

  return (
    <div className={`flex flex-col h-full ${isFullscreen ? "fixed inset-0 z-50" : ""}`}>
      <MapTabBar locations={locationsList} saveStatus={saveStatus} />

      <div className="flex flex-1 min-h-0">
        <MapToolbar />

        <div className="relative flex-1">
          {activeTab === "locations" && (
            <>
              <MapCanvas ref={canvasRef} canvasData={canvasData} onAddLocation={setAddLocationPos} />

              {activeSessionId && (
                <SessionOverlay sessionId={activeSessionId} isDispatcher={isDispatcher ?? false} />
              )}

              {/* Tool hint */}
              {tool === "add-location" && !addLocationPos && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 rounded-md bg-primary px-3 py-1.5 font-mono text-xs text-primary-foreground shadow-lg">
                  Click on the canvas to place a new location
                </div>
              )}
              {tool === "draw-track" && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 rounded-md bg-primary px-3 py-1.5 font-mono text-xs text-primary-foreground shadow-lg">
                  Click a location to start, then click another to connect
                </div>
              )}
            </>
          )}

          {activeTab === "track-layout" && (
            <div className="flex items-center justify-center h-full bg-background text-muted-foreground font-mono text-sm">
              Track Layout — coming next
            </div>
          )}

          {activeTab === "yard-detail" && (
            <div className="flex items-center justify-center h-full bg-background text-muted-foreground font-mono text-sm">
              Yard Detail — coming next
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

- [ ] **Step 4: Update the tool type to include yard-specific tools**

In `components/map/use-map-store.ts`, update the Tool type:

```typescript
export type Tool = "select" | "add-location" | "draw-track" | "pan" | "add-turnout" | "add-industry";
```

- [ ] **Step 5: Build and verify**

Run: `npm run build`
Expected: Clean build with no errors. The map page should show the tab bar with three tabs. Locations tab shows the existing map. Track Layout and Yard Detail tabs show placeholder text.

- [ ] **Step 6: Commit**

```bash
git add components/map/map-tab-bar.tsx components/map/map-editor.tsx components/map/use-map-store.ts
git commit -m "feat(map): add three-tab system with tab bar component"
```

---

### Task 2: SVG Track Rendering Utilities (Topo Style)

**Files:**
- Create: `components/map/svg/track-path.tsx`
- Create: `components/map/svg/topo-colors.ts`

These are the shared SVG rendering primitives used by both Track Layout and Yard Detail modes.

- [ ] **Step 1: Create the topo color system**

Create `components/map/svg/topo-colors.ts`:

```typescript
// Survey/topo map color system
// Light mode: dark strokes on cream background
// Dark mode: light strokes on dark background

export const TOPO_TRACK_STYLES = {
  mainline: { strokeWidth: 2.5, tickSpacing: 20, tickLength: 10, dash: undefined },
  branch: { strokeWidth: 1.8, tickSpacing: 25, tickLength: 8, dash: undefined },
  spur: { strokeWidth: 1.2, tickSpacing: 0, tickLength: 0, dash: "6,3" },
} as const;

export const YARD_TRACK_COLORS: Record<string, { light: string; dark: string; label: string }> = {
  ARRIVAL: { light: "#3b6fb5", dark: "#7ab3e0", label: "Arrival" },
  CLASSIFICATION: { light: "#b5873b", dark: "#e0c07a", label: "Classification" },
  DEPARTURE: { light: "#3ba855", dark: "#7ae090", label: "Departure" },
  LEAD: { light: "#222222", dark: "#d4d4d4", label: "Lead" },
  RIP: { light: "#b53b3b", dark: "#e07a7a", label: "RIP" },
  ENGINE_SERVICE: { light: "#7a5ab5", dark: "#b09ae0", label: "Engine Service" },
  CABOOSE: { light: "#b55a8a", dark: "#e09aba", label: "Caboose" },
  RUNAROUND: { light: "#666666", dark: "#aaaaaa", label: "Runaround" },
  SWITCHER_POCKET: { light: "#888888", dark: "#bbbbbb", label: "Switcher Pocket" },
} as const;

export const LOCATION_SIZES: Record<string, number> = {
  YARD: 7,
  PASSENGER_STATION: 7,
  INTERCHANGE: 7,
  JUNCTION: 6,
  STAGING: 6,
  TEAM_TRACK: 5,
  SIDING: 4.5,
} as const;
```

- [ ] **Step 2: Create the SVG track path renderer**

Create `components/map/svg/track-path.tsx`. This renders a track path with perpendicular ticks along it (the classic railroad map symbol):

```tsx
"use client";

import { memo, useMemo } from "react";
import { TOPO_TRACK_STYLES } from "./topo-colors";

interface Point {
  x: number;
  y: number;
}

interface TrackPathProps {
  points: Point[];
  trackType: "mainline" | "branch" | "spur";
  color: string;
  selected?: boolean;
  selectedColor?: string;
  opacity?: number;
}

function buildSmoothPath(points: Point[]): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;
  }

  let d = `M${points[0].x},${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];

    if (i === 0) {
      const mid = { x: (curr.x + next.x) / 2, y: (curr.y + next.y) / 2 };
      d += ` L${mid.x},${mid.y}`;
    }

    if (i < points.length - 2) {
      const nextNext = points[i + 2];
      const mid1 = { x: (curr.x + next.x) / 2, y: (curr.y + next.y) / 2 };
      const mid2 = { x: (next.x + nextNext.x) / 2, y: (next.y + nextNext.y) / 2 };
      if (i > 0) {
        d += ` Q${next.x},${next.y} ${mid2.x},${mid2.y}`;
      } else {
        d += ` Q${next.x},${next.y} ${mid2.x},${mid2.y}`;
      }
    } else {
      d += ` L${next.x},${next.y}`;
    }
  }

  return d;
}

function getPointOnPath(points: Point[], t: number): Point {
  if (points.length < 2) return points[0] ?? { x: 0, y: 0 };

  // Calculate total length segments
  const segments: { start: Point; end: Point; length: number }[] = [];
  let totalLength = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    segments.push({ start: points[i], end: points[i + 1], length: len });
    totalLength += len;
  }

  const targetDist = t * totalLength;
  let accumulated = 0;

  for (const seg of segments) {
    if (accumulated + seg.length >= targetDist) {
      const segT = (targetDist - accumulated) / seg.length;
      return {
        x: seg.start.x + (seg.end.x - seg.start.x) * segT,
        y: seg.start.y + (seg.end.y - seg.start.y) * segT,
      };
    }
    accumulated += seg.length;
  }

  return points[points.length - 1];
}

function getNormalAtPoint(points: Point[], t: number): { nx: number; ny: number } {
  const epsilon = 0.001;
  const p1 = getPointOnPath(points, Math.max(0, t - epsilon));
  const p2 = getPointOnPath(points, Math.min(1, t + epsilon));
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return { nx: 0, ny: -1 };
  return { nx: -dy / len, ny: dx / len };
}

function getPathLength(points: Point[]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

function TrackPathComponent({ points, trackType, color, selected, selectedColor, opacity = 1 }: TrackPathProps) {
  const style = TOPO_TRACK_STYLES[trackType];
  const pathD = useMemo(() => buildSmoothPath(points), [points]);

  const ticks = useMemo(() => {
    if (style.tickSpacing === 0 || points.length < 2) return [];

    const totalLength = getPathLength(points);
    const tickCount = Math.floor(totalLength / style.tickSpacing);
    const result: { x1: number; y1: number; x2: number; y2: number }[] = [];

    for (let i = 1; i <= tickCount; i++) {
      const t = (i * style.tickSpacing) / totalLength;
      if (t > 1) break;
      const pt = getPointOnPath(points, t);
      const { nx, ny } = getNormalAtPoint(points, t);
      const half = style.tickLength / 2;
      result.push({
        x1: pt.x + nx * half,
        y1: pt.y + ny * half,
        x2: pt.x - nx * half,
        y2: pt.y - ny * half,
      });
    }
    return result;
  }, [points, style.tickSpacing, style.tickLength]);

  const strokeColor = selected ? (selectedColor ?? color) : color;

  return (
    <g opacity={opacity}>
      {/* Selection highlight */}
      {selected && (
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth={style.strokeWidth + 4} opacity={0.15} strokeLinecap="round" />
      )}

      {/* Main track line */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={style.strokeWidth}
        strokeLinecap="round"
        strokeDasharray={style.dash}
      />

      {/* Perpendicular ticks */}
      {ticks.map((tick, i) => (
        <line
          key={i}
          x1={tick.x1}
          y1={tick.y1}
          x2={tick.x2}
          y2={tick.y2}
          stroke={strokeColor}
          strokeWidth={style.strokeWidth * 0.55}
          opacity={0.7}
        />
      ))}
    </g>
  );
}

export const TrackPath = memo(TrackPathComponent);
export { buildSmoothPath, getPointOnPath, getNormalAtPoint, getPathLength };
export type { Point };
```

- [ ] **Step 3: Build and verify**

Run: `npm run build`
Expected: Clean build. No runtime testing needed yet — these are rendering primitives.

- [ ] **Step 4: Commit**

```bash
git add components/map/svg/
git commit -m "feat(map): add SVG track path renderer with topo-style ticks"
```

---

### Task 3: Track Layout Canvas with Topo-Style Rendering

**Files:**
- Create: `components/map/track-layout-canvas.tsx`
- Modify: `components/map/map-editor.tsx`
- Modify: `app/actions/canvas.ts`

- [ ] **Step 1: Add updateCanvasEdge server action**

Append to `app/actions/canvas.ts`:

```typescript
const updateCanvasEdgeSchema = z.object({
  id: z.string(),
  pathData: z.object({ waypoints: z.array(z.object({ x: z.number(), y: z.number() })) }).optional(),
  trackType: z.enum(["mainline", "branch", "spur"]).optional(),
  label: z.string().optional().nullable(),
});

export async function updateCanvasEdge(values: z.infer<typeof updateCanvasEdgeSchema>) {
  const user = await getAuthenticatedUser();
  const validated = updateCanvasEdgeSchema.parse(values);

  const edge = await db.canvasEdge.findUnique({
    where: { id: validated.id },
    include: { canvas: { select: { layout: { select: { id: true } } } } },
  });
  if (!edge) return { error: "Edge not found" };
  await verifyLayoutAccess(edge.canvas.layout.id, user.id);

  const data: Record<string, unknown> = {};
  if (validated.pathData !== undefined) data.pathData = validated.pathData;
  if (validated.trackType !== undefined) data.trackType = validated.trackType;
  if (validated.label !== undefined) data.label = validated.label;

  const updated = await db.canvasEdge.update({
    where: { id: validated.id },
    data,
  });

  return { success: true, edge: updated };
}
```

Also update the `createCanvasEdge` function to accept optional `pathData`:

```typescript
// In createCanvasEdgeSchema, add:
  pathData: z.object({ waypoints: z.array(z.object({ x: z.number(), y: z.number() })) }).optional(),

// In the createCanvasEdge function, in the db.canvasEdge.create data:
  pathData: validated.pathData ?? {},
```

- [ ] **Step 2: Create Track Layout Canvas**

Create `components/map/track-layout-canvas.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { TrackPath, type Point } from "./svg/track-path";
import { TOPO_TRACK_STYLES, LOCATION_SIZES } from "./svg/topo-colors";
import { useMapStore } from "./use-map-store";
import { createCanvasEdge, updateCanvasEdge } from "@/app/actions/canvas";
import { useAutoSave } from "./use-auto-save";
import { toast } from "sonner";

interface CanvasNode {
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
}

interface CanvasEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  trackType: string;
  label: string | null;
  pathData: { waypoints?: Point[] } & Record<string, unknown>;
}

interface TrackLayoutCanvasProps {
  canvasId: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  gridSize: number;
}

export function TrackLayoutCanvas({ canvasId, nodes, edges: initialEdges, gridSize }: TrackLayoutCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 800, height: 600 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const tool = useMapStore((s) => s.tool);
  const selectedEdgeId = useMapStore((s) => s.selectedEdgeId);
  const selectEdge = useMapStore((s) => s.selectEdge);
  const selectNode = useMapStore((s) => s.selectNode);
  const selectedNodeId = useMapStore((s) => s.selectedNodeId);
  const clearSelection = useMapStore((s) => s.clearSelection);
  const drawSourceNodeId = useMapStore((s) => s.drawSourceNodeId);
  const setDrawSource = useMapStore((s) => s.setDrawSource);
  const pushUndo = useMapStore((s) => s.pushUndo);

  const [edges, setEdges] = useState(initialEdges);
  const [drawingWaypoints, setDrawingWaypoints] = useState<Point[]>([]);
  const [dragPoint, setDragPoint] = useState<Point | null>(null);
  const [selectedWaypointIdx, setSelectedWaypointIdx] = useState<number | null>(null);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    obs.observe(container);
    return () => obs.disconnect();
  }, []);

  // Fit view on mount
  useEffect(() => {
    if (nodes.length === 0) return;
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const minX = Math.min(...xs) - 80;
    const minY = Math.min(...ys) - 80;
    const maxX = Math.max(...xs) + 80;
    const maxY = Math.max(...ys) + 80;
    setViewBox({ x: minX, y: minY, width: maxX - minX, height: maxY - minY });
  }, [nodes]);

  const svgToCanvas = useCallback((clientX: number, clientY: number): Point => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const relX = (clientX - rect.left) / rect.width;
    const relY = (clientY - rect.top) / rect.height;
    return {
      x: viewBox.x + relX * viewBox.width,
      y: viewBox.y + relY * viewBox.height,
    };
  }, [viewBox]);

  const snapToGrid = useCallback((p: Point): Point => ({
    x: Math.round(p.x / gridSize) * gridSize,
    y: Math.round(p.y / gridSize) * gridSize,
  }), [gridSize]);

  // Build edge paths (source location → waypoints → target location)
  const edgePaths = useMemo(() => {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    return edges.map((edge) => {
      const source = nodeMap.get(edge.sourceNodeId);
      const target = nodeMap.get(edge.targetNodeId);
      if (!source || !target) return null;

      const waypoints = edge.pathData?.waypoints ?? [];
      const points: Point[] = [
        { x: source.x, y: source.y },
        ...waypoints,
        { x: target.x, y: target.y },
      ];

      return { edge, points, source, target };
    }).filter(Boolean) as { edge: CanvasEdge; points: Point[]; source: CanvasNode; target: CanvasNode }[];
  }, [edges, nodes]);

  // Drawing in progress path
  const drawingPath = useMemo(() => {
    if (!drawSourceNodeId || drawingWaypoints.length === 0 && !dragPoint) return null;
    const sourceNode = nodes.find((n) => n.id === drawSourceNodeId);
    if (!sourceNode) return null;

    const points: Point[] = [
      { x: sourceNode.x, y: sourceNode.y },
      ...drawingWaypoints,
    ];
    if (dragPoint) points.push(dragPoint);
    return points;
  }, [drawSourceNodeId, drawingWaypoints, dragPoint, nodes]);

  // Track click handler
  const handleTrackClick = useCallback((edgeId: string) => {
    if (tool === "select") {
      selectEdge(edgeId);
      setSelectedWaypointIdx(null);
    }
  }, [tool, selectEdge]);

  // Waypoint click handler
  const handleWaypointClick = useCallback((edgeId: string, waypointIdx: number) => {
    if (tool === "select") {
      selectEdge(edgeId);
      setSelectedWaypointIdx(waypointIdx);
    }
  }, [tool, selectEdge]);

  // Location click handler
  const handleLocationClick = useCallback(async (nodeId: string) => {
    if (tool === "select") {
      selectNode(nodeId);
      setSelectedWaypointIdx(null);
      return;
    }

    if (tool === "draw-track") {
      if (!drawSourceNodeId) {
        // Start drawing
        setDrawSource(nodeId);
        setDrawingWaypoints([]);
      } else if (nodeId !== drawSourceNodeId) {
        // Finish drawing — create edge with waypoints
        const result = await createCanvasEdge({
          canvasId,
          sourceNodeId: drawSourceNodeId,
          targetNodeId: nodeId,
          trackType: "mainline",
          pathData: { waypoints: drawingWaypoints },
        });

        if (result.success && result.edge) {
          setEdges((prev) => [...prev, {
            ...result.edge,
            pathData: result.edge.pathData as CanvasEdge["pathData"],
          }]);
          pushUndo({ type: "add-edge", data: { edgeId: result.edge.id } });
          toast.success("Track section created");
        } else if (result.error) {
          toast.error(result.error);
        }

        setDrawSource(null);
        setDrawingWaypoints([]);
        setDragPoint(null);
      }
    }
  }, [tool, drawSourceNodeId, drawingWaypoints, canvasId, setDrawSource, pushUndo, selectNode]);

  // Canvas mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;

    if (tool === "pan" || (tool === "select" && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (tool === "draw-track" && drawSourceNodeId) {
      // Start dragging a new waypoint
      const canvasPos = svgToCanvas(e.clientX, e.clientY);
      setDragPoint(snapToGrid(canvasPos));
    }
  }, [tool, drawSourceNodeId, svgToCanvas, snapToGrid]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const dx = (e.clientX - panStart.x) / dimensions.width * viewBox.width;
      const dy = (e.clientY - panStart.y) / dimensions.height * viewBox.height;
      setViewBox((vb) => ({ ...vb, x: vb.x - dx, y: vb.y - dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (tool === "draw-track" && drawSourceNodeId && dragPoint) {
      const canvasPos = svgToCanvas(e.clientX, e.clientY);
      setDragPoint(snapToGrid(canvasPos));
    }
  }, [isPanning, panStart, dimensions, viewBox, tool, drawSourceNodeId, dragPoint, svgToCanvas, snapToGrid]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (tool === "draw-track" && drawSourceNodeId && dragPoint) {
      // Commit the waypoint
      setDrawingWaypoints((prev) => [...prev, dragPoint]);
      setDragPoint(null);
    }
  }, [isPanning, tool, drawSourceNodeId, dragPoint]);

  // Zoom with scroll
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    const mousePos = svgToCanvas(e.clientX, e.clientY);

    setViewBox((vb) => {
      const newWidth = vb.width * zoomFactor;
      const newHeight = vb.height * zoomFactor;
      return {
        x: mousePos.x - (mousePos.x - vb.x) * zoomFactor,
        y: mousePos.y - (mousePos.y - vb.y) * zoomFactor,
        width: newWidth,
        height: newHeight,
      };
    });
  }, [svgToCanvas]);

  // Cancel drawing on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drawSourceNodeId) {
        setDrawSource(null);
        setDrawingWaypoints([]);
        setDragPoint(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawSourceNodeId, setDrawSource]);

  const trackColor = "var(--foreground)";
  const trackColorMuted = "var(--muted-foreground)";

  return (
    <div
      ref={containerRef}
      className="h-full w-full bg-background"
      style={{ cursor: isPanning ? "grabbing" : tool === "pan" ? "grab" : tool === "draw-track" ? "crosshair" : "default" }}
    >
      <svg
        width={dimensions.width}
        height={dimensions.height}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className="select-none"
      >
        {/* Grid dots */}
        <defs>
          <pattern id="topo-grid" x="0" y="0" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
            <circle cx={gridSize / 2} cy={gridSize / 2} r="0.5" className="fill-muted-foreground" opacity="0.2" />
          </pattern>
        </defs>
        <rect x={viewBox.x} y={viewBox.y} width={viewBox.width} height={viewBox.height} fill="url(#topo-grid)" />

        {/* Track sections */}
        {edgePaths.map(({ edge, points }) => (
          <g
            key={edge.id}
            onClick={(e) => { e.stopPropagation(); handleTrackClick(edge.id); }}
            className="cursor-pointer"
          >
            {/* Hit area (invisible wider path for easier clicking) */}
            <path
              d={`M${points.map((p) => `${p.x},${p.y}`).join(" L")}`}
              fill="none"
              stroke="transparent"
              strokeWidth={12}
            />
            <TrackPath
              points={points}
              trackType={edge.trackType as "mainline" | "branch" | "spur"}
              color={trackColorMuted}
              selected={selectedEdgeId === edge.id}
              selectedColor={trackColor}
            />

            {/* Track label */}
            {edge.label && (
              <text
                x={(points[0].x + points[points.length - 1].x) / 2}
                y={(points[0].y + points[points.length - 1].y) / 2 - 12}
                textAnchor="middle"
                className="fill-muted-foreground font-mono text-[8px]"
                opacity={0.6}
              >
                {edge.label}
              </text>
            )}

            {/* Waypoints (only visible when edge is selected) */}
            {selectedEdgeId === edge.id && (edge.pathData?.waypoints ?? []).map((wp, i) => (
              <circle
                key={i}
                cx={wp.x}
                cy={wp.y}
                r={selectedWaypointIdx === i ? 5 : 3}
                className={selectedWaypointIdx === i
                  ? "fill-none stroke-foreground"
                  : "fill-foreground"}
                opacity={selectedWaypointIdx === i ? 1 : 0.25}
                strokeWidth={selectedWaypointIdx === i ? 1.5 : 0}
                strokeDasharray={selectedWaypointIdx === i ? "3,2" : undefined}
                onClick={(e) => { e.stopPropagation(); handleWaypointClick(edge.id, i); }}
                style={{ cursor: "pointer" }}
              />
            ))}
          </g>
        ))}

        {/* Drawing in progress */}
        {drawingPath && (
          <TrackPath
            points={drawingPath}
            trackType="mainline"
            color={trackColor}
            opacity={0.5}
          />
        )}

        {/* Location circles */}
        {nodes.map((node) => {
          const r = LOCATION_SIZES[node.location.locationType] ?? 5;
          const isDrawSource = drawSourceNodeId === node.id;
          const isSelected = selectedNodeId === node.id;

          return (
            <g
              key={node.id}
              onClick={(e) => { e.stopPropagation(); handleLocationClick(node.id); }}
              className="cursor-pointer"
            >
              {/* Selection ring */}
              {(isSelected || isDrawSource) && (
                <circle cx={node.x} cy={node.y} r={r + 3} className="fill-none stroke-foreground" strokeWidth={1.5} strokeDasharray={isDrawSource ? "3,2" : undefined} />
              )}

              {/* Location circle */}
              <circle
                cx={node.x}
                cy={node.y}
                r={r}
                className="fill-background stroke-foreground"
                strokeWidth={2}
              />

              {/* Name label (serif italic) */}
              <text
                x={node.x}
                y={node.y + r + 14}
                textAnchor="middle"
                className="fill-foreground"
                style={{ fontFamily: "Georgia, serif", fontSize: r >= 6 ? 11 : 9, fontStyle: "italic", fontWeight: r >= 7 ? "bold" : "normal" }}
              >
                {node.location.name}
              </text>

              {/* Type label */}
              <text
                x={node.x}
                y={node.y + r + 25}
                textAnchor="middle"
                className="fill-muted-foreground font-mono text-[7px]"
              >
                {node.location.locationType.replace(/_/g, " ")}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tool hint */}
      {tool === "draw-track" && !drawSourceNodeId && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 rounded-md bg-primary px-3 py-1.5 font-mono text-xs text-primary-foreground shadow-lg">
          Click a location to start drawing track
        </div>
      )}
      {tool === "draw-track" && drawSourceNodeId && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 rounded-md bg-primary px-3 py-1.5 font-mono text-xs text-primary-foreground shadow-lg">
          Drag to place waypoints · click a location to finish · Esc to cancel
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Wire Track Layout Canvas into map-editor.tsx**

Replace the Track Layout placeholder in `map-editor.tsx`:

```tsx
// Add import at top:
import { TrackLayoutCanvas } from "./track-layout-canvas";

// Replace the track-layout placeholder block:
          {activeTab === "track-layout" && (
            <TrackLayoutCanvas
              canvasId={canvasData.id}
              nodes={canvasData.nodes}
              edges={canvasData.edges.map((e) => ({
                ...e,
                pathData: (e.pathData ?? {}) as { waypoints?: { x: number; y: number }[] } & Record<string, unknown>,
              }))}
              gridSize={canvasData.gridSize}
            />
          )}
```

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Expected: Clean build. Track Layout tab should render the topo-style map with location circles and track sections.

- [ ] **Step 5: Commit**

```bash
git add components/map/track-layout-canvas.tsx app/actions/canvas.ts components/map/map-editor.tsx
git commit -m "feat(map): add track layout canvas with topo-style SVG rendering and waypoints"
```

---

### Task 4: Track Layout Properties Panel

**Files:**
- Create: `components/map/track-layout-properties.tsx`
- Modify: `components/map/map-properties.tsx`

- [ ] **Step 1: Create the Track Layout properties panel**

Create `components/map/track-layout-properties.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";
import { useMapStore } from "./use-map-store";
import { updateCanvasEdge } from "@/app/actions/canvas";
import { toast } from "sonner";

interface TrackSection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  trackType: string;
  label: string | null;
  pathData: { waypoints?: { x: number; y: number }[] };
}

interface LocationInfo {
  id: string;
  name: string;
  locationType: string;
}

interface TrackLayoutPropertiesProps {
  edges: TrackSection[];
  nodeMap: Map<string, LocationInfo>;
}

const TRACK_TYPES = ["mainline", "branch", "spur"] as const;

export function TrackLayoutProperties({ edges, nodeMap }: TrackLayoutPropertiesProps) {
  const selectedEdgeId = useMapStore((s) => s.selectedEdgeId);
  const selectedNodeId = useMapStore((s) => s.selectedNodeId);

  const selectedEdge = selectedEdgeId ? edges.find((e) => e.id === selectedEdgeId) : null;
  const selectedLocation = selectedNodeId ? nodeMap.get(selectedNodeId) : null;

  if (selectedLocation) {
    return (
      <div className="w-[260px] border-l border-border bg-card p-4 font-mono text-xs overflow-y-auto">
        <div className="text-foreground font-bold mb-3">Location</div>
        <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">NAME</div>
        <div className="text-foreground font-bold mb-3" style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}>
          {selectedLocation.name}
        </div>
        <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">TYPE</div>
        <div className="text-foreground/80 mb-3">{selectedLocation.locationType.replace(/_/g, " ")}</div>
      </div>
    );
  }

  if (!selectedEdge) {
    return (
      <div className="w-[260px] border-l border-border bg-card p-4 font-mono text-xs">
        <div className="text-foreground font-bold mb-3">Properties</div>
        <div className="text-muted-foreground">Select a track section or location to view details.</div>
      </div>
    );
  }

  return <TrackEdgeProperties edge={selectedEdge} nodeMap={nodeMap} />;
}

function TrackEdgeProperties({ edge, nodeMap }: { edge: TrackSection; nodeMap: Map<string, LocationInfo> }) {
  const [label, setLabel] = useState(edge.label ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const source = nodeMap.get(edge.sourceNodeId);
  const target = nodeMap.get(edge.targetNodeId);
  const waypointCount = edge.pathData?.waypoints?.length ?? 0;

  const handleTypeChange = useCallback(async (newType: string) => {
    setIsSaving(true);
    const result = await updateCanvasEdge({ id: edge.id, trackType: newType as "mainline" | "branch" | "spur" });
    if (result.error) toast.error(result.error);
    setIsSaving(false);
  }, [edge.id]);

  const handleLabelBlur = useCallback(async () => {
    if (label === (edge.label ?? "")) return;
    setIsSaving(true);
    const result = await updateCanvasEdge({ id: edge.id, label: label || null });
    if (result.error) toast.error(result.error);
    setIsSaving(false);
  }, [edge.id, label, edge.label]);

  return (
    <div className="w-[260px] border-l border-border bg-card p-4 font-mono text-xs overflow-y-auto">
      <div className="text-foreground font-bold mb-3">
        Track Section {isSaving && <span className="text-muted-foreground font-normal ml-1">saving...</span>}
      </div>

      <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">TYPE</div>
      <div className="flex gap-1 mb-3">
        {TRACK_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => handleTypeChange(type)}
            className={`px-2 py-1 rounded text-[10px] border transition-colors ${
              edge.trackType === type
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">FROM</div>
      <div className="text-foreground/80 mb-3">
        {source?.name ?? "Unknown"}{" "}
        <span className="text-muted-foreground text-[9px]">{source?.locationType.replace(/_/g, " ")}</span>
      </div>

      <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">TO</div>
      <div className="text-foreground/80 mb-3">
        {target?.name ?? "Unknown"}{" "}
        <span className="text-muted-foreground text-[9px]">{target?.locationType.replace(/_/g, " ")}</span>
      </div>

      <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">WAYPOINTS</div>
      <div className="text-foreground/80 mb-3">{waypointCount} point{waypointCount !== 1 ? "s" : ""}</div>

      <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">LABEL</div>
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={handleLabelBlur}
        placeholder="e.g. Summit Main"
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-foreground placeholder:text-muted-foreground/50 focus:border-ring focus:outline-none mb-3"
      />
    </div>
  );
}
```

- [ ] **Step 2: Wire into map-properties.tsx**

Modify `components/map/map-properties.tsx` to delegate to the track layout panel when that tab is active. Wrap the existing component to check the active tab:

```tsx
// At the top, add imports:
import { TrackLayoutProperties } from "./track-layout-properties";

// Before the main export, add a wrapper component:
interface MapPropertiesWrapperProps {
  layoutId: string;
  activeTab: string;
  edges?: Array<{
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    trackType: string;
    label: string | null;
    pathData: Record<string, unknown>;
  }>;
  nodeMap?: Map<string, { id: string; name: string; locationType: string }>;
}

export function MapPropertiesRouter({ layoutId, activeTab, edges, nodeMap }: MapPropertiesWrapperProps) {
  if (activeTab === "track-layout" && edges && nodeMap) {
    return (
      <TrackLayoutProperties
        edges={edges.map((e) => ({ ...e, pathData: e.pathData as { waypoints?: { x: number; y: number }[] } }))}
        nodeMap={nodeMap}
      />
    );
  }

  return <MapProperties layoutId={layoutId} />;
}
```

Then update `map-editor.tsx` to use `MapPropertiesRouter` instead of `MapProperties`:

```tsx
// Import change:
import { MapPropertiesRouter } from "./map-properties";

// Build nodeMap in MapEditorInner:
  const nodeMap = useMemo(() => new Map(
    canvasData.nodes.map((n) => [n.id, { id: n.locationId, name: n.location.name, locationType: n.location.locationType }])
  ), [canvasData.nodes]);

// Replace the MapProperties render:
        {addLocationPos ? (
          <AddLocationForm ... />
        ) : (
          <MapPropertiesRouter
            layoutId={layoutId}
            activeTab={activeTab}
            edges={canvasData.edges}
            nodeMap={nodeMap}
          />
        )}
```

- [ ] **Step 3: Build and verify**

Run: `npm run build`
Expected: Clean build. Selecting a track section in Track Layout mode shows the properties panel with type toggle, origin/destination, waypoint count, and editable label.

- [ ] **Step 4: Commit**

```bash
git add components/map/track-layout-properties.tsx components/map/map-properties.tsx components/map/map-editor.tsx
git commit -m "feat(map): add track layout properties panel with type toggle and label editing"
```

---

### Task 5: Adapt Toolbar Per Tab

**Files:**
- Modify: `components/map/map-toolbar.tsx`
- Modify: `components/map/map-editor.tsx`

- [ ] **Step 1: Update map-toolbar.tsx to accept activeTab and show context-appropriate tools**

```tsx
"use client";

import { useMapStore, type Tool, type MapTab } from "./use-map-store";
import {
  MousePointer2, Plus, Slash, Hand, ZoomIn, ZoomOut, Maximize,
  GitBranch, Factory
} from "lucide-react";
import { useReactFlow } from "@xyflow/react";

interface ToolDef {
  id: Tool;
  icon: typeof MousePointer2;
  label: string;
  shortcut: string;
  tabs: MapTab[];
}

const tools: ToolDef[] = [
  { id: "select", icon: MousePointer2, label: "Select", shortcut: "V", tabs: ["locations", "track-layout", "yard-detail"] },
  { id: "add-location", icon: Plus, label: "Add Location", shortcut: "L", tabs: ["locations"] },
  { id: "draw-track", icon: Slash, label: "Draw Track", shortcut: "T", tabs: ["locations", "track-layout", "yard-detail"] },
  { id: "add-turnout", icon: GitBranch, label: "Add Turnout", shortcut: "F", tabs: ["yard-detail"] },
  { id: "add-industry", icon: Factory, label: "Add Industry", shortcut: "I", tabs: ["yard-detail"] },
  { id: "pan", icon: Hand, label: "Pan", shortcut: "H", tabs: ["locations", "track-layout", "yard-detail"] },
];

export function MapToolbar() {
  const activeTab = useMapStore((s) => s.activeTab);
  const tool = useMapStore((s) => s.tool);
  const setTool = useMapStore((s) => s.setTool);
  const isFullscreen = useMapStore((s) => s.isFullscreen);
  const toggleFullscreen = useMapStore((s) => s.toggleFullscreen);

  // useReactFlow is only available in locations tab (ReactFlow context)
  // For other tabs, zoom controls are no-ops for now
  let zoomIn = () => {};
  let zoomOut = () => {};
  let fitView = (_opts?: { padding?: number }) => {};

  try {
    const rf = useReactFlow();
    zoomIn = rf.zoomIn;
    zoomOut = rf.zoomOut;
    fitView = rf.fitView;
  } catch {
    // Not inside ReactFlow context (track-layout or yard-detail tab)
  }

  const visibleTools = tools.filter((t) => t.tabs.includes(activeTab));

  return (
    <div className="flex w-14 flex-col items-center border-r border-border bg-card py-3 gap-2">
      {visibleTools.map((t) => (
        <button
          key={t.id}
          onClick={() => setTool(t.id)}
          title={`${t.label} (${t.shortcut})`}
          className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
            tool === t.id
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          }`}
        >
          <t.icon className="h-4 w-4" />
        </button>
      ))}

      <div className="flex-1" />

      <button
        onClick={() => fitView({ padding: 0.2 })}
        title="Fit to content"
        className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        <Maximize className="h-4 w-4" />
      </button>
      <button
        onClick={() => zoomIn()}
        title="Zoom in"
        className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        <ZoomIn className="h-4 w-4" />
      </button>
      <button
        onClick={() => zoomOut()}
        title="Zoom out"
        className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        <ZoomOut className="h-4 w-4" />
      </button>
      <button
        onClick={toggleFullscreen}
        title="Toggle fullscreen"
        className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
          isFullscreen
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        }`}
      >
        <Maximize className="h-4 w-4" />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Build and verify**

Run: `npm run build`
Expected: Clean build. Switching tabs changes the visible tools in the toolbar.

- [ ] **Step 3: Commit**

```bash
git add components/map/map-toolbar.tsx
git commit -m "feat(map): adapt toolbar tools per active tab"
```

---

### Task 6: Yard Detail Server Actions

**Files:**
- Create: `app/actions/yard-canvas.ts`

- [ ] **Step 1: Create yard canvas server actions**

Create `app/actions/yard-canvas.ts`:

```typescript
"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// ── Helpers ──

async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

async function verifyLocationAccess(locationId: string, userId: string) {
  const location = await db.location.findFirst({
    where: {
      id: locationId,
      layout: {
        OR: [
          { userId },
          { crewMembers: { some: { userId, acceptedAt: { not: null }, removedAt: null } } },
        ],
      },
    },
    include: { layout: { select: { id: true } } },
  });
  if (!location) throw new Error("Location not found or access denied");
  return location;
}

// ── Schemas ──

const trackElementSchema = z.object({
  id: z.string(),
  type: z.literal("track"),
  points: z.array(z.object({ x: z.number(), y: z.number() })),
  trackType: z.string().default("LEAD"),
  name: z.string().optional(),
  capacity: z.number().optional(),
  length: z.number().optional(),
});

const turnoutElementSchema = z.object({
  id: z.string(),
  type: z.literal("turnout"),
  parentTrackId: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
});

const industryElementSchema = z.object({
  id: z.string(),
  type: z.literal("industry"),
  position: z.object({ x: z.number(), y: z.number() }),
  width: z.number().default(120),
  height: z.number().default(24),
  connectedTrackId: z.string().optional(),
  name: z.string().optional(),
  spotCount: z.number().optional(),
});

const elementSchema = z.discriminatedUnion("type", [
  trackElementSchema,
  turnoutElementSchema,
  industryElementSchema,
]);

// ── Actions ──

export async function getYardCanvasData(locationId: string) {
  const user = await getAuthenticatedUser();
  const location = await verifyLocationAccess(locationId, user.id);

  let canvas = await db.locationCanvas.findUnique({
    where: { locationId },
  });

  if (!canvas) {
    canvas = await db.locationCanvas.create({
      data: { locationId },
    });
  }

  const yardTracks = await db.yardTrack.findMany({
    where: { locationId },
    orderBy: { sortOrder: "asc" },
  });

  const industries = await db.industry.findMany({
    where: { locationId },
  });

  return {
    canvas,
    yardTracks,
    industries,
    locationName: location.name,
    locationType: location.locationType,
    layoutId: location.layout.id,
  };
}

export async function saveYardCanvas(values: {
  locationCanvasId: string;
  trackElements: unknown[];
}) {
  const user = await getAuthenticatedUser();

  const canvas = await db.locationCanvas.findUnique({
    where: { id: values.locationCanvasId },
    include: { location: { include: { layout: { select: { id: true } } } } },
  });
  if (!canvas) return { error: "Canvas not found" };
  await verifyLocationAccess(canvas.locationId, user.id);

  await db.locationCanvas.update({
    where: { id: values.locationCanvasId },
    data: { trackElements: values.trackElements as any },
  });

  return { success: true };
}

export async function createYardTrackElement(values: {
  locationId: string;
  element: z.infer<typeof trackElementSchema>;
}) {
  const user = await getAuthenticatedUser();
  const location = await verifyLocationAccess(values.locationId, user.id);
  const validated = trackElementSchema.parse(values.element);

  const result = await db.$transaction(async (tx) => {
    // Create YardTrack record
    const yardTrack = await tx.yardTrack.create({
      data: {
        name: validated.name ?? `Track ${Date.now().toString(36)}`,
        trackType: validated.trackType as any,
        capacity: validated.capacity ?? 8,
        length: validated.length,
        locationId: values.locationId,
        userId: user.id,
      },
    });

    // Update the element with the yardTrackId and add to canvas
    const canvas = await tx.locationCanvas.findUnique({
      where: { locationId: values.locationId },
    });

    if (canvas) {
      const elements = (canvas.trackElements as any[]) ?? [];
      elements.push({ ...validated, yardTrackId: yardTrack.id });
      await tx.locationCanvas.update({
        where: { id: canvas.id },
        data: { trackElements: elements },
      });
    }

    return { element: { ...validated, yardTrackId: yardTrack.id }, yardTrack };
  });

  return { success: true, ...result };
}

export async function createIndustryElement(values: {
  locationId: string;
  element: z.infer<typeof industryElementSchema>;
}) {
  const user = await getAuthenticatedUser();
  const location = await verifyLocationAccess(values.locationId, user.id);
  const validated = industryElementSchema.parse(values.element);

  const result = await db.$transaction(async (tx) => {
    const industry = await tx.industry.create({
      data: {
        name: validated.name ?? `Industry ${Date.now().toString(36)}`,
        type: "General",
        spotCount: validated.spotCount ?? 1,
        locationId: values.locationId,
        userId: user.id,
      },
    });

    const canvas = await tx.locationCanvas.findUnique({
      where: { locationId: values.locationId },
    });

    if (canvas) {
      const elements = (canvas.trackElements as any[]) ?? [];
      elements.push({ ...validated, industryId: industry.id });
      await tx.locationCanvas.update({
        where: { id: canvas.id },
        data: { trackElements: elements },
      });
    }

    return { element: { ...validated, industryId: industry.id }, industry };
  });

  return { success: true, ...result };
}

export async function createTurnoutElement(values: {
  locationId: string;
  element: z.infer<typeof turnoutElementSchema>;
}) {
  const user = await getAuthenticatedUser();
  await verifyLocationAccess(values.locationId, user.id);
  const validated = turnoutElementSchema.parse(values.element);

  const canvas = await db.locationCanvas.findUnique({
    where: { locationId: values.locationId },
  });

  if (!canvas) return { error: "Canvas not found" };

  const elements = (canvas.trackElements as any[]) ?? [];
  elements.push(validated);
  await db.locationCanvas.update({
    where: { id: canvas.id },
    data: { trackElements: elements },
  });

  return { success: true, element: validated };
}

export async function updateYardElement(values: {
  locationCanvasId: string;
  elementId: string;
  updates: Record<string, unknown>;
}) {
  const user = await getAuthenticatedUser();

  const canvas = await db.locationCanvas.findUnique({
    where: { id: values.locationCanvasId },
    include: { location: { select: { id: true } } },
  });
  if (!canvas) return { error: "Canvas not found" };
  await verifyLocationAccess(canvas.locationId, user.id);

  const elements = (canvas.trackElements as any[]) ?? [];
  const idx = elements.findIndex((el: any) => el.id === values.elementId);
  if (idx === -1) return { error: "Element not found" };

  const element = elements[idx];
  elements[idx] = { ...element, ...values.updates };

  // Sync to DB records
  if (element.type === "track" && element.yardTrackId) {
    const dbUpdates: Record<string, unknown> = {};
    if (values.updates.name !== undefined) dbUpdates.name = values.updates.name;
    if (values.updates.trackType !== undefined) dbUpdates.trackType = values.updates.trackType;
    if (values.updates.capacity !== undefined) dbUpdates.capacity = values.updates.capacity;
    if (values.updates.length !== undefined) dbUpdates.length = values.updates.length;
    if (Object.keys(dbUpdates).length > 0) {
      await db.yardTrack.update({ where: { id: element.yardTrackId }, data: dbUpdates });
    }
  }

  if (element.type === "industry" && element.industryId) {
    const dbUpdates: Record<string, unknown> = {};
    if (values.updates.name !== undefined) dbUpdates.name = values.updates.name;
    if (values.updates.spotCount !== undefined) dbUpdates.spotCount = values.updates.spotCount;
    if (Object.keys(dbUpdates).length > 0) {
      await db.industry.update({ where: { id: element.industryId }, data: dbUpdates });
    }
  }

  await db.locationCanvas.update({
    where: { id: values.locationCanvasId },
    data: { trackElements: elements },
  });

  return { success: true };
}

export async function deleteYardElement(values: {
  locationCanvasId: string;
  elementId: string;
}) {
  const user = await getAuthenticatedUser();

  const canvas = await db.locationCanvas.findUnique({
    where: { id: values.locationCanvasId },
    include: { location: { select: { id: true } } },
  });
  if (!canvas) return { error: "Canvas not found" };
  await verifyLocationAccess(canvas.locationId, user.id);

  const elements = (canvas.trackElements as any[]) ?? [];
  const element = elements.find((el: any) => el.id === values.elementId);
  if (!element) return { error: "Element not found" };

  // Delete associated DB record
  if (element.type === "track" && element.yardTrackId) {
    await db.yardTrack.delete({ where: { id: element.yardTrackId } }).catch(() => {});
  }
  if (element.type === "industry" && element.industryId) {
    await db.industry.delete({ where: { id: element.industryId } }).catch(() => {});
  }

  // Also remove any turnouts that reference a deleted track
  const filtered = elements.filter((el: any) => {
    if (el.id === values.elementId) return false;
    if (el.type === "turnout" && el.parentTrackId === values.elementId) return false;
    return true;
  });

  await db.locationCanvas.update({
    where: { id: values.locationCanvasId },
    data: { trackElements: filtered },
  });

  return { success: true };
}
```

- [ ] **Step 2: Build and verify**

Run: `npm run build`
Expected: Clean build. Server actions compile without errors.

- [ ] **Step 3: Commit**

```bash
git add app/actions/yard-canvas.ts
git commit -m "feat(map): add yard canvas server actions for track/industry/turnout CRUD"
```

---

### Task 7: Yard Detail Zustand Store

**Files:**
- Create: `components/map/use-yard-store.ts`

- [ ] **Step 1: Create the yard detail store**

Create `components/map/use-yard-store.ts`:

```typescript
import { create } from "zustand";

export type YardTool = "select" | "draw-track" | "add-turnout" | "add-industry" | "pan";

export interface TrackElement {
  id: string;
  type: "track";
  yardTrackId?: string;
  points: { x: number; y: number }[];
  trackType: string;
  name?: string;
  capacity?: number;
  length?: number;
}

export interface TurnoutElement {
  id: string;
  type: "turnout";
  parentTrackId: string;
  position: { x: number; y: number };
}

export interface IndustryElement {
  id: string;
  type: "industry";
  industryId?: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  connectedTrackId?: string;
  name?: string;
  spotCount?: number;
}

export type YardElement = TrackElement | TurnoutElement | IndustryElement;

interface YardStore {
  elements: YardElement[];
  setElements: (elements: YardElement[]) => void;
  addElement: (element: YardElement) => void;
  updateElement: (id: string, updates: Partial<YardElement>) => void;
  removeElement: (id: string) => void;

  selectedElementId: string | null;
  selectElement: (id: string | null) => void;

  canvasId: string | null;
  setCanvasId: (id: string | null) => void;

  drawingPoints: { x: number; y: number }[];
  setDrawingPoints: (points: { x: number; y: number }[]) => void;
  addDrawingPoint: (point: { x: number; y: number }) => void;
  clearDrawing: () => void;

  saveStatus: "saved" | "saving" | "unsaved";
  setSaveStatus: (status: "saved" | "saving" | "unsaved") => void;
}

export const useYardStore = create<YardStore>((set) => ({
  elements: [],
  setElements: (elements) => set({ elements }),
  addElement: (element) => set((s) => ({ elements: [...s.elements, element] })),
  updateElement: (id, updates) =>
    set((s) => ({
      elements: s.elements.map((el) =>
        el.id === id ? { ...el, ...updates } as YardElement : el
      ),
    })),
  removeElement: (id) =>
    set((s) => ({
      elements: s.elements.filter((el) => {
        if (el.id === id) return false;
        // Remove orphaned turnouts
        if (el.type === "turnout" && el.parentTrackId === id) return false;
        return true;
      }),
      selectedElementId: s.selectedElementId === id ? null : s.selectedElementId,
    })),

  selectedElementId: null,
  selectElement: (id) => set({ selectedElementId: id }),

  canvasId: null,
  setCanvasId: (id) => set({ canvasId: id }),

  drawingPoints: [],
  setDrawingPoints: (points) => set({ drawingPoints: points }),
  addDrawingPoint: (point) => set((s) => ({ drawingPoints: [...s.drawingPoints, point] })),
  clearDrawing: () => set({ drawingPoints: [] }),

  saveStatus: "saved",
  setSaveStatus: (status) => set({ saveStatus: status }),
}));
```

- [ ] **Step 2: Commit**

```bash
git add components/map/use-yard-store.ts
git commit -m "feat(map): add yard detail zustand store"
```

---

### Task 8: Yard Detail SVG Canvas

**Files:**
- Create: `components/map/yard-detail-canvas.tsx`
- Modify: `components/map/map-editor.tsx`

- [ ] **Step 1: Create the yard detail canvas**

Create `components/map/yard-detail-canvas.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TrackPath, type Point } from "./svg/track-path";
import { YARD_TRACK_COLORS } from "./svg/topo-colors";
import { useMapStore } from "./use-map-store";
import { useYardStore, type YardElement, type TrackElement, type TurnoutElement, type IndustryElement } from "./use-yard-store";
import { getYardCanvasData, saveYardCanvas, createYardTrackElement, createIndustryElement, createTurnoutElement, deleteYardElement } from "@/app/actions/yard-canvas";
import { toast } from "sonner";
import { createId } from "@paralleldrive/cuid2";

interface YardDetailCanvasProps {
  locationId: string;
}

export function YardDetailCanvas({ locationId }: YardDetailCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [viewBox, setViewBox] = useState({ x: -50, y: -50, width: 800, height: 600 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState("");

  const tool = useMapStore((s) => s.tool);
  const elements = useYardStore((s) => s.elements);
  const setElements = useYardStore((s) => s.setElements);
  const addElement = useYardStore((s) => s.addElement);
  const selectedElementId = useYardStore((s) => s.selectedElementId);
  const selectElement = useYardStore((s) => s.selectElement);
  const canvasId = useYardStore((s) => s.canvasId);
  const setCanvasId = useYardStore((s) => s.setCanvasId);
  const drawingPoints = useYardStore((s) => s.drawingPoints);
  const addDrawingPoint = useYardStore((s) => s.addDrawingPoint);
  const clearDrawing = useYardStore((s) => s.clearDrawing);
  const setSaveStatus = useYardStore((s) => s.setSaveStatus);

  const [dragPoint, setDragPoint] = useState<Point | null>(null);

  // Load yard data
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getYardCanvasData(locationId).then((data) => {
      if (cancelled) return;
      setCanvasId(data.canvas.id);
      setElements((data.canvas.trackElements as YardElement[]) ?? []);
      setLocationName(data.locationName);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) {
        toast.error("Failed to load yard data");
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [locationId, setCanvasId, setElements]);

  // Resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    obs.observe(container);
    return () => obs.disconnect();
  }, []);

  const svgToCanvas = useCallback((clientX: number, clientY: number): Point => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const relX = (clientX - rect.left) / rect.width;
    const relY = (clientY - rect.top) / rect.height;
    return {
      x: Math.round((viewBox.x + relX * viewBox.width) / 20) * 20,
      y: Math.round((viewBox.y + relY * viewBox.height) / 20) * 20,
    };
  }, [viewBox]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;

    if (tool === "pan" || (tool === "select" && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (tool === "draw-track") {
      const pos = svgToCanvas(e.clientX, e.clientY);
      if (drawingPoints.length === 0) {
        addDrawingPoint(pos);
      }
      setDragPoint(pos);
    }

    if (tool === "add-industry") {
      const pos = svgToCanvas(e.clientX, e.clientY);
      const id = createId();
      const element: IndustryElement = {
        id,
        type: "industry",
        position: pos,
        width: 120,
        height: 24,
        name: "New Industry",
        spotCount: 1,
      };
      addElement(element);
      createIndustryElement({ locationId, element }).then((result) => {
        if (result.success && result.element) {
          useYardStore.getState().updateElement(id, { industryId: result.element.industryId });
        }
      });
      toast.success("Industry placed");
    }

    if (tool === "add-turnout") {
      const pos = svgToCanvas(e.clientX, e.clientY);
      // Find nearest track
      const tracks = elements.filter((el): el is TrackElement => el.type === "track");
      if (tracks.length === 0) {
        toast.error("No tracks to place turnout on");
        return;
      }
      // Simple: use first track for now, user can change via properties
      const nearestTrack = tracks[0];
      const id = createId();
      const element: TurnoutElement = {
        id,
        type: "turnout",
        parentTrackId: nearestTrack.id,
        position: pos,
      };
      addElement(element);
      if (canvasId) {
        createTurnoutElement({ locationId, element });
      }
      toast.success("Turnout placed");
    }
  }, [tool, svgToCanvas, drawingPoints, addDrawingPoint, addElement, elements, locationId, canvasId]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const dx = (e.clientX - panStart.x) / dimensions.width * viewBox.width;
      const dy = (e.clientY - panStart.y) / dimensions.height * viewBox.height;
      setViewBox((vb) => ({ ...vb, x: vb.x - dx, y: vb.y - dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (tool === "draw-track" && drawingPoints.length > 0 && dragPoint) {
      setDragPoint(svgToCanvas(e.clientX, e.clientY));
    }
  }, [isPanning, panStart, dimensions, viewBox, tool, drawingPoints, dragPoint, svgToCanvas]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (tool === "draw-track" && dragPoint) {
      addDrawingPoint(dragPoint);
      setDragPoint(null);
    }
  }, [isPanning, tool, dragPoint, addDrawingPoint]);

  const handleDoubleClick = useCallback(async () => {
    if (tool === "draw-track" && drawingPoints.length >= 2) {
      const id = createId();
      const element: TrackElement = {
        id,
        type: "track",
        points: drawingPoints,
        trackType: "LEAD",
        name: "New Track",
        capacity: 8,
      };
      addElement(element);
      clearDrawing();
      setDragPoint(null);

      const result = await createYardTrackElement({ locationId, element });
      if (result.success && result.element) {
        useYardStore.getState().updateElement(id, { yardTrackId: result.element.yardTrackId });
      }
      toast.success("Track created");
    }
  }, [tool, drawingPoints, addElement, clearDrawing, locationId]);

  // Zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    const mousePos = svgToCanvas(e.clientX, e.clientY);
    setViewBox((vb) => ({
      x: mousePos.x - (mousePos.x - vb.x) * zoomFactor,
      y: mousePos.y - (mousePos.y - vb.y) * zoomFactor,
      width: vb.width * zoomFactor,
      height: vb.height * zoomFactor,
    }));
  }, [svgToCanvas]);

  // Cancel drawing on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        clearDrawing();
        setDragPoint(null);
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedElementId && canvasId) {
        deleteYardElement({ locationCanvasId: canvasId, elementId: selectedElementId }).then((result) => {
          if (result.success) {
            useYardStore.getState().removeElement(selectedElementId);
            toast.success("Element deleted");
          }
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clearDrawing, selectedElementId, canvasId]);

  // Get theme-appropriate colors
  const isDark = typeof window !== "undefined" && document.documentElement.classList.contains("dark");

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-background font-mono text-sm text-muted-foreground">
        Loading yard data...
      </div>
    );
  }

  const tracks = elements.filter((el): el is TrackElement => el.type === "track");
  const turnouts = elements.filter((el): el is TurnoutElement => el.type === "turnout");
  const industries = elements.filter((el): el is IndustryElement => el.type === "industry");

  return (
    <div
      ref={containerRef}
      className="h-full w-full bg-background"
      style={{ cursor: isPanning ? "grabbing" : tool === "pan" ? "grab" : tool === "draw-track" ? "crosshair" : "default" }}
    >
      <svg
        width={dimensions.width}
        height={dimensions.height}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        className="select-none"
      >
        {/* Grid */}
        <defs>
          <pattern id="yard-grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="0.5" className="fill-muted-foreground" opacity="0.15" />
          </pattern>
        </defs>
        <rect x={viewBox.x} y={viewBox.y} width={viewBox.width} height={viewBox.height} fill="url(#yard-grid)" />

        {/* Tracks */}
        {tracks.map((track) => {
          const colorConfig = YARD_TRACK_COLORS[track.trackType] ?? YARD_TRACK_COLORS.LEAD;
          const color = isDark ? colorConfig.dark : colorConfig.light;
          const isSelected = selectedElementId === track.id;

          return (
            <g
              key={track.id}
              onClick={(e) => { e.stopPropagation(); selectElement(track.id); }}
              className="cursor-pointer"
            >
              {/* Hit area */}
              <path
                d={`M${track.points.map((p) => `${p.x},${p.y}`).join(" L")}`}
                fill="none"
                stroke="transparent"
                strokeWidth={12}
              />
              <TrackPath
                points={track.points}
                trackType={track.trackType === "LEAD" ? "mainline" : "branch"}
                color={color}
                selected={isSelected}
              />

              {/* Track label */}
              {track.points.length >= 2 && (
                <text
                  x={track.points[track.points.length - 1].x + 10}
                  y={track.points[track.points.length - 1].y + 4}
                  style={{ fontFamily: "Georgia, serif", fontSize: 9, fontStyle: "italic" }}
                  fill={color}
                >
                  {track.name}
                </text>
              )}

              {/* Capacity label */}
              {track.capacity && track.points.length >= 2 && (
                <text
                  x={track.points[track.points.length - 1].x + 10}
                  y={track.points[track.points.length - 1].y + 16}
                  className="fill-muted-foreground font-mono text-[7px]"
                >
                  cap: {track.capacity}
                </text>
              )}
            </g>
          );
        })}

        {/* Turnouts */}
        {turnouts.map((turnout) => {
          const isSelected = selectedElementId === turnout.id;
          return (
            <g
              key={turnout.id}
              onClick={(e) => { e.stopPropagation(); selectElement(turnout.id); }}
              className="cursor-pointer"
            >
              <circle
                cx={turnout.position.x}
                cy={turnout.position.y}
                r={isSelected ? 6 : 5}
                className="fill-background stroke-foreground"
                strokeWidth={1.5}
              />
              <line
                x1={turnout.position.x - 3}
                y1={turnout.position.y}
                x2={turnout.position.x + 3}
                y2={turnout.position.y}
                className="stroke-foreground"
                strokeWidth={1.5}
              />
            </g>
          );
        })}

        {/* Industries */}
        {industries.map((industry) => {
          const isSelected = selectedElementId === industry.id;
          return (
            <g
              key={industry.id}
              onClick={(e) => { e.stopPropagation(); selectElement(industry.id); }}
              className="cursor-pointer"
            >
              <rect
                x={industry.position.x}
                y={industry.position.y - industry.height / 2}
                width={industry.width}
                height={industry.height}
                rx={3}
                className="fill-background"
                stroke={isDark ? "#7ae090" : "#3ba855"}
                strokeWidth={isSelected ? 2 : 1.5}
              />
              <text
                x={industry.position.x + industry.width / 2}
                y={industry.position.y + 4}
                textAnchor="middle"
                style={{ fontFamily: "Georgia, serif", fontSize: 9, fontStyle: "italic" }}
                fill={isDark ? "#7ae090" : "#3ba855"}
              >
                {industry.name}
              </text>
              {industry.spotCount && (
                <text
                  x={industry.position.x + industry.width / 2}
                  y={industry.position.y - industry.height / 2 - 4}
                  textAnchor="middle"
                  className="fill-muted-foreground font-mono text-[7px]"
                >
                  {industry.spotCount} spot{industry.spotCount !== 1 ? "s" : ""}
                </text>
              )}
            </g>
          );
        })}

        {/* Drawing in progress */}
        {drawingPoints.length > 0 && (
          <TrackPath
            points={dragPoint ? [...drawingPoints, dragPoint] : drawingPoints}
            trackType="mainline"
            color="var(--foreground)"
            opacity={0.4}
          />
        )}
      </svg>

      {/* Tool hints */}
      {tool === "draw-track" && drawingPoints.length === 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 rounded-md bg-primary px-3 py-1.5 font-mono text-xs text-primary-foreground shadow-lg">
          Click to start drawing track · drag to shape
        </div>
      )}
      {tool === "draw-track" && drawingPoints.length > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 rounded-md bg-primary px-3 py-1.5 font-mono text-xs text-primary-foreground shadow-lg">
          Drag to add waypoints · double-click to finish · Esc to cancel
        </div>
      )}
      {tool === "add-industry" && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 rounded-md bg-primary px-3 py-1.5 font-mono text-xs text-primary-foreground shadow-lg">
          Click to place an industry
        </div>
      )}
      {tool === "add-turnout" && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 rounded-md bg-primary px-3 py-1.5 font-mono text-xs text-primary-foreground shadow-lg">
          Click on a track to place a turnout
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire Yard Detail Canvas into map-editor.tsx**

Replace the yard-detail placeholder in `map-editor.tsx`:

```tsx
// Add import:
import { YardDetailCanvas } from "./yard-detail-canvas";

// Add state read:
  const yardDetailLocationId = useMapStore((s) => s.yardDetailLocationId);

// Replace yard-detail placeholder:
          {activeTab === "yard-detail" && yardDetailLocationId && (
            <YardDetailCanvas locationId={yardDetailLocationId} />
          )}
          {activeTab === "yard-detail" && !yardDetailLocationId && (
            <div className="flex items-center justify-center h-full bg-background text-muted-foreground font-mono text-sm">
              Select a location from the dropdown above
            </div>
          )}
```

- [ ] **Step 3: Check if @paralleldrive/cuid2 is installed**

Run: `npm ls @paralleldrive/cuid2 2>&1 || npm install @paralleldrive/cuid2`

If not installed, install it. This is used for client-side ID generation.

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Expected: Clean build. Yard Detail tab should render the SVG canvas when a location is selected.

- [ ] **Step 5: Commit**

```bash
git add components/map/yard-detail-canvas.tsx components/map/map-editor.tsx package.json package-lock.json
git commit -m "feat(map): add yard detail SVG canvas with track/turnout/industry drawing"
```

---

### Task 9: Yard Detail Properties Panel

**Files:**
- Create: `components/map/yard-properties.tsx`
- Modify: `components/map/map-properties.tsx`

- [ ] **Step 1: Create the Yard properties panel**

Create `components/map/yard-properties.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";
import { useYardStore, type TrackElement, type TurnoutElement, type IndustryElement } from "./use-yard-store";
import { updateYardElement, deleteYardElement } from "@/app/actions/yard-canvas";
import { YARD_TRACK_COLORS } from "./svg/topo-colors";
import { toast } from "sonner";

const TRACK_TYPES = [
  "ARRIVAL", "CLASSIFICATION", "DEPARTURE", "LEAD",
  "ENGINE_SERVICE", "RIP", "CABOOSE", "RUNAROUND", "SWITCHER_POCKET",
] as const;

const TRACK_TYPE_SHORT: Record<string, string> = {
  ARRIVAL: "ARR",
  CLASSIFICATION: "CLS",
  DEPARTURE: "DEP",
  LEAD: "LEAD",
  ENGINE_SERVICE: "ENG",
  RIP: "RIP",
  CABOOSE: "CAB",
  RUNAROUND: "RUN",
  SWITCHER_POCKET: "SWP",
};

export function YardProperties() {
  const selectedElementId = useYardStore((s) => s.selectedElementId);
  const elements = useYardStore((s) => s.elements);
  const canvasId = useYardStore((s) => s.canvasId);

  const element = selectedElementId ? elements.find((el) => el.id === selectedElementId) : null;

  if (!element) {
    return (
      <div className="w-[260px] border-l border-border bg-card p-4 font-mono text-xs">
        <div className="text-foreground font-bold mb-3">Properties</div>
        <div className="text-muted-foreground">Select a track, turnout, or industry to view details.</div>
      </div>
    );
  }

  if (element.type === "track") return <TrackProps element={element} canvasId={canvasId} />;
  if (element.type === "turnout") return <TurnoutProps element={element} canvasId={canvasId} />;
  if (element.type === "industry") return <IndustryProps element={element} canvasId={canvasId} />;

  return null;
}

function TrackProps({ element, canvasId }: { element: TrackElement; canvasId: string | null }) {
  const updateElement = useYardStore((s) => s.updateElement);
  const removeElement = useYardStore((s) => s.removeElement);
  const [name, setName] = useState(element.name ?? "");
  const [capacity, setCapacity] = useState(element.capacity ?? 8);

  const save = useCallback(async (updates: Record<string, unknown>) => {
    updateElement(element.id, updates as Partial<TrackElement>);
    if (canvasId) {
      await updateYardElement({ locationCanvasId: canvasId, elementId: element.id, updates });
    }
  }, [element.id, canvasId, updateElement]);

  const handleDelete = useCallback(async () => {
    if (!canvasId) return;
    const result = await deleteYardElement({ locationCanvasId: canvasId, elementId: element.id });
    if (result.success) {
      removeElement(element.id);
      toast.success("Track deleted");
    }
  }, [canvasId, element.id, removeElement]);

  return (
    <div className="w-[260px] border-l border-border bg-card p-4 font-mono text-xs overflow-y-auto">
      <div className="text-foreground font-bold mb-3">Yard Track</div>

      <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">TRACK TYPE</div>
      <div className="flex flex-wrap gap-1 mb-3">
        {TRACK_TYPES.map((type) => {
          const colors = YARD_TRACK_COLORS[type];
          return (
            <button
              key={type}
              onClick={() => save({ trackType: type })}
              className={`px-1.5 py-0.5 rounded text-[9px] border transition-colors ${
                element.trackType === type
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {TRACK_TYPE_SHORT[type]}
            </button>
          );
        })}
      </div>

      <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">NAME</div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => save({ name })}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-foreground focus:border-ring focus:outline-none mb-3"
      />

      <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">CAPACITY</div>
      <input
        type="number"
        value={capacity}
        onChange={(e) => setCapacity(parseInt(e.target.value) || 0)}
        onBlur={() => save({ capacity })}
        className="w-[80px] rounded-md border border-border bg-background px-2 py-1.5 text-foreground focus:border-ring focus:outline-none mb-3"
      />

      <div className="border-t border-border mt-3 pt-3">
        <button
          onClick={handleDelete}
          className="w-full rounded-md bg-destructive px-3 py-2 text-center font-bold text-destructive-foreground hover:opacity-90 transition-opacity"
        >
          Delete Track
        </button>
      </div>
    </div>
  );
}

function TurnoutProps({ element, canvasId }: { element: TurnoutElement; canvasId: string | null }) {
  const removeElement = useYardStore((s) => s.removeElement);
  const elements = useYardStore((s) => s.elements);

  const parentTrack = elements.find((el) => el.id === element.parentTrackId);
  const connectedTracks = elements.filter(
    (el) => el.type === "turnout" && el.parentTrackId === element.id
  );

  const handleDelete = useCallback(async () => {
    if (!canvasId) return;
    const result = await deleteYardElement({ locationCanvasId: canvasId, elementId: element.id });
    if (result.success) {
      removeElement(element.id);
      toast.success("Turnout deleted");
    }
  }, [canvasId, element.id, removeElement]);

  return (
    <div className="w-[260px] border-l border-border bg-card p-4 font-mono text-xs overflow-y-auto">
      <div className="text-foreground font-bold mb-3">Turnout</div>

      <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">POSITION</div>
      <div className="text-foreground/80 mb-3">
        ({Math.round(element.position.x)}, {Math.round(element.position.y)})
      </div>

      <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">ON TRACK</div>
      <div className="text-foreground/80 mb-3">
        {parentTrack && parentTrack.type === "track" ? (parentTrack as TrackElement).name : "Unknown"}
      </div>

      <div className="border-t border-border mt-3 pt-3">
        <button
          onClick={handleDelete}
          className="w-full rounded-md bg-destructive px-3 py-2 text-center font-bold text-destructive-foreground hover:opacity-90 transition-opacity"
        >
          Delete Turnout
        </button>
      </div>
    </div>
  );
}

function IndustryProps({ element, canvasId }: { element: IndustryElement; canvasId: string | null }) {
  const updateElement = useYardStore((s) => s.updateElement);
  const removeElement = useYardStore((s) => s.removeElement);
  const [name, setName] = useState(element.name ?? "");
  const [spotCount, setSpotCount] = useState(element.spotCount ?? 1);

  const save = useCallback(async (updates: Record<string, unknown>) => {
    updateElement(element.id, updates as Partial<IndustryElement>);
    if (canvasId) {
      await updateYardElement({ locationCanvasId: canvasId, elementId: element.id, updates });
    }
  }, [element.id, canvasId, updateElement]);

  const handleDelete = useCallback(async () => {
    if (!canvasId) return;
    const result = await deleteYardElement({ locationCanvasId: canvasId, elementId: element.id });
    if (result.success) {
      removeElement(element.id);
      toast.success("Industry deleted");
    }
  }, [canvasId, element.id, removeElement]);

  return (
    <div className="w-[260px] border-l border-border bg-card p-4 font-mono text-xs overflow-y-auto">
      <div className="text-foreground font-bold mb-3">Industry</div>

      <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">NAME</div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => save({ name })}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-foreground focus:border-ring focus:outline-none mb-3"
      />

      <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">SPOTS</div>
      <input
        type="number"
        value={spotCount}
        onChange={(e) => setSpotCount(parseInt(e.target.value) || 1)}
        onBlur={() => save({ spotCount })}
        className="w-[80px] rounded-md border border-border bg-background px-2 py-1.5 text-foreground focus:border-ring focus:outline-none mb-3"
      />

      <div className="border-t border-border mt-3 pt-3">
        <button
          onClick={handleDelete}
          className="w-full rounded-md bg-destructive px-3 py-2 text-center font-bold text-destructive-foreground hover:opacity-90 transition-opacity"
        >
          Delete Industry
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire into MapPropertiesRouter**

In `components/map/map-properties.tsx`, add the yard-detail case:

```tsx
// Add import:
import { YardProperties } from "./yard-properties";

// In MapPropertiesRouter, add before the default return:
  if (activeTab === "yard-detail") {
    return <YardProperties />;
  }
```

- [ ] **Step 3: Build and verify**

Run: `npm run build`
Expected: Clean build. Selecting elements in Yard Detail mode shows contextual properties.

- [ ] **Step 4: Commit**

```bash
git add components/map/yard-properties.tsx components/map/map-properties.tsx
git commit -m "feat(map): add yard detail properties panel with track type, capacity, and industry editing"
```

---

### Task 10: Remove Konva Dependency and Clean Up LocationDetailView

**Files:**
- Modify: `components/map/map-editor.tsx`
- Delete: Old location-detail-view references from map-editor if still present

The existing `location-detail-view.tsx` was already rewritten to HTML/CSS in the earlier rework. Now that Yard Detail mode replaces its purpose, we need to remove the detail view navigation from the Locations tab (it's now the Yard Detail tab).

- [ ] **Step 1: Update map-editor to route "View Detail" to Yard Detail tab**

When a user clicks "View Detail" in the properties panel, instead of rendering LocationDetailView inline, switch to the Yard Detail tab with that location selected:

In `components/map/map-properties.tsx`, update the "View Detail" button handler:

```tsx
// Replace the View Detail button's onClick:
          <button
            onClick={() => {
              useMapStore.getState().setYardDetailLocation(data.locationId);
              useMapStore.getState().setActiveTab("yard-detail");
            }}
            className="w-full rounded-md bg-primary px-3 py-2 text-center font-bold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            View Detail →
          </button>
```

- [ ] **Step 2: Remove LocationDetailView import and rendering from map-editor.tsx**

Remove the import of `LocationDetailView` and the `detailNode` / `detailLocationId` logic from `MapEditorInner`. The Yard Detail tab handles this now.

- [ ] **Step 3: Check if react-konva is still used anywhere**

Run: `grep -r "react-konva" components/ app/ --include="*.tsx" --include="*.ts"`

If no other files import it, it can be removed:

Run: `npm uninstall react-konva konva`

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Expected: Clean build. "View Detail" button switches to Yard Detail tab.

- [ ] **Step 5: Commit**

```bash
git add components/map/map-editor.tsx components/map/map-properties.tsx package.json package-lock.json
git commit -m "refactor(map): route detail view through yard detail tab, remove Konva dependency"
```

---

### Task 11: Final Integration and Polish

**Files:**
- Modify: `app/(dashboard)/dashboard/railroad/[id]/map/page.tsx`
- Modify: `components/map/map-editor.tsx`

- [ ] **Step 1: Update the page.tsx to pass pathData through**

Ensure the page server component passes `pathData` from edges to the client. In `app/(dashboard)/dashboard/railroad/[id]/map/page.tsx`, the `JSON.parse(JSON.stringify(canvasData))` already serializes everything, so `pathData` (a JSON field) will come through. No change needed, but verify by reading the file.

- [ ] **Step 2: Handle initial query params for yard detail**

If `query.view === "detail"` and `query.location` is set, auto-switch to the Yard Detail tab:

```tsx
// In MapEditorInner, update the initialView effect:
  useEffect(() => {
    if (initialView === "detail" && initialDetailLocationId) {
      useMapStore.getState().setYardDetailLocation(initialDetailLocationId);
      useMapStore.getState().setActiveTab("yard-detail");
    }
  }, [initialView, initialDetailLocationId]);
```

- [ ] **Step 3: Ensure tool resets when switching tabs**

When the active tab changes, reset the tool to "select" to avoid carrying draw-track state between modes:

In `use-map-store.ts`, update `setActiveTab`:

```typescript
  setActiveTab: (tab) => set({ activeTab: tab, tool: "select", drawSourceNodeId: null }),
```

- [ ] **Step 4: Build and verify end-to-end**

Run: `npm run build`
Expected: Clean build.

Run: `npm run dev` and manually test:
1. Navigate to a railroad's map page
2. Verify Locations tab works as before (add location, draw track, delete)
3. Switch to Track Layout tab — see topo-style rendering of existing locations and tracks
4. Draw a new track with waypoints in Track Layout mode
5. Switch to Yard Detail tab, select a location from dropdown
6. Draw a track in the yard (click, drag waypoints, double-click to finish)
7. Place an industry, place a turnout
8. Edit properties in the right panel
9. Delete elements
10. Verify light/dark mode works for all tabs

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(map): complete three-tab map editor with track layout and yard detail"
```
