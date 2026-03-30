# Track Editor Redesign — Snap-Together Piece System

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the freeform yard detail editor with a snap-together piece-based sequential builder that produces clean, transit-map-style schematics.

**Architecture:** New piece registry defines SVG geometry + endpoint positions for each track piece type. A Zustand store manages placed pieces and their connections. The yard editor canvas renders pieces as composed SVG, with a radial picker appearing at open endpoints for sequential building. Server actions persist pieces to the existing `LocationCanvas.trackElements` JSON column. No schema changes needed.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Zustand, SVG, Tailwind CSS v4 (OKLCH color tokens), shadcn/ui

**Spec:** `docs/superpowers/specs/2026-03-29-track-editor-redesign-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `components/map/pieces/piece-registry.ts` | Static piece definitions: geometry, endpoints, SVG render data, categories |
| `components/map/pieces/piece-types.ts` | TypeScript types for pieces, endpoints, placed elements |
| `components/map/pieces/piece-geometry.ts` | Geometry helpers: endpoint position calculation, rotation transforms, hit testing |
| `components/map/pieces/basic-pieces.ts` | Straight, curve definitions (8 pieces) |
| `components/map/pieces/turnout-pieces.ts` | Turnout, wye, slip switch definitions (8 pieces) |
| `components/map/pieces/crossing-pieces.ts` | Crossing, crossover definitions (5 pieces) |
| `components/map/pieces/terminal-pieces.ts` | Bumper, turntable, roundhouse, engine house, facilities (8 pieces) |
| `components/map/pieces/specialty-pieces.ts` | Bridge, tunnel, grade crossing, signal, switch stand (5 pieces) |
| `components/map/yard-piece-editor.tsx` | Main canvas component — SVG rendering, pan/zoom, click handling |
| `components/map/radial-piece-picker.tsx` | Radial menu appearing at endpoints for piece selection |
| `components/map/piece-catalog.tsx` | Full categorized piece browser (opened from "More..." in radial) |
| `components/map/svg/piece-renderer.tsx` | SVG renderer that draws a placed piece using its registry definition |
| `components/map/svg/endpoint-marker.tsx` | Pulsing open endpoint indicator |
| `components/map/yard-piece-properties.tsx` | Properties panel for selected piece (name, type, capacity) |
| `components/map/use-piece-store.ts` | Zustand store for placed pieces, selection, undo/redo |
| `components/map/svg/track-colors.ts` | New track color system with CSS custom property integration |

### Modified Files
| File | Changes |
|------|---------|
| `components/map/map-editor.tsx` | Swap `YardDetailCanvas` for `YardPieceEditor`, update toolbar for new tools |
| `components/map/use-map-store.ts` | Update `YardTool` type, remove freeform drawing tools |
| `app/actions/yard-canvas.ts` | Update server actions for piece-based elements, new Zod schemas |
| `app/globals.css` | Add track color CSS custom properties for light/dark themes |

### Removed (in final cleanup task)
| File | Reason |
|------|--------|
| `components/map/yard-detail-canvas.tsx` | Replaced by `yard-piece-editor.tsx` |
| `components/map/yard-properties.tsx` | Replaced by `yard-piece-properties.tsx` |
| `components/map/svg/track-path.tsx` | Replaced by piece-based rendering |

---

## Task 1: Type Definitions & Track Color System

**Files:**
- Create: `components/map/pieces/piece-types.ts`
- Create: `components/map/svg/track-colors.ts`
- Modify: `app/globals.css`

- [ ] **Step 1: Create piece type definitions**

Create `components/map/pieces/piece-types.ts`:

```typescript
// ─── Core geometry ───

export type Point = { x: number; y: number }

// ─── Endpoint: a connection point on a piece ───

export type EndpointDef = {
  id: string            // e.g. "in", "out", "diverge"
  offsetX: number       // relative to piece origin
  offsetY: number
  direction: number     // exit angle in degrees (0=right, 90=down, 180=left, 270=up)
  role: "in" | "out"    // whether this is an input or output connection
}

// ─── Piece definition: static registry entry ───

export type PieceCategory = "basic" | "turnout" | "crossing" | "terminal" | "specialty"

export type PieceDefinition = {
  id: string                      // "straight", "curve-left-45", "turnout-right", etc.
  name: string                    // "Straight Track"
  category: PieceCategory
  description: string
  endpoints: EndpointDef[]        // all connection points
  svgPath: string                 // SVG path data for the track line(s)
  svgExtra?: string               // additional SVG markup (bumper rect, turntable circle, etc.)
  width: number                   // bounding box
  height: number
  defaultTrackType?: string       // suggested YardTrackType when placed
}

// ─── Placed piece: an instance on the canvas ───

export type PlacedPiece = {
  id: string
  pieceDefId: string              // references PieceDefinition.id
  position: Point                 // canvas position (top-left of bounding box)
  rotation: number                // degrees (0, 45, 90, 135, 180, 225, 270, 315)
  trackType?: string              // YardTrackType enum value
  yardTrackId?: string            // links to YardTrack DB record
  name?: string
  capacity?: number
  metadata?: Record<string, unknown>
  connectedEndpoints: Record<string, string | null>
  // key = endpoint def id, value = connected piece's endpoint global id or null
}

// ─── Resolved endpoint: absolute position after placement ───

export type ResolvedEndpoint = {
  globalId: string                // `${pieceId}:${endpointDefId}`
  pieceId: string
  endpointDefId: string
  position: Point                 // absolute canvas position
  direction: number               // absolute direction after rotation
  role: "in" | "out"
  connectedTo: string | null      // globalId of connected endpoint
}

// ─── Undo/Redo ───

export type PieceAction =
  | { type: "place"; piece: PlacedPiece }
  | { type: "remove"; piece: PlacedPiece; downstream: PlacedPiece[] }
  | { type: "update"; pieceId: string; before: Partial<PlacedPiece>; after: Partial<PlacedPiece> }
  | { type: "batch"; actions: PieceAction[] }
```

- [ ] **Step 2: Create track color system**

Create `components/map/svg/track-colors.ts`:

```typescript
export const TRACK_TYPE_COLORS = {
  LEAD:              { light: "#3a3f4b", dark: "#c8cdd8", label: "Lead / Main" },
  ARRIVAL:           { light: "#059669", dark: "#34d399", label: "Arrival" },
  CLASSIFICATION:    { light: "#2563eb", dark: "#4a9eff", label: "Classification" },
  DEPARTURE:         { light: "#d97706", dark: "#f59e0b", label: "Departure" },
  ENGINE_SERVICE:    { light: "#7c3aed", dark: "#a78bfa", label: "Engine Service" },
  RIP:               { light: "#dc2626", dark: "#f87171", label: "RIP / Bad Order" },
  CABOOSE:           { light: "#ea580c", dark: "#fb923c", label: "Caboose" },
  RUNAROUND:         { light: "#64748b", dark: "#94a3b8", label: "Runaround" },
  SWITCHER_POCKET:   { light: "#57534e", dark: "#78716c", label: "Switcher Pocket" },
} as const

export type TrackTypeName = keyof typeof TRACK_TYPE_COLORS

export const TURNOUT_COLOR = { light: "#c2410c", dark: "#ff8c42" }
export const BUMPER_COLOR = { light: "#dc2626", dark: "#ef4444" }
export const ENDPOINT_COLOR = { light: "#2563eb", dark: "#4a9eff" }
export const SELECTION_COLOR = { light: "#2563eb", dark: "#4a9eff" }

/**
 * Returns the appropriate color for the current theme.
 * Call with the result of checking `document.documentElement.classList.contains("dark")`.
 */
export function getTrackColor(trackType: string, isDark: boolean): string {
  const entry = TRACK_TYPE_COLORS[trackType as TrackTypeName]
  if (!entry) return isDark ? "#c8cdd8" : "#3a3f4b"
  return isDark ? entry.dark : entry.light
}

export function getTurnoutColor(isDark: boolean): string {
  return isDark ? TURNOUT_COLOR.dark : TURNOUT_COLOR.light
}

export function getBumperColor(isDark: boolean): string {
  return isDark ? BUMPER_COLOR.dark : BUMPER_COLOR.light
}

export function getEndpointColor(isDark: boolean): string {
  return isDark ? ENDPOINT_COLOR.dark : ENDPOINT_COLOR.light
}

export function getSelectionColor(isDark: boolean): string {
  return isDark ? SELECTION_COLOR.dark : SELECTION_COLOR.light
}
```

- [ ] **Step 3: Add track color CSS custom properties to globals.css**

Add to the existing `:root` block in `app/globals.css` (after the existing color tokens):

```css
/* Track type colors */
--track-lead: #3a3f4b;
--track-arrival: #059669;
--track-classification: #2563eb;
--track-departure: #d97706;
--track-engine: #7c3aed;
--track-rip: #dc2626;
--track-caboose: #ea580c;
--track-runaround: #64748b;
--track-switcher: #57534e;
--track-turnout: #c2410c;
--track-bumper: #dc2626;
--track-endpoint: #2563eb;
--track-selection: #2563eb;
```

Add to the existing `.dark` block:

```css
/* Track type colors */
--track-lead: #c8cdd8;
--track-arrival: #34d399;
--track-classification: #4a9eff;
--track-departure: #f59e0b;
--track-engine: #a78bfa;
--track-rip: #f87171;
--track-caboose: #fb923c;
--track-runaround: #94a3b8;
--track-switcher: #78716c;
--track-turnout: #ff8c42;
--track-bumper: #ef4444;
--track-endpoint: #4a9eff;
--track-selection: #4a9eff;
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors in the new files

- [ ] **Step 5: Commit**

```bash
git add components/map/pieces/piece-types.ts components/map/svg/track-colors.ts app/globals.css
git commit -m "feat(track-editor): add piece type definitions and track color system"
```

---

## Task 2: Piece Geometry Helpers

**Files:**
- Create: `components/map/pieces/piece-geometry.ts`

- [ ] **Step 1: Create geometry helper module**

Create `components/map/pieces/piece-geometry.ts`:

```typescript
import type { Point, EndpointDef, PlacedPiece, ResolvedEndpoint, PieceDefinition } from "./piece-types"

const DEG_TO_RAD = Math.PI / 180

/**
 * Rotate a point around the origin by the given degrees.
 */
export function rotatePoint(p: Point, degrees: number): Point {
  const rad = degrees * DEG_TO_RAD
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return {
    x: p.x * cos - p.y * sin,
    y: p.x * sin + p.y * cos,
  }
}

/**
 * Normalize an angle to [0, 360).
 */
export function normalizeAngle(degrees: number): number {
  return ((degrees % 360) + 360) % 360
}

/**
 * Resolve an endpoint definition to absolute canvas coordinates
 * given a placed piece's position and rotation.
 */
export function resolveEndpoint(
  piece: PlacedPiece,
  def: EndpointDef,
  pieceDef: PieceDefinition
): ResolvedEndpoint {
  // Endpoint offset is relative to piece center
  const cx = pieceDef.width / 2
  const cy = pieceDef.height / 2
  const relative: Point = { x: def.offsetX - cx, y: def.offsetY - cy }
  const rotated = rotatePoint(relative, piece.rotation)

  return {
    globalId: `${piece.id}:${def.id}`,
    pieceId: piece.id,
    endpointDefId: def.id,
    position: {
      x: piece.position.x + cx + rotated.x,
      y: piece.position.y + cy + rotated.y,
    },
    direction: normalizeAngle(def.direction + piece.rotation),
    role: def.role,
    connectedTo: piece.connectedEndpoints[def.id] ?? null,
  }
}

/**
 * Resolve all endpoints for a placed piece.
 */
export function resolveAllEndpoints(
  piece: PlacedPiece,
  pieceDef: PieceDefinition
): ResolvedEndpoint[] {
  return pieceDef.endpoints.map((def) => resolveEndpoint(piece, def, pieceDef))
}

/**
 * Find all open (unconnected) output endpoints across all placed pieces.
 */
export function findOpenEndpoints(
  pieces: PlacedPiece[],
  registry: Map<string, PieceDefinition>
): ResolvedEndpoint[] {
  const open: ResolvedEndpoint[] = []
  for (const piece of pieces) {
    const def = registry.get(piece.pieceDefId)
    if (!def) continue
    for (const ep of resolveAllEndpoints(piece, def)) {
      if (ep.role === "out" && !ep.connectedTo) {
        open.push(ep)
      }
    }
  }
  return open
}

/**
 * Calculate where a new piece should be placed when connecting to an open endpoint.
 * The new piece's input endpoint aligns with the open endpoint's position and direction.
 */
export function calculatePlacement(
  openEndpoint: ResolvedEndpoint,
  newPieceDef: PieceDefinition,
  inputEndpointId?: string
): { position: Point; rotation: number } {
  // Find the input endpoint on the new piece (default to first "in" endpoint)
  const inputDef = inputEndpointId
    ? newPieceDef.endpoints.find((e) => e.id === inputEndpointId)
    : newPieceDef.endpoints.find((e) => e.role === "in")

  if (!inputDef) {
    // Fallback: place at endpoint position
    return { position: openEndpoint.position, rotation: 0 }
  }

  // The new piece's input direction should face TOWARD the open endpoint
  // (opposite direction of the open endpoint's exit direction)
  const desiredInputDirection = normalizeAngle(openEndpoint.direction + 180)
  const rotation = normalizeAngle(desiredInputDirection - inputDef.direction)

  // Now calculate position so the input endpoint lands on the open endpoint
  const cx = newPieceDef.width / 2
  const cy = newPieceDef.height / 2
  const relative: Point = { x: inputDef.offsetX - cx, y: inputDef.offsetY - cy }
  const rotated = rotatePoint(relative, rotation)

  return {
    position: {
      x: openEndpoint.position.x - cx - rotated.x,
      y: openEndpoint.position.y - cy - rotated.y,
    },
    rotation,
  }
}

/**
 * Generate an SVG transform string for a placed piece.
 */
export function pieceTransform(piece: PlacedPiece, pieceDef: PieceDefinition): string {
  const cx = piece.position.x + pieceDef.width / 2
  const cy = piece.position.y + pieceDef.height / 2
  if (piece.rotation === 0) {
    return `translate(${piece.position.x}, ${piece.position.y})`
  }
  return `translate(${piece.position.x}, ${piece.position.y}) rotate(${piece.rotation}, ${pieceDef.width / 2}, ${pieceDef.height / 2})`
}

/**
 * Check if a point is within the bounding box of a placed piece (for click hit testing).
 */
export function isPointInPiece(
  point: Point,
  piece: PlacedPiece,
  pieceDef: PieceDefinition,
  padding: number = 6
): boolean {
  return (
    point.x >= piece.position.x - padding &&
    point.x <= piece.position.x + pieceDef.width + padding &&
    point.y >= piece.position.y - padding &&
    point.y <= piece.position.y + pieceDef.height + padding
  )
}

/**
 * Distance from a point to the nearest open endpoint.
 */
export function nearestEndpointDistance(
  point: Point,
  endpoints: ResolvedEndpoint[]
): { endpoint: ResolvedEndpoint; distance: number } | null {
  let nearest: ResolvedEndpoint | null = null
  let minDist = Infinity
  for (const ep of endpoints) {
    const dx = point.x - ep.position.x
    const dy = point.y - ep.position.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < minDist) {
      minDist = dist
      nearest = ep
    }
  }
  return nearest ? { endpoint: nearest, distance: minDist } : null
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/map/pieces/piece-geometry.ts
git commit -m "feat(track-editor): add piece geometry helpers (rotation, placement, hit testing)"
```

---

## Task 3: Basic Piece Definitions

**Files:**
- Create: `components/map/pieces/basic-pieces.ts`

- [ ] **Step 1: Define basic track pieces**

Create `components/map/pieces/basic-pieces.ts`:

```typescript
import type { PieceDefinition } from "./piece-types"

// Standard segment length
const SEG = 60
const HALF_SEG = 30

// ─── Straight pieces ───

export const straight: PieceDefinition = {
  id: "straight",
  name: "Straight",
  category: "basic",
  description: "Standard straight track segment",
  width: SEG,
  height: 20,
  endpoints: [
    { id: "in", offsetX: 0, offsetY: 10, direction: 180, role: "in" },
    { id: "out", offsetX: SEG, offsetY: 10, direction: 0, role: "out" },
  ],
  svgPath: "M 0,10 L 60,10",
}

export const straightLong: PieceDefinition = {
  id: "straight-long",
  name: "Long Straight",
  category: "basic",
  description: "Double-length straight track segment",
  width: SEG * 2,
  height: 20,
  endpoints: [
    { id: "in", offsetX: 0, offsetY: 10, direction: 180, role: "in" },
    { id: "out", offsetX: SEG * 2, offsetY: 10, direction: 0, role: "out" },
  ],
  svgPath: "M 0,10 L 120,10",
}

// ─── Curve pieces ───
// 45° arcs — radius = 80, chord endpoints calculated

const R = 80
const ARC_45_DX = R * Math.sin(Math.PI / 4) // ~56.57
const ARC_45_DY = R - R * Math.cos(Math.PI / 4) // ~23.43

export const curveLeft45: PieceDefinition = {
  id: "curve-left-45",
  name: "Curve Left",
  category: "basic",
  description: "45° left curve",
  width: Math.ceil(ARC_45_DX) + 4,
  height: Math.ceil(ARC_45_DY) + 14,
  endpoints: [
    { id: "in", offsetX: 0, offsetY: Math.ceil(ARC_45_DY) + 10, direction: 180, role: "in" },
    { id: "out", offsetX: Math.ceil(ARC_45_DX), offsetY: 4, direction: 315, role: "out" },
  ],
  svgPath: `M 0,${Math.ceil(ARC_45_DY) + 10} A ${R},${R} 0 0,1 ${Math.ceil(ARC_45_DX)},4`,
}

export const curveRight45: PieceDefinition = {
  id: "curve-right-45",
  name: "Curve Right",
  category: "basic",
  description: "45° right curve",
  width: Math.ceil(ARC_45_DX) + 4,
  height: Math.ceil(ARC_45_DY) + 14,
  endpoints: [
    { id: "in", offsetX: 0, offsetY: 4, direction: 180, role: "in" },
    { id: "out", offsetX: Math.ceil(ARC_45_DX), offsetY: Math.ceil(ARC_45_DY) + 10, direction: 45, role: "out" },
  ],
  svgPath: `M 0,4 A ${R},${R} 0 0,0 ${Math.ceil(ARC_45_DX)},${Math.ceil(ARC_45_DY) + 10}`,
}

// Broad curves — radius = 140, gentler

const R_BROAD = 140
const BROAD_45_DX = R_BROAD * Math.sin(Math.PI / 4)
const BROAD_45_DY = R_BROAD - R_BROAD * Math.cos(Math.PI / 4)

export const curveLeftBroad: PieceDefinition = {
  id: "curve-left-broad",
  name: "Broad Curve Left",
  category: "basic",
  description: "Gentle 45° left curve",
  width: Math.ceil(BROAD_45_DX) + 4,
  height: Math.ceil(BROAD_45_DY) + 14,
  endpoints: [
    { id: "in", offsetX: 0, offsetY: Math.ceil(BROAD_45_DY) + 10, direction: 180, role: "in" },
    { id: "out", offsetX: Math.ceil(BROAD_45_DX), offsetY: 4, direction: 315, role: "out" },
  ],
  svgPath: `M 0,${Math.ceil(BROAD_45_DY) + 10} A ${R_BROAD},${R_BROAD} 0 0,1 ${Math.ceil(BROAD_45_DX)},4`,
}

export const curveRightBroad: PieceDefinition = {
  id: "curve-right-broad",
  name: "Broad Curve Right",
  category: "basic",
  description: "Gentle 45° right curve",
  width: Math.ceil(BROAD_45_DX) + 4,
  height: Math.ceil(BROAD_45_DY) + 14,
  endpoints: [
    { id: "in", offsetX: 0, offsetY: 4, direction: 180, role: "in" },
    { id: "out", offsetX: Math.ceil(BROAD_45_DX), offsetY: Math.ceil(BROAD_45_DY) + 10, direction: 45, role: "out" },
  ],
  svgPath: `M 0,4 A ${R_BROAD},${R_BROAD} 0 0,0 ${Math.ceil(BROAD_45_DX)},${Math.ceil(BROAD_45_DY) + 10}`,
}

// Half-curves (22.5°)

const HALF_ARC_DX = R * Math.sin(Math.PI / 8) // ~30.6
const HALF_ARC_DY = R - R * Math.cos(Math.PI / 8) // ~7.6

export const halfCurveLeft: PieceDefinition = {
  id: "half-curve-left",
  name: "Half Curve Left",
  category: "basic",
  description: "22.5° left curve",
  width: Math.ceil(HALF_ARC_DX) + 4,
  height: Math.ceil(HALF_ARC_DY) + 14,
  endpoints: [
    { id: "in", offsetX: 0, offsetY: Math.ceil(HALF_ARC_DY) + 10, direction: 180, role: "in" },
    { id: "out", offsetX: Math.ceil(HALF_ARC_DX), offsetY: 4, direction: 337.5, role: "out" },
  ],
  svgPath: `M 0,${Math.ceil(HALF_ARC_DY) + 10} A ${R},${R} 0 0,1 ${Math.ceil(HALF_ARC_DX)},4`,
}

export const halfCurveRight: PieceDefinition = {
  id: "half-curve-right",
  name: "Half Curve Right",
  category: "basic",
  description: "22.5° right curve",
  width: Math.ceil(HALF_ARC_DX) + 4,
  height: Math.ceil(HALF_ARC_DY) + 14,
  endpoints: [
    { id: "in", offsetX: 0, offsetY: 4, direction: 180, role: "in" },
    { id: "out", offsetX: Math.ceil(HALF_ARC_DX), offsetY: Math.ceil(HALF_ARC_DY) + 10, direction: 22.5, role: "out" },
  ],
  svgPath: `M 0,4 A ${R},${R} 0 0,0 ${Math.ceil(HALF_ARC_DX)},${Math.ceil(HALF_ARC_DY) + 10}`,
}

export const BASIC_PIECES: PieceDefinition[] = [
  straight,
  straightLong,
  curveLeft45,
  curveRight45,
  curveLeftBroad,
  curveRightBroad,
  halfCurveLeft,
  halfCurveRight,
]
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/map/pieces/basic-pieces.ts
git commit -m "feat(track-editor): add basic piece definitions (straight, curves)"
```

---

## Task 4: Turnout, Crossing, Terminal & Specialty Piece Definitions

**Files:**
- Create: `components/map/pieces/turnout-pieces.ts`
- Create: `components/map/pieces/crossing-pieces.ts`
- Create: `components/map/pieces/terminal-pieces.ts`
- Create: `components/map/pieces/specialty-pieces.ts`

- [ ] **Step 1: Define turnout pieces**

Create `components/map/pieces/turnout-pieces.ts`:

```typescript
import type { PieceDefinition } from "./piece-types"

const SEG = 60
const DIVERGE_DY = 25 // vertical offset for diverging route

export const turnoutRight: PieceDefinition = {
  id: "turnout-right",
  name: "Turnout Right",
  category: "turnout",
  description: "Right-hand turnout — splits track with diverging route to the right",
  width: SEG,
  height: DIVERGE_DY + 20,
  endpoints: [
    { id: "in", offsetX: 0, offsetY: 10, direction: 180, role: "in" },
    { id: "through", offsetX: SEG, offsetY: 10, direction: 0, role: "out" },
    { id: "diverge", offsetX: SEG, offsetY: DIVERGE_DY + 10, direction: 30, role: "out" },
  ],
  svgPath: `M 0,10 L 60,10`,
  svgExtra: `<path d="M 20,10 L 60,${DIVERGE_DY + 10}" stroke="currentColor" stroke-width="inherit" fill="none" stroke-linecap="round"/><circle cx="20" cy="10" r="4" class="turnout-dot"/>`,
}

export const turnoutLeft: PieceDefinition = {
  id: "turnout-left",
  name: "Turnout Left",
  category: "turnout",
  description: "Left-hand turnout — splits track with diverging route to the left",
  width: SEG,
  height: DIVERGE_DY + 20,
  endpoints: [
    { id: "in", offsetX: 0, offsetY: DIVERGE_DY + 10, direction: 180, role: "in" },
    { id: "through", offsetX: SEG, offsetY: DIVERGE_DY + 10, direction: 0, role: "out" },
    { id: "diverge", offsetX: SEG, offsetY: 10, direction: 330, role: "out" },
  ],
  svgPath: `M 0,${DIVERGE_DY + 10} L 60,${DIVERGE_DY + 10}`,
  svgExtra: `<path d="M 20,${DIVERGE_DY + 10} L 60,10" stroke="currentColor" stroke-width="inherit" fill="none" stroke-linecap="round"/><circle cx="20" cy="${DIVERGE_DY + 10}" r="4" class="turnout-dot"/>`,
}

export const wye: PieceDefinition = {
  id: "wye",
  name: "Wye",
  category: "turnout",
  description: "Y-shaped split — both routes diverge",
  width: SEG,
  height: DIVERGE_DY * 2 + 20,
  endpoints: [
    { id: "in", offsetX: 0, offsetY: DIVERGE_DY + 10, direction: 180, role: "in" },
    { id: "left", offsetX: SEG, offsetY: 10, direction: 330, role: "out" },
    { id: "right", offsetX: SEG, offsetY: DIVERGE_DY * 2 + 10, direction: 30, role: "out" },
  ],
  svgPath: "",
  svgExtra: `<path d="M 0,${DIVERGE_DY + 10} L 20,${DIVERGE_DY + 10}" stroke="currentColor" stroke-width="inherit" fill="none" stroke-linecap="round"/><path d="M 20,${DIVERGE_DY + 10} L 60,10" stroke="currentColor" stroke-width="inherit" fill="none" stroke-linecap="round"/><path d="M 20,${DIVERGE_DY + 10} L 60,${DIVERGE_DY * 2 + 10}" stroke="currentColor" stroke-width="inherit" fill="none" stroke-linecap="round"/><circle cx="20" cy="${DIVERGE_DY + 10}" r="4" class="turnout-dot"/>`,
}

export const threeWay: PieceDefinition = {
  id: "three-way",
  name: "Three-Way Turnout",
  category: "turnout",
  description: "Three routes from one point — through, left diverge, right diverge",
  width: SEG,
  height: DIVERGE_DY * 2 + 20,
  endpoints: [
    { id: "in", offsetX: 0, offsetY: DIVERGE_DY + 10, direction: 180, role: "in" },
    { id: "through", offsetX: SEG, offsetY: DIVERGE_DY + 10, direction: 0, role: "out" },
    { id: "left", offsetX: SEG, offsetY: 10, direction: 330, role: "out" },
    { id: "right", offsetX: SEG, offsetY: DIVERGE_DY * 2 + 10, direction: 30, role: "out" },
  ],
  svgPath: `M 0,${DIVERGE_DY + 10} L 60,${DIVERGE_DY + 10}`,
  svgExtra: `<path d="M 20,${DIVERGE_DY + 10} L 60,10" stroke="currentColor" stroke-width="inherit" fill="none" stroke-linecap="round"/><path d="M 20,${DIVERGE_DY + 10} L 60,${DIVERGE_DY * 2 + 10}" stroke="currentColor" stroke-width="inherit" fill="none" stroke-linecap="round"/><circle cx="20" cy="${DIVERGE_DY + 10}" r="4" class="turnout-dot"/>`,
}

export const curvedTurnoutRight: PieceDefinition = {
  id: "curved-turnout-right",
  name: "Curved Turnout Right",
  category: "turnout",
  description: "Turnout on a curve — main route curves, diverge goes straight",
  width: SEG + 10,
  height: DIVERGE_DY + 20,
  endpoints: [
    { id: "in", offsetX: 0, offsetY: 10, direction: 180, role: "in" },
    { id: "through", offsetX: SEG + 10, offsetY: DIVERGE_DY + 10, direction: 20, role: "out" },
    { id: "diverge", offsetX: SEG + 10, offsetY: 10, direction: 0, role: "out" },
  ],
  svgPath: `M 0,10 A 120,120 0 0,0 70,${DIVERGE_DY + 10}`,
  svgExtra: `<path d="M 20,12 L 70,10" stroke="currentColor" stroke-width="inherit" fill="none" stroke-linecap="round"/><circle cx="20" cy="12" r="4" class="turnout-dot"/>`,
}

export const curvedTurnoutLeft: PieceDefinition = {
  id: "curved-turnout-left",
  name: "Curved Turnout Left",
  category: "turnout",
  description: "Turnout on a curve — main route curves, diverge goes straight",
  width: SEG + 10,
  height: DIVERGE_DY + 20,
  endpoints: [
    { id: "in", offsetX: 0, offsetY: DIVERGE_DY + 10, direction: 180, role: "in" },
    { id: "through", offsetX: SEG + 10, offsetY: 10, direction: 340, role: "out" },
    { id: "diverge", offsetX: SEG + 10, offsetY: DIVERGE_DY + 10, direction: 0, role: "out" },
  ],
  svgPath: `M 0,${DIVERGE_DY + 10} A 120,120 0 0,1 70,10`,
  svgExtra: `<path d="M 20,${DIVERGE_DY + 8} L 70,${DIVERGE_DY + 10}" stroke="currentColor" stroke-width="inherit" fill="none" stroke-linecap="round"/><circle cx="20" cy="${DIVERGE_DY + 8}" r="4" class="turnout-dot"/>`,
}

export const doubleSlip: PieceDefinition = {
  id: "double-slip",
  name: "Double Slip Switch",
  category: "turnout",
  description: "Two routes crossing with switching both directions",
  width: SEG,
  height: DIVERGE_DY + 20,
  endpoints: [
    { id: "in-a", offsetX: 0, offsetY: 10, direction: 180, role: "in" },
    { id: "in-b", offsetX: 0, offsetY: DIVERGE_DY + 10, direction: 180, role: "in" },
    { id: "out-a", offsetX: SEG, offsetY: 10, direction: 0, role: "out" },
    { id: "out-b", offsetX: SEG, offsetY: DIVERGE_DY + 10, direction: 0, role: "out" },
  ],
  svgPath: `M 0,10 L 60,10 M 0,${DIVERGE_DY + 10} L 60,${DIVERGE_DY + 10}`,
  svgExtra: `<path d="M 15,10 L 45,${DIVERGE_DY + 10}" stroke="currentColor" stroke-width="inherit" fill="none" opacity="0.6"/><path d="M 15,${DIVERGE_DY + 10} L 45,10" stroke="currentColor" stroke-width="inherit" fill="none" opacity="0.6"/><circle cx="30" cy="${(DIVERGE_DY + 20) / 2}" r="4" class="turnout-dot"/>`,
}

export const singleSlip: PieceDefinition = {
  id: "single-slip",
  name: "Single Slip Switch",
  category: "turnout",
  description: "Crossing with one switch option",
  width: SEG,
  height: DIVERGE_DY + 20,
  endpoints: [
    { id: "in-a", offsetX: 0, offsetY: 10, direction: 180, role: "in" },
    { id: "in-b", offsetX: 0, offsetY: DIVERGE_DY + 10, direction: 180, role: "in" },
    { id: "out-a", offsetX: SEG, offsetY: 10, direction: 0, role: "out" },
    { id: "out-b", offsetX: SEG, offsetY: DIVERGE_DY + 10, direction: 0, role: "out" },
  ],
  svgPath: `M 0,10 L 60,10 M 0,${DIVERGE_DY + 10} L 60,${DIVERGE_DY + 10}`,
  svgExtra: `<path d="M 15,${DIVERGE_DY + 10} L 45,10" stroke="currentColor" stroke-width="inherit" fill="none" opacity="0.6"/><circle cx="30" cy="${(DIVERGE_DY + 20) / 2}" r="3" class="turnout-dot"/>`,
}

export const TURNOUT_PIECES: PieceDefinition[] = [
  turnoutRight,
  turnoutLeft,
  wye,
  threeWay,
  curvedTurnoutRight,
  curvedTurnoutLeft,
  doubleSlip,
  singleSlip,
]
```

- [ ] **Step 2: Define crossing pieces**

Create `components/map/pieces/crossing-pieces.ts`:

```typescript
import type { PieceDefinition } from "./piece-types"

const SEG = 60
const CROSS_DY = 25

export const crossing90: PieceDefinition = {
  id: "crossing-90",
  name: "90° Crossing",
  category: "crossing",
  description: "Tracks cross at right angles",
  width: SEG,
  height: SEG,
  endpoints: [
    { id: "in-h", offsetX: 0, offsetY: 30, direction: 180, role: "in" },
    { id: "out-h", offsetX: SEG, offsetY: 30, direction: 0, role: "out" },
    { id: "in-v", offsetX: 30, offsetY: 0, direction: 270, role: "in" },
    { id: "out-v", offsetX: 30, offsetY: SEG, direction: 90, role: "out" },
  ],
  svgPath: `M 0,30 L 60,30 M 30,0 L 30,60`,
  svgExtra: `<rect x="26" y="26" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1" opacity="0.4"/>`,
}

export const diamond45: PieceDefinition = {
  id: "diamond-45",
  name: "45° Diamond",
  category: "crossing",
  description: "Tracks cross at 45°",
  width: SEG,
  height: CROSS_DY + 20,
  endpoints: [
    { id: "in-a", offsetX: 0, offsetY: 10, direction: 180, role: "in" },
    { id: "out-a", offsetX: SEG, offsetY: 10, direction: 0, role: "out" },
    { id: "in-b", offsetX: 0, offsetY: CROSS_DY + 10, direction: 180, role: "in" },
    { id: "out-b", offsetX: SEG, offsetY: CROSS_DY + 10, direction: 0, role: "out" },
  ],
  svgPath: `M 0,10 L 60,10 M 0,${CROSS_DY + 10} L 60,${CROSS_DY + 10}`,
  svgExtra: `<path d="M 20,10 L 40,${CROSS_DY + 10}" stroke="currentColor" stroke-width="1" opacity="0.4"/><path d="M 40,10 L 20,${CROSS_DY + 10}" stroke="currentColor" stroke-width="1" opacity="0.4"/>`,
}

export const doubleCrossover: PieceDefinition = {
  id: "double-crossover",
  name: "Double Crossover",
  category: "crossing",
  description: "Connects two parallel tracks both directions",
  width: SEG + 20,
  height: CROSS_DY + 20,
  endpoints: [
    { id: "in-a", offsetX: 0, offsetY: 10, direction: 180, role: "in" },
    { id: "out-a", offsetX: SEG + 20, offsetY: 10, direction: 0, role: "out" },
    { id: "in-b", offsetX: 0, offsetY: CROSS_DY + 10, direction: 180, role: "in" },
    { id: "out-b", offsetX: SEG + 20, offsetY: CROSS_DY + 10, direction: 0, role: "out" },
  ],
  svgPath: `M 0,10 L 80,10 M 0,${CROSS_DY + 10} L 80,${CROSS_DY + 10}`,
  svgExtra: `<path d="M 20,10 L 60,${CROSS_DY + 10}" stroke="currentColor" stroke-width="inherit" fill="none" opacity="0.6"/><path d="M 20,${CROSS_DY + 10} L 60,10" stroke="currentColor" stroke-width="inherit" fill="none" opacity="0.6"/><circle cx="25" cy="12" r="3" class="turnout-dot"/><circle cx="55" cy="${CROSS_DY + 8}" r="3" class="turnout-dot"/>`,
}

export const singleCrossover: PieceDefinition = {
  id: "single-crossover",
  name: "Single Crossover",
  category: "crossing",
  description: "Connects two parallel tracks one direction",
  width: SEG + 20,
  height: CROSS_DY + 20,
  endpoints: [
    { id: "in-a", offsetX: 0, offsetY: 10, direction: 180, role: "in" },
    { id: "out-a", offsetX: SEG + 20, offsetY: 10, direction: 0, role: "out" },
    { id: "in-b", offsetX: 0, offsetY: CROSS_DY + 10, direction: 180, role: "in" },
    { id: "out-b", offsetX: SEG + 20, offsetY: CROSS_DY + 10, direction: 0, role: "out" },
  ],
  svgPath: `M 0,10 L 80,10 M 0,${CROSS_DY + 10} L 80,${CROSS_DY + 10}`,
  svgExtra: `<path d="M 25,10 L 55,${CROSS_DY + 10}" stroke="currentColor" stroke-width="inherit" fill="none" opacity="0.6"/><circle cx="25" cy="10" r="3" class="turnout-dot"/>`,
}

export const scissorsCrossover: PieceDefinition = {
  id: "scissors-crossover",
  name: "Scissors Crossover",
  category: "crossing",
  description: "Compact double crossover",
  width: SEG,
  height: CROSS_DY + 20,
  endpoints: [
    { id: "in-a", offsetX: 0, offsetY: 10, direction: 180, role: "in" },
    { id: "out-a", offsetX: SEG, offsetY: 10, direction: 0, role: "out" },
    { id: "in-b", offsetX: 0, offsetY: CROSS_DY + 10, direction: 180, role: "in" },
    { id: "out-b", offsetX: SEG, offsetY: CROSS_DY + 10, direction: 0, role: "out" },
  ],
  svgPath: `M 0,10 L 60,10 M 0,${CROSS_DY + 10} L 60,${CROSS_DY + 10}`,
  svgExtra: `<path d="M 10,10 L 50,${CROSS_DY + 10}" stroke="currentColor" stroke-width="inherit" fill="none" opacity="0.6"/><path d="M 10,${CROSS_DY + 10} L 50,10" stroke="currentColor" stroke-width="inherit" fill="none" opacity="0.6"/><circle cx="30" cy="${(CROSS_DY + 20) / 2}" r="3" class="turnout-dot"/><circle cx="15" cy="11" r="2.5" class="turnout-dot"/><circle cx="45" cy="${CROSS_DY + 9}" r="2.5" class="turnout-dot"/>`,
}

export const CROSSING_PIECES: PieceDefinition[] = [
  crossing90,
  diamond45,
  doubleCrossover,
  singleCrossover,
  scissorsCrossover,
]
```

- [ ] **Step 3: Define terminal pieces**

Create `components/map/pieces/terminal-pieces.ts`:

```typescript
import type { PieceDefinition } from "./piece-types"

const SEG = 60

export const bumper: PieceDefinition = {
  id: "bumper",
  name: "Bumper",
  category: "terminal",
  description: "Dead-end track stop",
  width: 30,
  height: 20,
  endpoints: [
    { id: "in", offsetX: 0, offsetY: 10, direction: 180, role: "in" },
  ],
  svgPath: "M 0,10 L 22,10",
  svgExtra: `<rect x="22" y="4" width="5" height="12" rx="1" class="bumper-stop"/>`,
}

export const turntable: PieceDefinition = {
  id: "turntable",
  name: "Turntable",
  category: "terminal",
  description: "Rotating bridge for locomotives — connects to roundhouse stalls",
  width: 80,
  height: 80,
  endpoints: [
    { id: "in", offsetX: 0, offsetY: 40, direction: 180, role: "in" },
    // Stall outputs at 30° increments around the right half
    { id: "stall-1", offsetX: 80, offsetY: 20, direction: 330, role: "out" },
    { id: "stall-2", offsetX: 80, offsetY: 40, direction: 0, role: "out" },
    { id: "stall-3", offsetX: 80, offsetY: 60, direction: 30, role: "out" },
  ],
  svgPath: "M 0,40 L 12,40 M 12,40 L 68,40",
  svgExtra: `<circle cx="40" cy="40" r="28" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4"/><circle cx="40" cy="40" r="30" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.2" stroke-dasharray="3,3"/><circle cx="40" cy="40" r="4" fill="currentColor" opacity="0.3"/>`,
}

export const roundhouseStall: PieceDefinition = {
  id: "roundhouse-stall",
  name: "Roundhouse Stall",
  category: "terminal",
  description: "Single engine stall — attaches to turntable",
  width: 40,
  height: 20,
  endpoints: [
    { id: "in", offsetX: 0, offsetY: 10, direction: 180, role: "in" },
  ],
  svgPath: "M 0,10 L 30,10",
  svgExtra: `<rect x="30" y="2" width="8" height="16" rx="2" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1"/>`,
}

export const engineHouse1: PieceDefinition = {
  id: "engine-house-1",
  name: "Engine House (1-Track)",
  category: "terminal",
  description: "Small engine facility with one track",
  width: 50,
  height: 30,
  endpoints: [
    { id: "in", offsetX: 0, offsetY: 15, direction: 180, role: "in" },
  ],
  svgPath: "M 0,15 L 25,15",
  svgExtra: `<rect x="25" y="3" width="22" height="24" rx="2" fill="currentColor" opacity="0.1" stroke="currentColor" stroke-width="1.5"/><text x="36" y="18" text-anchor="middle" fill="currentColor" font-size="8" font-family="system-ui" opacity="0.5">E</text>`,
}

export const engineHouse2: PieceDefinition = {
  id: "engine-house-2",
  name: "Engine House (2-Track)",
  category: "terminal",
  description: "Larger engine facility with two tracks",
  width: 50,
  height: 50,
  endpoints: [
    { id: "in-1", offsetX: 0, offsetY: 15, direction: 180, role: "in" },
    { id: "in-2", offsetX: 0, offsetY: 35, direction: 180, role: "in" },
  ],
  svgPath: "M 0,15 L 25,15 M 0,35 L 25,35",
  svgExtra: `<rect x="25" y="3" width="22" height="44" rx="2" fill="currentColor" opacity="0.1" stroke="currentColor" stroke-width="1.5"/><text x="36" y="28" text-anchor="middle" fill="currentColor" font-size="8" font-family="system-ui" opacity="0.5">E</text>`,
}

export const coalingTower: PieceDefinition = {
  id: "coaling-tower",
  name: "Coaling Tower",
  category: "terminal",
  description: "Coal fueling facility alongside track",
  width: SEG,
  height: 30,
  endpoints: [
    { id: "in", offsetX: 0, offsetY: 15, direction: 180, role: "in" },
    { id: "out", offsetX: SEG, offsetY: 15, direction: 0, role: "out" },
  ],
  svgPath: `M 0,15 L ${SEG},15`,
  svgExtra: `<rect x="22" y="1" width="16" height="12" rx="1" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1"/><text x="30" y="9" text-anchor="middle" fill="currentColor" font-size="6" font-family="system-ui" opacity="0.5">C</text>`,
}

export const waterColumn: PieceDefinition = {
  id: "water-column",
  name: "Water Column",
  category: "terminal",
  description: "Water facility alongside track",
  width: SEG,
  height: 30,
  endpoints: [
    { id: "in", offsetX: 0, offsetY: 15, direction: 180, role: "in" },
    { id: "out", offsetX: SEG, offsetY: 15, direction: 0, role: "out" },
  ],
  svgPath: `M 0,15 L ${SEG},15`,
  svgExtra: `<circle cx="30" cy="6" r="5" fill="currentColor" opacity="0.12" stroke="currentColor" stroke-width="1"/><text x="30" y="9" text-anchor="middle" fill="currentColor" font-size="6" font-family="system-ui" opacity="0.5">W</text>`,
}

export const ashPit: PieceDefinition = {
  id: "ash-pit",
  name: "Ash Pit",
  category: "terminal",
  description: "Ash disposal pit inline with track",
  width: SEG,
  height: 20,
  endpoints: [
    { id: "in", offsetX: 0, offsetY: 10, direction: 180, role: "in" },
    { id: "out", offsetX: SEG, offsetY: 10, direction: 0, role: "out" },
  ],
  svgPath: `M 0,10 L 20,10 M 40,10 L ${SEG},10`,
  svgExtra: `<rect x="20" y="5" width="20" height="10" rx="1" fill="currentColor" opacity="0.08" stroke="currentColor" stroke-width="1" stroke-dasharray="2,2"/>`,
}

export const TERMINAL_PIECES: PieceDefinition[] = [
  bumper,
  turntable,
  roundhouseStall,
  engineHouse1,
  engineHouse2,
  coalingTower,
  waterColumn,
  ashPit,
]
```

- [ ] **Step 4: Define specialty pieces**

Create `components/map/pieces/specialty-pieces.ts`:

```typescript
import type { PieceDefinition } from "./piece-types"

const SEG = 60

export const bridge: PieceDefinition = {
  id: "bridge",
  name: "Bridge",
  category: "specialty",
  description: "Track over a bridge",
  width: SEG,
  height: 24,
  endpoints: [
    { id: "in", offsetX: 0, offsetY: 12, direction: 180, role: "in" },
    { id: "out", offsetX: SEG, offsetY: 12, direction: 0, role: "out" },
  ],
  svgPath: `M 0,12 L ${SEG},12`,
  svgExtra: `<line x1="4" y1="6" x2="4" y2="18" stroke="currentColor" stroke-width="1.5" opacity="0.4"/><line x1="${SEG - 4}" y1="6" x2="${SEG - 4}" y2="18" stroke="currentColor" stroke-width="1.5" opacity="0.4"/><line x1="4" y1="6" x2="${SEG - 4}" y2="6" stroke="currentColor" stroke-width="0.8" opacity="0.3" stroke-dasharray="4,3"/><line x1="4" y1="18" x2="${SEG - 4}" y2="18" stroke="currentColor" stroke-width="0.8" opacity="0.3" stroke-dasharray="4,3"/>`,
}

export const tunnel: PieceDefinition = {
  id: "tunnel",
  name: "Tunnel",
  category: "specialty",
  description: "Track entering a tunnel",
  width: SEG,
  height: 24,
  endpoints: [
    { id: "in", offsetX: 0, offsetY: 12, direction: 180, role: "in" },
    { id: "out", offsetX: SEG, offsetY: 12, direction: 0, role: "out" },
  ],
  svgPath: `M 0,12 L ${SEG},12`,
  svgExtra: `<path d="M 8,20 A 10,12 0 0,1 8,4" stroke="currentColor" stroke-width="2" fill="currentColor" opacity="0.12"/><path d="M ${SEG - 8},20 A 10,12 0 0,0 ${SEG - 8},4" stroke="currentColor" stroke-width="2" fill="currentColor" opacity="0.12"/>`,
}

export const gradeCrossing: PieceDefinition = {
  id: "grade-crossing",
  name: "Grade Crossing",
  category: "specialty",
  description: "Road crosses the track",
  width: SEG,
  height: 30,
  endpoints: [
    { id: "in", offsetX: 0, offsetY: 15, direction: 180, role: "in" },
    { id: "out", offsetX: SEG, offsetY: 15, direction: 0, role: "out" },
  ],
  svgPath: `M 0,15 L ${SEG},15`,
  svgExtra: `<line x1="30" y1="0" x2="30" y2="30" stroke="currentColor" stroke-width="6" opacity="0.1"/><line x1="28" y1="0" x2="28" y2="30" stroke="currentColor" stroke-width="0.8" opacity="0.3"/><line x1="32" y1="0" x2="32" y2="30" stroke="currentColor" stroke-width="0.8" opacity="0.3"/>`,
}

export const signal: PieceDefinition = {
  id: "signal",
  name: "Signal",
  category: "specialty",
  description: "Track signal marker",
  width: SEG,
  height: 24,
  endpoints: [
    { id: "in", offsetX: 0, offsetY: 12, direction: 180, role: "in" },
    { id: "out", offsetX: SEG, offsetY: 12, direction: 0, role: "out" },
  ],
  svgPath: `M 0,12 L ${SEG},12`,
  svgExtra: `<line x1="30" y1="12" x2="30" y2="3" stroke="currentColor" stroke-width="1.5" opacity="0.5"/><circle cx="30" cy="3" r="2.5" fill="#22c55e" opacity="0.7"/>`,
}

export const switchStand: PieceDefinition = {
  id: "switch-stand",
  name: "Switch Stand",
  category: "specialty",
  description: "Manual switch indicator",
  width: SEG,
  height: 24,
  endpoints: [
    { id: "in", offsetX: 0, offsetY: 12, direction: 180, role: "in" },
    { id: "out", offsetX: SEG, offsetY: 12, direction: 0, role: "out" },
  ],
  svgPath: `M 0,12 L ${SEG},12`,
  svgExtra: `<line x1="30" y1="12" x2="30" y2="4" stroke="currentColor" stroke-width="1.2" opacity="0.5"/><rect x="27" y="2" width="6" height="4" rx="1" fill="currentColor" opacity="0.3"/>`,
}

export const SPECIALTY_PIECES: PieceDefinition[] = [
  bridge,
  tunnel,
  gradeCrossing,
  signal,
  switchStand,
]
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add components/map/pieces/turnout-pieces.ts components/map/pieces/crossing-pieces.ts components/map/pieces/terminal-pieces.ts components/map/pieces/specialty-pieces.ts
git commit -m "feat(track-editor): add turnout, crossing, terminal, and specialty piece definitions"
```

---

## Task 5: Piece Registry

**Files:**
- Create: `components/map/pieces/piece-registry.ts`

- [ ] **Step 1: Create the centralized registry**

Create `components/map/pieces/piece-registry.ts`:

```typescript
import type { PieceDefinition, PieceCategory } from "./piece-types"
import { BASIC_PIECES } from "./basic-pieces"
import { TURNOUT_PIECES } from "./turnout-pieces"
import { CROSSING_PIECES } from "./crossing-pieces"
import { TERMINAL_PIECES } from "./terminal-pieces"
import { SPECIALTY_PIECES } from "./specialty-pieces"

const ALL_PIECES: PieceDefinition[] = [
  ...BASIC_PIECES,
  ...TURNOUT_PIECES,
  ...CROSSING_PIECES,
  ...TERMINAL_PIECES,
  ...SPECIALTY_PIECES,
]

// ─── Lookup map ───

const PIECE_MAP = new Map<string, PieceDefinition>()
for (const piece of ALL_PIECES) {
  PIECE_MAP.set(piece.id, piece)
}

/**
 * Get a piece definition by its ID.
 */
export function getPieceDef(id: string): PieceDefinition | undefined {
  return PIECE_MAP.get(id)
}

/**
 * Get the full registry map (for geometry helpers that need it).
 */
export function getPieceRegistry(): Map<string, PieceDefinition> {
  return PIECE_MAP
}

/**
 * Get all pieces in a category.
 */
export function getPiecesByCategory(category: PieceCategory): PieceDefinition[] {
  return ALL_PIECES.filter((p) => p.category === category)
}

/**
 * Get all categories with their pieces.
 */
export function getAllCategories(): { category: PieceCategory; label: string; pieces: PieceDefinition[] }[] {
  return [
    { category: "basic", label: "Basic Track", pieces: getPiecesByCategory("basic") },
    { category: "turnout", label: "Turnouts & Switches", pieces: getPiecesByCategory("turnout") },
    { category: "crossing", label: "Crossings", pieces: getPiecesByCategory("crossing") },
    { category: "terminal", label: "Terminals & Facilities", pieces: getPiecesByCategory("terminal") },
    { category: "specialty", label: "Specialty", pieces: getPiecesByCategory("specialty") },
  ]
}

/**
 * Default radial picker pieces — the 7 most commonly used pieces.
 */
export const RADIAL_DEFAULTS: string[] = [
  "straight",
  "curve-left-45",
  "curve-right-45",
  "turnout-right",
  "turnout-left",
  "bumper",
]

/**
 * Get the radial default piece definitions.
 */
export function getRadialDefaults(): PieceDefinition[] {
  return RADIAL_DEFAULTS.map((id) => PIECE_MAP.get(id)).filter(Boolean) as PieceDefinition[]
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/map/pieces/piece-registry.ts
git commit -m "feat(track-editor): add centralized piece registry with category lookups"
```

---

## Task 6: Piece Store (Zustand)

**Files:**
- Create: `components/map/use-piece-store.ts`

- [ ] **Step 1: Create the piece store**

Create `components/map/use-piece-store.ts`:

```typescript
import { create } from "zustand"
import type { PlacedPiece, PieceAction, ResolvedEndpoint } from "./pieces/piece-types"

const MAX_UNDO = 50

interface PieceStore {
  // ─── State ───
  pieces: PlacedPiece[]
  selectedPieceId: string | null
  activeEndpoint: ResolvedEndpoint | null  // endpoint the radial picker is open on
  canvasId: string | null
  locationId: string | null
  saveStatus: "saved" | "saving" | "unsaved"
  showCatalog: boolean                     // full piece browser open

  // ─── Undo/Redo ───
  undoStack: PieceAction[]
  redoStack: PieceAction[]

  // ─── Setters ───
  setPieces: (pieces: PlacedPiece[]) => void
  setCanvasInfo: (canvasId: string, locationId: string) => void
  setSaveStatus: (status: "saved" | "saving" | "unsaved") => void

  // ─── Piece operations ───
  placePiece: (piece: PlacedPiece) => void
  removePiece: (pieceId: string) => void
  removePieceWithDownstream: (pieceId: string) => void
  updatePiece: (pieceId: string, updates: Partial<PlacedPiece>) => void

  // ─── Selection ───
  selectPiece: (pieceId: string | null) => void
  setActiveEndpoint: (endpoint: ResolvedEndpoint | null) => void
  setShowCatalog: (show: boolean) => void

  // ─── Undo/Redo ───
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  // ─── Reset ───
  reset: () => void
}

function findDownstream(pieces: PlacedPiece[], rootId: string): PlacedPiece[] {
  // BFS: find all pieces connected downstream from rootId
  const downstream: PlacedPiece[] = []
  const visited = new Set<string>()
  const queue = [rootId]

  while (queue.length > 0) {
    const currentId = queue.shift()!
    if (visited.has(currentId)) continue
    visited.add(currentId)

    const current = pieces.find((p) => p.id === currentId)
    if (!current) continue

    // Find pieces whose connectedEndpoints reference this piece
    for (const piece of pieces) {
      if (visited.has(piece.id)) continue
      for (const connectedGlobalId of Object.values(piece.connectedEndpoints)) {
        if (connectedGlobalId && connectedGlobalId.startsWith(currentId + ":")) {
          downstream.push(piece)
          queue.push(piece.id)
          break
        }
      }
    }
  }

  return downstream
}

export const usePieceStore = create<PieceStore>((set, get) => ({
  // ─── Initial state ───
  pieces: [],
  selectedPieceId: null,
  activeEndpoint: null,
  canvasId: null,
  locationId: null,
  saveStatus: "saved",
  showCatalog: false,
  undoStack: [],
  redoStack: [],

  // ─── Setters ───
  setPieces: (pieces) => set({ pieces, undoStack: [], redoStack: [] }),
  setCanvasInfo: (canvasId, locationId) => set({ canvasId, locationId }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),

  // ─── Piece operations ───
  placePiece: (piece) => {
    const action: PieceAction = { type: "place", piece }
    set((s) => ({
      pieces: [...s.pieces, piece],
      undoStack: [...s.undoStack.slice(-MAX_UNDO + 1), action],
      redoStack: [],
      saveStatus: "unsaved",
      activeEndpoint: null,
      showCatalog: false,
    }))
  },

  removePiece: (pieceId) => {
    const { pieces } = get()
    const piece = pieces.find((p) => p.id === pieceId)
    if (!piece) return

    const action: PieceAction = { type: "remove", piece, downstream: [] }
    set((s) => ({
      pieces: s.pieces.filter((p) => p.id !== pieceId).map((p) => {
        // Clear any connections pointing to the removed piece
        const updated = { ...p, connectedEndpoints: { ...p.connectedEndpoints } }
        for (const [key, val] of Object.entries(updated.connectedEndpoints)) {
          if (val && val.startsWith(pieceId + ":")) {
            updated.connectedEndpoints[key] = null
          }
        }
        return updated
      }),
      undoStack: [...s.undoStack.slice(-MAX_UNDO + 1), action],
      redoStack: [],
      selectedPieceId: s.selectedPieceId === pieceId ? null : s.selectedPieceId,
      saveStatus: "unsaved",
    }))
  },

  removePieceWithDownstream: (pieceId) => {
    const { pieces } = get()
    const piece = pieces.find((p) => p.id === pieceId)
    if (!piece) return

    const downstream = findDownstream(pieces, pieceId)
    const removeIds = new Set([pieceId, ...downstream.map((p) => p.id)])
    const action: PieceAction = { type: "remove", piece, downstream }

    set((s) => ({
      pieces: s.pieces.filter((p) => !removeIds.has(p.id)).map((p) => {
        const updated = { ...p, connectedEndpoints: { ...p.connectedEndpoints } }
        for (const [key, val] of Object.entries(updated.connectedEndpoints)) {
          if (val) {
            const refPieceId = val.split(":")[0]
            if (removeIds.has(refPieceId)) {
              updated.connectedEndpoints[key] = null
            }
          }
        }
        return updated
      }),
      undoStack: [...s.undoStack.slice(-MAX_UNDO + 1), action],
      redoStack: [],
      selectedPieceId: removeIds.has(s.selectedPieceId ?? "") ? null : s.selectedPieceId,
      saveStatus: "unsaved",
    }))
  },

  updatePiece: (pieceId, updates) => {
    const { pieces } = get()
    const piece = pieces.find((p) => p.id === pieceId)
    if (!piece) return

    const before: Partial<PlacedPiece> = {}
    const after: Partial<PlacedPiece> = {}
    for (const key of Object.keys(updates) as (keyof PlacedPiece)[]) {
      (before as Record<string, unknown>)[key] = piece[key];
      (after as Record<string, unknown>)[key] = updates[key]
    }

    const action: PieceAction = { type: "update", pieceId, before, after }
    set((s) => ({
      pieces: s.pieces.map((p) => (p.id === pieceId ? { ...p, ...updates } : p)),
      undoStack: [...s.undoStack.slice(-MAX_UNDO + 1), action],
      redoStack: [],
      saveStatus: "unsaved",
    }))
  },

  // ─── Selection ───
  selectPiece: (pieceId) => set({ selectedPieceId: pieceId, activeEndpoint: null, showCatalog: false }),
  setActiveEndpoint: (endpoint) => set({ activeEndpoint: endpoint, selectedPieceId: null }),
  setShowCatalog: (showCatalog) => set({ showCatalog }),

  // ─── Undo/Redo ───
  undo: () => {
    const { undoStack, pieces } = get()
    if (undoStack.length === 0) return

    const action = undoStack[undoStack.length - 1]
    let newPieces = [...pieces]

    if (action.type === "place") {
      newPieces = newPieces.filter((p) => p.id !== action.piece.id).map((p) => {
        const updated = { ...p, connectedEndpoints: { ...p.connectedEndpoints } }
        for (const [key, val] of Object.entries(updated.connectedEndpoints)) {
          if (val && val.startsWith(action.piece.id + ":")) {
            updated.connectedEndpoints[key] = null
          }
        }
        return updated
      })
    } else if (action.type === "remove") {
      newPieces = [...newPieces, action.piece, ...action.downstream]
    } else if (action.type === "update") {
      newPieces = newPieces.map((p) =>
        p.id === action.pieceId ? { ...p, ...action.before } : p
      )
    }

    set((s) => ({
      pieces: newPieces,
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [...s.redoStack, action],
      saveStatus: "unsaved",
    }))
  },

  redo: () => {
    const { redoStack, pieces } = get()
    if (redoStack.length === 0) return

    const action = redoStack[redoStack.length - 1]
    let newPieces = [...pieces]

    if (action.type === "place") {
      newPieces = [...newPieces, action.piece]
    } else if (action.type === "remove") {
      const removeIds = new Set([action.piece.id, ...action.downstream.map((p) => p.id)])
      newPieces = newPieces.filter((p) => !removeIds.has(p.id))
    } else if (action.type === "update") {
      newPieces = newPieces.map((p) =>
        p.id === action.pieceId ? { ...p, ...action.after } : p
      )
    }

    set((s) => ({
      pieces: newPieces,
      undoStack: [...s.undoStack, action],
      redoStack: s.redoStack.slice(0, -1),
      saveStatus: "unsaved",
    }))
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  // ─── Reset ───
  reset: () => set({
    pieces: [],
    selectedPieceId: null,
    activeEndpoint: null,
    canvasId: null,
    locationId: null,
    saveStatus: "saved",
    showCatalog: false,
    undoStack: [],
    redoStack: [],
  }),
}))
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/map/use-piece-store.ts
git commit -m "feat(track-editor): add piece Zustand store with undo/redo and downstream removal"
```

---

## Task 7: SVG Piece Renderer & Endpoint Marker

**Files:**
- Create: `components/map/svg/piece-renderer.tsx`
- Create: `components/map/svg/endpoint-marker.tsx`

- [ ] **Step 1: Create the piece renderer**

Create `components/map/svg/piece-renderer.tsx`:

```tsx
"use client"

import { memo } from "react"
import type { PlacedPiece } from "../pieces/piece-types"
import type { PieceDefinition } from "../pieces/piece-types"
import { pieceTransform } from "../pieces/piece-geometry"
import { getTrackColor, getTurnoutColor, getBumperColor, getSelectionColor } from "./track-colors"

interface PieceRendererProps {
  piece: PlacedPiece
  pieceDef: PieceDefinition
  isDark: boolean
  selected?: boolean
}

export const PieceRenderer = memo(function PieceRenderer({
  piece,
  pieceDef,
  isDark,
  selected = false,
}: PieceRendererProps) {
  const trackColor = getTrackColor(piece.trackType ?? "LEAD", isDark)
  const turnoutColor = getTurnoutColor(isDark)
  const bumperColor = getBumperColor(isDark)
  const selectionColor = getSelectionColor(isDark)
  const transform = pieceTransform(piece, pieceDef)

  const strokeWidth = pieceDef.category === "basic" ? 3 : 2.5

  return (
    <g
      transform={transform}
      data-piece-id={piece.id}
      style={{ cursor: "pointer" }}
    >
      {/* Selection highlight */}
      {selected && (
        <g opacity={0.25}>
          {pieceDef.svgPath && (
            <path
              d={pieceDef.svgPath}
              stroke={selectionColor}
              strokeWidth={strokeWidth + 6}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </g>
      )}

      {/* Main track path */}
      {pieceDef.svgPath && (
        <path
          d={pieceDef.svgPath}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Extra SVG (turnout dots, bumper stops, facility shapes) */}
      {pieceDef.svgExtra && (
        <g
          color={trackColor}
          strokeWidth={strokeWidth}
          dangerouslySetInnerHTML={{ __html: pieceDef.svgExtra }}
          style={
            {
              "--turnout-color": turnoutColor,
              "--bumper-color": bumperColor,
            } as React.CSSProperties
          }
        />
      )}

      {/* Track label */}
      {piece.name && (
        <g>
          <rect
            x={pieceDef.width / 2 - 30}
            y={-14}
            width={60}
            height={16}
            rx={8}
            fill={trackColor}
            opacity={0.12}
          />
          <text
            x={pieceDef.width / 2}
            y={-3}
            textAnchor="middle"
            fill={trackColor}
            fontSize={9}
            fontFamily="system-ui"
            fontWeight={600}
          >
            {piece.name}
          </text>
        </g>
      )}

      {/* Capacity badge */}
      {piece.capacity != null && piece.capacity > 0 && (
        <g>
          <rect
            x={pieceDef.width - 36}
            y={-14}
            width={36}
            height={14}
            rx={7}
            fill={trackColor}
            opacity={0.08}
          />
          <text
            x={pieceDef.width - 18}
            y={-4}
            textAnchor="middle"
            fill={trackColor}
            fontSize={8}
            fontFamily="system-ui"
            opacity={0.8}
          >
            {piece.capacity} cars
          </text>
        </g>
      )}

      {/* Selection border */}
      {selected && (
        <rect
          x={-2}
          y={-2}
          width={pieceDef.width + 4}
          height={pieceDef.height + 4}
          rx={3}
          fill="none"
          stroke={selectionColor}
          strokeWidth={1.5}
          strokeDasharray="4,3"
          opacity={0.5}
        />
      )}
    </g>
  )
})
```

- [ ] **Step 2: Create the endpoint marker**

Create `components/map/svg/endpoint-marker.tsx`:

```tsx
"use client"

import { memo } from "react"
import type { ResolvedEndpoint } from "../pieces/piece-types"
import { getEndpointColor } from "./track-colors"

interface EndpointMarkerProps {
  endpoint: ResolvedEndpoint
  isDark: boolean
  onClick?: (endpoint: ResolvedEndpoint) => void
}

export const EndpointMarker = memo(function EndpointMarker({
  endpoint,
  isDark,
  onClick,
}: EndpointMarkerProps) {
  const color = getEndpointColor(isDark)

  return (
    <g
      style={{ cursor: "pointer" }}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.(endpoint)
      }}
    >
      {/* Outer glow pulse */}
      <circle
        cx={endpoint.position.x}
        cy={endpoint.position.y}
        r={12}
        fill={color}
        opacity={0}
      >
        <animate
          attributeName="r"
          values="8;14;8"
          dur="2s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.15;0.05;0.15"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>

      {/* Inner dot */}
      <circle
        cx={endpoint.position.x}
        cy={endpoint.position.y}
        r={5}
        fill={color}
        opacity={0.8}
      >
        <animate
          attributeName="opacity"
          values="0.8;0.4;0.8"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>
    </g>
  )
})
```

- [ ] **Step 3: Add CSS classes for piece SVG elements**

The `svgExtra` markup in piece definitions uses classes like `turnout-dot` and `bumper-stop`. Add styles to `app/globals.css` (inside an appropriate block, e.g. after the track color custom properties in `:root`):

```css
/* Piece SVG element styles */
.turnout-dot { fill: var(--track-turnout); }
.bumper-stop { fill: var(--track-bumper); }
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add components/map/svg/piece-renderer.tsx components/map/svg/endpoint-marker.tsx app/globals.css
git commit -m "feat(track-editor): add SVG piece renderer and pulsing endpoint marker"
```

---

## Task 8: Radial Piece Picker

**Files:**
- Create: `components/map/radial-piece-picker.tsx`

- [ ] **Step 1: Create the radial picker component**

Create `components/map/radial-piece-picker.tsx`:

```tsx
"use client"

import { useCallback, useEffect, useState } from "react"
import type { ResolvedEndpoint, PieceDefinition } from "./pieces/piece-types"
import { getRadialDefaults } from "./pieces/piece-registry"
import { getTrackColor } from "./svg/track-colors"

interface RadialPiecePickerProps {
  endpoint: ResolvedEndpoint
  isDark: boolean
  onSelect: (pieceDef: PieceDefinition, endpoint: ResolvedEndpoint) => void
  onOpenCatalog: () => void
  onClose: () => void
}

// SVG icon paths for each piece type (simplified icons for the picker)
const PIECE_ICONS: Record<string, string> = {
  "straight": "M 4,12 L 20,12",
  "curve-left-45": "M 4,18 Q 4,6 18,6",
  "curve-right-45": "M 4,6 Q 4,18 18,18",
  "turnout-right": "M 4,12 L 20,12 M 10,12 L 20,18",
  "turnout-left": "M 4,12 L 20,12 M 10,12 L 20,6",
  "bumper": "M 4,12 L 16,12",
}

const BUMPER_EXTRA = `<rect x="16" y="8" width="3" height="8" rx="1" fill="currentColor" opacity="0.7"/>`

export function RadialPiecePicker({
  endpoint,
  isDark,
  onSelect,
  onOpenCatalog,
  onClose,
}: RadialPiecePickerProps) {
  const defaults = getRadialDefaults()
  const [visible, setVisible] = useState(false)

  // Animate in
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose])

  const handleSelect = useCallback(
    (def: PieceDefinition) => {
      onSelect(def, endpoint)
    },
    [onSelect, endpoint]
  )

  // Position items in a circle around the endpoint
  const radius = 52
  const itemCount = defaults.length + 1 // +1 for "More..." button
  const angleStep = (2 * Math.PI) / itemCount
  const startAngle = -Math.PI / 2 // start from top

  const leadColor = getTrackColor("LEAD", isDark)

  return (
    <g className="radial-picker">
      {/* Backdrop circle (subtle) */}
      <circle
        cx={endpoint.position.x}
        cy={endpoint.position.y}
        r={radius + 36}
        fill={isDark ? "rgba(15,17,23,0.6)" : "rgba(255,255,255,0.6)"}
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        style={{ cursor: "default" }}
      />

      {/* Center dot */}
      <circle
        cx={endpoint.position.x}
        cy={endpoint.position.y}
        r={6}
        fill={isDark ? "#4a9eff" : "#2563eb"}
        opacity={0.9}
      />

      {/* Piece items */}
      {defaults.map((def, i) => {
        const angle = startAngle + i * angleStep
        const x = endpoint.position.x + Math.cos(angle) * radius
        const y = endpoint.position.y + Math.sin(angle) * radius
        const iconPath = PIECE_ICONS[def.id] || PIECE_ICONS["straight"]

        return (
          <g
            key={def.id}
            onClick={(e) => {
              e.stopPropagation()
              handleSelect(def)
            }}
            style={{
              cursor: "pointer",
              opacity: visible ? 1 : 0,
              transform: visible ? "scale(1)" : "scale(0.7)",
              transformOrigin: `${x}px ${y}px`,
              transition: `all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.03}s`,
            }}
          >
            {/* Background */}
            <rect
              x={x - 28}
              y={y - 28}
              width={56}
              height={56}
              rx={12}
              fill={isDark ? "#1a1d27" : "#ffffff"}
              stroke={isDark ? "#2e3345" : "#e2e8f0"}
              strokeWidth={1.5}
            />

            {/* Icon */}
            <svg
              x={x - 12}
              y={y - 16}
              width={24}
              height={24}
              viewBox="0 0 24 24"
            >
              <path
                d={iconPath}
                stroke={leadColor}
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
              />
              {def.id === "bumper" && (
                <g dangerouslySetInnerHTML={{ __html: BUMPER_EXTRA }} />
              )}
              {(def.id === "turnout-right" || def.id === "turnout-left") && (
                <circle
                  cx={10}
                  cy={12}
                  r={2}
                  fill={isDark ? "#ff8c42" : "#c2410c"}
                />
              )}
            </svg>

            {/* Label */}
            <text
              x={x}
              y={y + 18}
              textAnchor="middle"
              fill={isDark ? "#8b90a0" : "#64748b"}
              fontSize={7}
              fontFamily="system-ui"
              fontWeight={600}
              textTransform="uppercase"
              letterSpacing={0.5}
            >
              {def.name.length > 10 ? def.name.slice(0, 9) + "…" : def.name}
            </text>
          </g>
        )
      })}

      {/* "More..." button */}
      {(() => {
        const angle = startAngle + defaults.length * angleStep
        const x = endpoint.position.x + Math.cos(angle) * radius
        const y = endpoint.position.y + Math.sin(angle) * radius

        return (
          <g
            onClick={(e) => {
              e.stopPropagation()
              onOpenCatalog()
            }}
            style={{
              cursor: "pointer",
              opacity: visible ? 1 : 0,
              transform: visible ? "scale(1)" : "scale(0.7)",
              transformOrigin: `${x}px ${y}px`,
              transition: `all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) ${defaults.length * 0.03}s`,
            }}
          >
            <rect
              x={x - 28}
              y={y - 28}
              width={56}
              height={56}
              rx={12}
              fill={isDark ? "#1a1d27" : "#ffffff"}
              stroke={isDark ? "#2e3345" : "#e2e8f0"}
              strokeWidth={1.5}
            />
            <circle cx={x - 6} cy={y - 4} r={1.5} fill={isDark ? "#8b90a0" : "#64748b"} />
            <circle cx={x} cy={y - 4} r={1.5} fill={isDark ? "#8b90a0" : "#64748b"} />
            <circle cx={x + 6} cy={y - 4} r={1.5} fill={isDark ? "#8b90a0" : "#64748b"} />
            <text
              x={x}
              y={y + 18}
              textAnchor="middle"
              fill={isDark ? "#8b90a0" : "#64748b"}
              fontSize={7}
              fontFamily="system-ui"
              fontWeight={600}
              textTransform="uppercase"
              letterSpacing={0.5}
            >
              More…
            </text>
          </g>
        )
      })()}
    </g>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/map/radial-piece-picker.tsx
git commit -m "feat(track-editor): add radial piece picker with animated entry and keyboard dismiss"
```

---

## Task 9: Piece Catalog (Full Browser)

**Files:**
- Create: `components/map/piece-catalog.tsx`

- [ ] **Step 1: Create the piece catalog component**

Create `components/map/piece-catalog.tsx`:

```tsx
"use client"

import { useState } from "react"
import type { PieceDefinition, ResolvedEndpoint } from "./pieces/piece-types"
import { getAllCategories } from "./pieces/piece-registry"
import { getTrackColor } from "./svg/track-colors"

interface PieceCatalogProps {
  endpoint: ResolvedEndpoint
  isDark: boolean
  onSelect: (pieceDef: PieceDefinition, endpoint: ResolvedEndpoint) => void
  onClose: () => void
}

export function PieceCatalog({ endpoint, isDark, onSelect, onClose }: PieceCatalogProps) {
  const categories = getAllCategories()
  const [search, setSearch] = useState("")
  const leadColor = getTrackColor("LEAD", isDark)

  const filteredCategories = categories
    .map((cat) => ({
      ...cat,
      pieces: cat.pieces.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.description.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((cat) => cat.pieces.length > 0)

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: isDark ? "rgba(15,17,23,0.85)" : "rgba(255,255,255,0.85)",
        backdropFilter: "blur(8px)",
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(560px, 90%)",
          maxHeight: "70vh",
          background: isDark ? "#1a1d27" : "#ffffff",
          border: `1px solid ${isDark ? "#2e3345" : "#e2e8f0"}`,
          borderRadius: 12,
          boxShadow: isDark
            ? "0 24px 48px rgba(0,0,0,0.5)"
            : "0 24px 48px rgba(0,0,0,0.12)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px 12px",
            borderBottom: `1px solid ${isDark ? "#2e3345" : "#e2e8f0"}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1,
                color: isDark ? "#8b90a0" : "#64748b",
                fontWeight: 600,
              }}
            >
              All Track Pieces
            </span>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: isDark ? "#8b90a0" : "#64748b",
                cursor: "pointer",
                fontSize: 16,
                padding: "2px 6px",
              }}
            >
              ✕
            </button>
          </div>
          <input
            type="text"
            placeholder="Search pieces..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 8,
              border: `1px solid ${isDark ? "#2e3345" : "#e2e8f0"}`,
              background: isDark ? "#0f1117" : "#f8fafc",
              color: isDark ? "#e4e7ef" : "#1e293b",
              fontSize: 13,
              outline: "none",
            }}
          />
        </div>

        {/* Scrollable list */}
        <div style={{ overflowY: "auto", padding: "12px 20px 20px" }}>
          {filteredCategories.map((cat) => (
            <div key={cat.category} style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  color: isDark ? "#8b90a0" : "#94a3b8",
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                {cat.label}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                  gap: 8,
                }}
              >
                {cat.pieces.map((piece) => (
                  <button
                    key={piece.id}
                    onClick={() => onSelect(piece, endpoint)}
                    style={{
                      background: isDark ? "#232733" : "#f1f5f9",
                      border: `1px solid ${isDark ? "#2e3345" : "#e2e8f0"}`,
                      borderRadius: 8,
                      padding: "10px 8px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      transition: "all 0.15s",
                      color: isDark ? "#e4e7ef" : "#1e293b",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = isDark ? "#4a9eff" : "#2563eb"
                      e.currentTarget.style.background = isDark ? "#2e3345" : "#e2e8f0"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = isDark ? "#2e3345" : "#e2e8f0"
                      e.currentTarget.style.background = isDark ? "#232733" : "#f1f5f9"
                    }}
                  >
                    <svg width={40} height={24} viewBox={`0 0 ${piece.width} ${piece.height}`}>
                      {piece.svgPath && (
                        <path
                          d={piece.svgPath}
                          stroke={leadColor}
                          strokeWidth={2.5}
                          fill="none"
                          strokeLinecap="round"
                        />
                      )}
                      {piece.svgExtra && (
                        <g
                          color={leadColor}
                          strokeWidth={2}
                          dangerouslySetInnerHTML={{ __html: piece.svgExtra }}
                        />
                      )}
                    </svg>
                    <span style={{ fontSize: 10, fontWeight: 500, textAlign: "center" }}>
                      {piece.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {filteredCategories.length === 0 && (
            <div style={{ textAlign: "center", padding: 24, color: isDark ? "#8b90a0" : "#94a3b8", fontSize: 13 }}>
              No pieces match &ldquo;{search}&rdquo;
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/map/piece-catalog.tsx
git commit -m "feat(track-editor): add full piece catalog browser with search and categories"
```

---

## Task 10: Yard Piece Properties Panel

**Files:**
- Create: `components/map/yard-piece-properties.tsx`

- [ ] **Step 1: Create the properties panel**

Create `components/map/yard-piece-properties.tsx`:

```tsx
"use client"

import { useCallback } from "react"
import { usePieceStore } from "./use-piece-store"
import { getPieceDef } from "./pieces/piece-registry"
import { getTrackColor, TRACK_TYPE_COLORS, type TrackTypeName } from "./svg/track-colors"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface YardPiecePropertiesProps {
  isDark: boolean
}

const TRACK_TYPES: { value: string; label: string }[] = Object.entries(TRACK_TYPE_COLORS).map(
  ([key, val]) => ({ value: key, label: val.label })
)

export function YardPieceProperties({ isDark }: YardPiecePropertiesProps) {
  const pieces = usePieceStore((s) => s.pieces)
  const selectedPieceId = usePieceStore((s) => s.selectedPieceId)
  const updatePiece = usePieceStore((s) => s.updatePiece)
  const removePieceWithDownstream = usePieceStore((s) => s.removePieceWithDownstream)

  const selectedPiece = pieces.find((p) => p.id === selectedPieceId)
  const pieceDef = selectedPiece ? getPieceDef(selectedPiece.pieceDefId) : null

  const handleNameChange = useCallback(
    (value: string) => {
      if (selectedPieceId) updatePiece(selectedPieceId, { name: value || undefined })
    },
    [selectedPieceId, updatePiece]
  )

  const handleTypeChange = useCallback(
    (value: string) => {
      if (selectedPieceId) updatePiece(selectedPieceId, { trackType: value })
    },
    [selectedPieceId, updatePiece]
  )

  const handleCapacityChange = useCallback(
    (value: string) => {
      const num = parseInt(value, 10)
      if (selectedPieceId) updatePiece(selectedPieceId, { capacity: isNaN(num) ? undefined : num })
    },
    [selectedPieceId, updatePiece]
  )

  const handleDelete = useCallback(() => {
    if (selectedPieceId) removePieceWithDownstream(selectedPieceId)
  }, [selectedPieceId, removePieceWithDownstream])

  // Yard summary stats
  const totalTracks = pieces.filter((p) => {
    const def = getPieceDef(p.pieceDefId)
    return def?.category === "basic" || def?.category === "terminal"
  }).length
  const totalTurnouts = pieces.filter((p) => {
    const def = getPieceDef(p.pieceDefId)
    return def?.category === "turnout" || def?.category === "crossing"
  }).length
  const totalCapacity = pieces.reduce((sum, p) => sum + (p.capacity ?? 0), 0)

  return (
    <div className="flex flex-col gap-4 p-4 border-l border-border bg-card h-full overflow-y-auto" style={{ width: 280 }}>
      {selectedPiece && pieceDef ? (
        <>
          {/* Selected piece info */}
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
              Selected: {pieceDef.name}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input
                value={selectedPiece.name ?? ""}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Track name..."
                className="mt-1 h-8 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Track Type</Label>
              <Select
                value={selectedPiece.trackType ?? "LEAD"}
                onValueChange={handleTypeChange}
              >
                <SelectTrigger className="mt-1 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRACK_TYPES.map((tt) => (
                    <SelectItem key={tt.value} value={tt.value}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full"
                          style={{ background: getTrackColor(tt.value, isDark) }}
                        />
                        {tt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Capacity (cars)</Label>
              <Input
                type="number"
                min={0}
                value={selectedPiece.capacity ?? ""}
                onChange={(e) => handleCapacityChange(e.target.value)}
                placeholder="0"
                className="mt-1 h-8 text-sm"
              />
            </div>

            <div className="pt-2">
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={handleDelete}
              >
                Delete Piece
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
            No Selection
          </p>
          <p className="text-xs text-muted-foreground">
            Click a track piece to edit its properties, or click an open endpoint to add a new piece.
          </p>
        </div>
      )}

      {/* Divider */}
      <div className="h-px bg-border my-1" />

      {/* Yard summary */}
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
          Yard Summary
        </p>
        <div className="flex flex-col gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Track pieces</span>
            <span>{totalTracks}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Turnouts</span>
            <span>{totalTurnouts}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total capacity</span>
            <span>{totalCapacity} cars</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border my-1" />

      {/* Track type legend */}
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
          Track Types
        </p>
        <div className="flex flex-col gap-1.5">
          {TRACK_TYPES.map((tt) => (
            <div key={tt.value} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className="inline-block w-5 h-0.5 rounded"
                style={{ background: getTrackColor(tt.value, isDark) }}
              />
              {tt.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/map/yard-piece-properties.tsx
git commit -m "feat(track-editor): add yard piece properties panel with track type, capacity, and legend"
```

---

## Task 11: Yard Piece Editor (Main Canvas)

**Files:**
- Create: `components/map/yard-piece-editor.tsx`

This is the core component — the SVG canvas that renders all pieces, endpoints, and handles interactions.

- [ ] **Step 1: Create the yard piece editor**

Create `components/map/yard-piece-editor.tsx`:

```tsx
"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePieceStore } from "./use-piece-store"
import { getPieceDef, getPieceRegistry } from "./pieces/piece-registry"
import { resolveAllEndpoints, findOpenEndpoints, calculatePlacement, isPointInPiece } from "./pieces/piece-geometry"
import type { PlacedPiece, ResolvedEndpoint, PieceDefinition, Point } from "./pieces/piece-types"
import { PieceRenderer } from "./svg/piece-renderer"
import { EndpointMarker } from "./svg/endpoint-marker"
import { RadialPiecePicker } from "./radial-piece-picker"
import { PieceCatalog } from "./piece-catalog"
import { YardPieceProperties } from "./yard-piece-properties"
import { getYardCanvasData, saveYardCanvas } from "@/app/actions/yard-canvas"

interface ViewBox {
  x: number
  y: number
  width: number
  height: number
}

interface YardPieceEditorProps {
  locationId: string
}

const MIN_ZOOM = 0.3
const MAX_ZOOM = 4
const ENDPOINT_HIT_RADIUS = 20
const SAVE_DEBOUNCE_MS = 1500

export function YardPieceEditor({ locationId }: YardPieceEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pieces = usePieceStore((s) => s.pieces)
  const selectedPieceId = usePieceStore((s) => s.selectedPieceId)
  const activeEndpoint = usePieceStore((s) => s.activeEndpoint)
  const showCatalog = usePieceStore((s) => s.showCatalog)
  const canvasId = usePieceStore((s) => s.canvasId)
  const setPieces = usePieceStore((s) => s.setPieces)
  const setCanvasInfo = usePieceStore((s) => s.setCanvasInfo)
  const setSaveStatus = usePieceStore((s) => s.setSaveStatus)
  const selectPiece = usePieceStore((s) => s.selectPiece)
  const setActiveEndpoint = usePieceStore((s) => s.setActiveEndpoint)
  const setShowCatalog = usePieceStore((s) => s.setShowCatalog)
  const placePiece = usePieceStore((s) => s.placePiece)
  const undo = usePieceStore((s) => s.undo)
  const redo = usePieceStore((s) => s.redo)
  const removePieceWithDownstream = usePieceStore((s) => s.removePieceWithDownstream)

  const [viewBox, setViewBox] = useState<ViewBox>({ x: -200, y: -100, width: 1200, height: 700 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<Point | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDark, setIsDark] = useState(false)

  const registry = getPieceRegistry()

  // Detect dark mode
  useEffect(() => {
    const check = () =>
      setIsDark(document.documentElement.classList.contains("dark"))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  // Load canvas data
  useEffect(() => {
    let cancelled = false
    async function load() {
      const result = await getYardCanvasData(locationId)
      if (cancelled || !result.success || !result.data) return

      const { canvas } = result.data
      if (canvas) {
        setCanvasInfo(canvas.id, locationId)
        const viewport = canvas.viewport as { x?: number; y?: number; zoom?: number }
        if (viewport?.zoom) {
          setViewBox((v) => ({
            x: viewport.x ?? v.x,
            y: viewport.y ?? v.y,
            width: 1200 / viewport.zoom,
            height: 700 / viewport.zoom,
          }))
        }
        // Load pieces from trackElements JSON
        const elements = canvas.trackElements as PlacedPiece[] | undefined
        if (Array.isArray(elements)) {
          setPieces(elements)
        }
      } else {
        // No canvas yet — will be created on first save
        setCanvasInfo("", locationId)
        // Place initial starting endpoint piece
        const startPiece: PlacedPiece = {
          id: crypto.randomUUID(),
          pieceDefId: "straight",
          position: { x: 0, y: 0 },
          rotation: 0,
          trackType: "LEAD",
          name: "Entry",
          connectedEndpoints: {},
        }
        setPieces([startPiece])
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [locationId, setCanvasInfo, setPieces])

  // Auto-save on piece changes
  useEffect(() => {
    if (loading || !canvasId) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus("saving")
      const zoom = 1200 / viewBox.width
      await saveYardCanvas({
        canvasId: canvasId || undefined,
        locationId,
        viewport: { x: viewBox.x, y: viewBox.y, zoom },
        trackElements: pieces,
      })
      setSaveStatus("saved")
    }, SAVE_DEBOUNCE_MS)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [pieces, canvasId, locationId, loading, viewBox, setSaveStatus])

  // Resolve open endpoints
  const openEndpoints = findOpenEndpoints(pieces, registry)

  // Convert client coordinates to SVG coordinates
  const clientToSvg = useCallback(
    (clientX: number, clientY: number): Point => {
      const svg = svgRef.current
      if (!svg) return { x: 0, y: 0 }
      const rect = svg.getBoundingClientRect()
      return {
        x: viewBox.x + ((clientX - rect.left) / rect.width) * viewBox.width,
        y: viewBox.y + ((clientY - rect.top) / rect.height) * viewBox.height,
      }
    },
    [viewBox]
  )

  // ─── Click handling ───
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (isPanning) return
      const point = clientToSvg(e.clientX, e.clientY)

      // Check if clicking an open endpoint
      for (const ep of openEndpoints) {
        const dx = point.x - ep.position.x
        const dy = point.y - ep.position.y
        if (Math.sqrt(dx * dx + dy * dy) < ENDPOINT_HIT_RADIUS) {
          setActiveEndpoint(ep)
          return
        }
      }

      // Check if clicking a placed piece
      for (const piece of [...pieces].reverse()) {
        const def = registry.get(piece.pieceDefId)
        if (def && isPointInPiece(point, piece, def)) {
          selectPiece(piece.id)
          return
        }
      }

      // Clicked empty canvas — deselect
      selectPiece(null)
      setActiveEndpoint(null)
    },
    [isPanning, clientToSvg, openEndpoints, pieces, registry, selectPiece, setActiveEndpoint]
  )

  // ─── Piece placement ───
  const handlePieceSelect = useCallback(
    (pieceDef: PieceDefinition, endpoint: ResolvedEndpoint) => {
      const { position, rotation } = calculatePlacement(endpoint, pieceDef)

      const newPiece: PlacedPiece = {
        id: crypto.randomUUID(),
        pieceDefId: pieceDef.id,
        position,
        rotation,
        trackType: pieceDef.defaultTrackType,
        connectedEndpoints: {},
      }

      // Find which input endpoint on the new piece connects to the open endpoint
      const inputDef = pieceDef.endpoints.find((ep) => ep.role === "in")
      if (inputDef) {
        newPiece.connectedEndpoints[inputDef.id] = endpoint.globalId
      }

      // Update the source piece to mark its endpoint as connected
      const sourcePiece = pieces.find((p) => p.id === endpoint.pieceId)
      if (sourcePiece) {
        const updatedConnections = { ...sourcePiece.connectedEndpoints }
        updatedConnections[endpoint.endpointDefId] = `${newPiece.id}:${inputDef?.id ?? "in"}`
        // Direct store mutation for connection update (no undo entry — the place action covers it)
        usePieceStore.setState((s) => ({
          pieces: s.pieces.map((p) =>
            p.id === sourcePiece.id ? { ...p, connectedEndpoints: updatedConnections } : p
          ),
        }))
      }

      placePiece(newPiece)
    },
    [pieces, placePiece]
  )

  // ─── Pan/Zoom ───
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault()
        setIsPanning(true)
        setPanStart({ x: e.clientX, y: e.clientY })
      }
    },
    []
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning || !panStart) return
      const svg = svgRef.current
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      const dx = ((e.clientX - panStart.x) / rect.width) * viewBox.width
      const dy = ((e.clientY - panStart.y) / rect.height) * viewBox.height
      setViewBox((v) => ({ ...v, x: v.x - dx, y: v.y - dy }))
      setPanStart({ x: e.clientX, y: e.clientY })
    },
    [isPanning, panStart, viewBox]
  )

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
    setPanStart(null)
  }, [])

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      const factor = e.deltaY > 0 ? 1.1 : 0.9
      const svg = svgRef.current
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      const mouseX = viewBox.x + ((e.clientX - rect.left) / rect.width) * viewBox.width
      const mouseY = viewBox.y + ((e.clientY - rect.top) / rect.height) * viewBox.height

      const newWidth = Math.max(1200 / MAX_ZOOM, Math.min(1200 / MIN_ZOOM, viewBox.width * factor))
      const newHeight = Math.max(700 / MAX_ZOOM, Math.min(700 / MIN_ZOOM, viewBox.height * factor))
      const ratio = newWidth / viewBox.width

      setViewBox({
        x: mouseX - (mouseX - viewBox.x) * ratio,
        y: mouseY - (mouseY - viewBox.y) * ratio,
        width: newWidth,
        height: newHeight,
      })
    },
    [viewBox]
  )

  // ─── Keyboard shortcuts ───
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if ((e.key === "Delete" || e.key === "Backspace") && selectedPieceId) {
        e.preventDefault()
        removePieceWithDownstream(selectedPieceId)
      }
      if (e.key === "Escape") {
        selectPiece(null)
        setActiveEndpoint(null)
        setShowCatalog(false)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      if ((e.ctrlKey || e.metaKey) && ((e.key === "z" && e.shiftKey) || e.key === "y")) {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedPieceId, selectPiece, setActiveEndpoint, setShowCatalog, removePieceWithDownstream, undo, redo])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Loading yard layout...
      </div>
    )
  }

  return (
    <div className="flex h-full" style={{ position: "relative" }}>
      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <svg
          ref={svgRef}
          className="w-full h-full block"
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{ cursor: isPanning ? "grabbing" : "default" }}
        >
          <defs>
            <pattern id="piece-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="0.8" className="fill-muted-foreground/10" />
            </pattern>
          </defs>

          {/* Background */}
          <rect
            x={viewBox.x - 1000}
            y={viewBox.y - 1000}
            width={viewBox.width + 2000}
            height={viewBox.height + 2000}
            className="fill-background"
          />
          <rect
            x={viewBox.x - 1000}
            y={viewBox.y - 1000}
            width={viewBox.width + 2000}
            height={viewBox.height + 2000}
            fill="url(#piece-grid)"
          />

          {/* Placed pieces */}
          {pieces.map((piece) => {
            const def = registry.get(piece.pieceDefId)
            if (!def) return null
            return (
              <PieceRenderer
                key={piece.id}
                piece={piece}
                pieceDef={def}
                isDark={isDark}
                selected={piece.id === selectedPieceId}
              />
            )
          })}

          {/* Open endpoints */}
          {!activeEndpoint &&
            openEndpoints.map((ep) => (
              <EndpointMarker
                key={ep.globalId}
                endpoint={ep}
                isDark={isDark}
                onClick={setActiveEndpoint}
              />
            ))}

          {/* Radial picker */}
          {activeEndpoint && !showCatalog && (
            <RadialPiecePicker
              endpoint={activeEndpoint}
              isDark={isDark}
              onSelect={handlePieceSelect}
              onOpenCatalog={() => setShowCatalog(true)}
              onClose={() => setActiveEndpoint(null)}
            />
          )}
        </svg>

        {/* Status bar */}
        <div
          className="absolute bottom-3 left-3 flex gap-3 text-xs text-muted-foreground bg-card border border-border rounded-lg px-3 py-1.5"
          style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}
        >
          <span><kbd className="px-1 py-0.5 bg-muted border border-border rounded text-[10px] font-mono">Click</kbd> endpoint to build</span>
          <span><kbd className="px-1 py-0.5 bg-muted border border-border rounded text-[10px] font-mono">⌫</kbd> delete</span>
          <span><kbd className="px-1 py-0.5 bg-muted border border-border rounded text-[10px] font-mono">Ctrl+Z</kbd> undo</span>
          <span><kbd className="px-1 py-0.5 bg-muted border border-border rounded text-[10px] font-mono">Scroll</kbd> zoom</span>
        </div>

        {/* Piece catalog overlay */}
        {showCatalog && activeEndpoint && (
          <PieceCatalog
            endpoint={activeEndpoint}
            isDark={isDark}
            onSelect={handlePieceSelect}
            onClose={() => setShowCatalog(false)}
          />
        )}
      </div>

      {/* Properties panel */}
      <YardPieceProperties isDark={isDark} />
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors (may have warnings about `saveYardCanvas` signature — will be fixed in Task 12)

- [ ] **Step 3: Commit**

```bash
git add components/map/yard-piece-editor.tsx
git commit -m "feat(track-editor): add yard piece editor canvas with piece rendering, endpoint clicks, radial picker, pan/zoom"
```

---

## Task 12: Update Server Actions for Piece-Based Elements

**Files:**
- Modify: `app/actions/yard-canvas.ts`

- [ ] **Step 1: Update the saveYardCanvas action schema and handler**

The existing `saveYardCanvas` action accepts `{ canvasId, viewport, trackElements }`. Update it to also accept `locationId` for creating new canvases, and accept the piece-based `trackElements` array (which is already stored as JSON — the shape change is transparent to the DB).

In `app/actions/yard-canvas.ts`, update the `saveYardCanvasSchema` and handler:

```typescript
// Replace the existing saveYardCanvasSchema (around line 113-122) with:
const saveYardCanvasSchema = z.object({
  canvasId: z.string().optional(),
  locationId: z.string().optional(),
  viewport: z.object({
    x: z.number(),
    y: z.number(),
    zoom: z.number(),
  }),
  trackElements: z.unknown(), // PlacedPiece[] — validated as JSON, stored as-is
})
```

Update the `saveYardCanvas` function body to handle the case where `canvasId` is empty (new canvas creation):

```typescript
// Replace the saveYardCanvas function body with:
export async function saveYardCanvas(data: z.infer<typeof saveYardCanvasSchema>) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "Not authenticated" }

  const parsed = saveYardCanvasSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: parsed.error.message }

  const { canvasId, locationId, viewport, trackElements } = parsed.data

  if (canvasId) {
    // Update existing canvas
    await db.locationCanvas.update({
      where: { id: canvasId },
      data: {
        viewport: viewport as object,
        trackElements: trackElements as object,
      },
    })
  } else if (locationId) {
    // Create or upsert canvas for this location
    await db.locationCanvas.upsert({
      where: { locationId },
      create: {
        locationId,
        viewport: viewport as object,
        trackElements: (trackElements as object) ?? [],
      },
      update: {
        viewport: viewport as object,
        trackElements: (trackElements as object) ?? [],
      },
    })
  }

  return { success: true }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/actions/yard-canvas.ts
git commit -m "feat(track-editor): update saveYardCanvas action for piece-based elements with upsert support"
```

---

## Task 13: Wire Up MapEditor to Use New Yard Piece Editor

**Files:**
- Modify: `components/map/map-editor.tsx`

- [ ] **Step 1: Replace YardDetailCanvas with YardPieceEditor in MapEditor**

In `components/map/map-editor.tsx`:

1. Replace the import of `YardDetailCanvas` with `YardPieceEditor`:

```typescript
// Replace:
import { YardDetailCanvas } from "./yard-detail-canvas"
// With:
import { YardPieceEditor } from "./yard-piece-editor"
```

2. Replace the rendering of `YardDetailCanvas` (search for `<YardDetailCanvas`) with:

```tsx
<YardPieceEditor locationId={yardDetailLocationId} />
```

3. Replace the `YardProperties` import and usage. Search for `<YardProperties` and remove it — the properties panel is now built into `YardPieceEditor`. Also remove the import:

```typescript
// Remove this import:
import { YardProperties } from "./yard-properties"
```

Remove the `YardProperties` rendering in the JSX (it was rendered conditionally when `activeTab === "yard-detail"`).

4. Update the toolbar — when `activeTab === "yard-detail"`, the toolbar should only show select and pan tools (the sequential builder replaces draw-track, add-turnout, add-industry). Find the toolbar section that renders tool buttons for yard-detail and simplify:

```tsx
{activeTab === "yard-detail" && (
  <>
    <ToolButton icon="select" tool="select" label="Select (V)" />
    <ToolButton icon="pan" tool="pan" label="Pan (H)" />
  </>
)}
```

- [ ] **Step 2: Verify the app builds**

Run: `npm run build 2>&1 | tail -30`
Expected: Build succeeds (warnings are OK, errors are not)

- [ ] **Step 3: Verify the dev server renders the new editor**

Run: `npm run dev` and navigate to a location's yard detail view.
Expected: The new piece editor canvas renders with a starting piece, pulsing endpoints, and the properties panel on the right.

- [ ] **Step 4: Commit**

```bash
git add components/map/map-editor.tsx
git commit -m "feat(track-editor): wire up YardPieceEditor in MapEditor, replacing YardDetailCanvas"
```

---

## Task 14: Layout Overview Edge Styling Refinement

**Files:**
- Modify: `components/map/track-layout-canvas.tsx`

- [ ] **Step 1: Update edge rendering for clean schematic style**

In `components/map/track-layout-canvas.tsx`, find the edge rendering section (where `localEdges.map(...)` draws polylines/paths). Update the stroke styles to match the schematic aesthetic:

```typescript
// Add this helper function near the top of the file (after imports):
function edgeStyle(trackType: string, isDark: boolean): { strokeWidth: number; strokeDasharray?: string } {
  switch (trackType) {
    case "mainline":
      return { strokeWidth: 4 }
    case "branch":
      return { strokeWidth: 2.5, strokeDasharray: "8,4" }
    case "spur":
      return { strokeWidth: 1.5, strokeDasharray: "4,3" }
    default:
      return { strokeWidth: 3 }
  }
}

function edgeColor(trackType: string, isDark: boolean): string {
  switch (trackType) {
    case "mainline":
      return isDark ? "#c8cdd8" : "#3a3f4b"
    case "branch":
      return isDark ? "#94a3b8" : "#64748b"
    case "spur":
      return isDark ? "#78716c" : "#57534e"
    default:
      return isDark ? "#c8cdd8" : "#3a3f4b"
  }
}
```

Then update the edge `<polyline>` or `<path>` elements to use these styles — add `strokeLinecap="round"` and `strokeLinejoin="round"` for the clean schematic look. Find the existing edge rendering and update the stroke properties.

- [ ] **Step 2: Verify the app builds**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add components/map/track-layout-canvas.tsx
git commit -m "feat(track-editor): refine layout overview edge styling for clean schematic aesthetic"
```

---

## Task 15: Cleanup — Remove Old Freeform Drawing Code

**Files:**
- Delete: `components/map/yard-detail-canvas.tsx` (replaced by `yard-piece-editor.tsx`)
- Delete: `components/map/yard-properties.tsx` (replaced by `yard-piece-properties.tsx`)
- Modify: `components/map/use-yard-store.ts` — can be removed if no other components import it

- [ ] **Step 1: Verify no remaining imports of old components**

Run searches to confirm nothing else imports the old files:

Search for: `import.*yard-detail-canvas`
Search for: `import.*yard-properties`
Search for: `import.*useYardStore`

If `useYardStore` is still referenced anywhere (e.g., in `map-editor.tsx` for `saveStatus`), update those references to use `usePieceStore` instead.

- [ ] **Step 2: Remove old files**

```bash
rm components/map/yard-detail-canvas.tsx
rm components/map/yard-properties.tsx
```

If `use-yard-store.ts` has no remaining imports:

```bash
rm components/map/use-yard-store.ts
```

Also remove `components/map/svg/track-path.tsx` if nothing else uses it (the layout overview may still use it — check first):

Search for: `import.*track-path`

If only `yard-detail-canvas.tsx` (now deleted) imported it:
```bash
rm components/map/svg/track-path.tsx
```

- [ ] **Step 3: Remove old color file if superseded**

Check if `components/map/svg/topo-colors.ts` is still imported anywhere. If not:

```bash
rm components/map/svg/topo-colors.ts
```

- [ ] **Step 4: Verify the app builds clean**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds with no import errors

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(track-editor): remove old freeform drawing components (yard-detail-canvas, yard-properties, use-yard-store)"
```

---

## Task 16: Manual Smoke Test & Polish

- [ ] **Step 1: Start dev server and test the full flow**

Run: `npm run dev`

Test the following:
1. Navigate to a railroad's map page
2. Go to the yard detail tab for a location
3. Verify the canvas loads with a starting piece and pulsing endpoint
4. Click an endpoint — radial picker should appear
5. Select "Straight" — piece should be placed, new endpoint appears
6. Select "Turnout Right" — should create two new endpoints
7. Build out a small yard (3-4 tracks)
8. Click a placed piece — properties panel should show name, type, capacity fields
9. Change the track type — color should update
10. Ctrl+Z — should undo last placement
11. Delete a piece — should remove it and downstream pieces
12. Pan (Alt+drag or middle-click) and zoom (scroll) should work
13. Click "More..." in radial picker — catalog should open
14. Search in catalog — should filter pieces
15. Toggle dark/light mode — colors should switch
16. Refresh page — layout should persist

- [ ] **Step 2: Fix any issues found during testing**

Address any TypeScript errors, rendering glitches, or interaction bugs discovered. Common issues to watch for:
- SVG transform origin issues with rotated pieces
- Endpoint positions not aligning correctly after rotation
- Auto-save not triggering
- Dark mode color transitions

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat(track-editor): polish and bug fixes from smoke testing"
```
