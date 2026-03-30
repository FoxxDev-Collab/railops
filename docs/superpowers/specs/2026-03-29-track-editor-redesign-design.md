# Track Editor Redesign — Snap-Together Piece System

**Date:** 2026-03-29
**Status:** Approved

## Problem

The current yard detail editor uses freeform point-and-click track drawing with Bézier curves. The interaction is unreliable (click/drag doesn't work consistently), curves look poor, and the output doesn't feel professional. Users need a tool that produces clean, schematic-quality yard layouts for planning and documentation.

## Solution

Replace the freeform drawing system with a **sequential snap-together piece builder**. Users click open endpoints to extend track, choosing from a radial piece picker. The system renders a clean transit-map-style schematic with color-coded track types, pill-shaped capacity badges, and proper dark/light theme support.

## Two-Level System

### Level 1: Layout Overview (existing, refined)
- ReactFlow canvas with location nodes connected by styled edges
- **Mainline** = thick solid line, **Branch** = medium dashed, **Spur** = thin dotted
- Click a location to drill into its yard detail
- Minimal changes needed — refine edge styling to match the clean schematic aesthetic and ensure dark/light theme consistency

### Level 2: Yard Detail Editor (new)
- SVG-based canvas replacing the current freeform drawing system
- Sequential builder: click endpoint → pick piece → piece placed → new endpoints appear
- Properties panel on right for editing selected piece (name, type, capacity)
- Clean schematic rendering with the app's theme tokens

## Interaction Model

### Sequential Builder Flow
1. Canvas shows a starting endpoint (yard's mainline connection)
2. User clicks a glowing open endpoint
3. Radial piece picker appears around the clicked endpoint
4. User selects a piece type (straight, curve, turnout, etc.)
5. Piece is placed and rendered, creating new open endpoint(s)
6. Turnouts create two endpoints (through + diverging)
7. Repeat from any open endpoint

### Core Interactions
- **Click open endpoint** → radial piece picker appears
- **Click placed piece** → select it, show properties in right panel
- **Delete/Backspace** → remove selected piece and everything downstream (with confirmation if downstream pieces exist)
- **Undo/Redo** → Ctrl+Z / Ctrl+Shift+Z
- **Pan** → scroll or middle-click drag
- **Zoom** → mouse wheel
- **Escape** → dismiss picker / deselect

### Radial Piece Picker
- Appears centered on the clicked endpoint
- Shows 6-7 most common pieces in a ring
- "More..." option opens full piece catalog (categorized)
- Pieces are context-aware: only show pieces valid for the current endpoint direction
- Each piece shows a small SVG icon + label
- Hover shows tooltip with description

## Piece Library

### Basic Track
| Piece | Description | Endpoints |
|-------|-------------|-----------|
| Straight | Horizontal track segment | 1 in, 1 out |
| Straight (long) | Double-length straight | 1 in, 1 out |
| Curve Left (45°) | Left arc segment | 1 in, 1 out |
| Curve Right (45°) | Right arc segment | 1 in, 1 out |
| Curve Left (broad) | Gentle left arc | 1 in, 1 out |
| Curve Right (broad) | Gentle right arc | 1 in, 1 out |
| Half-curve Left (22.5°) | Slight left | 1 in, 1 out |
| Half-curve Right (22.5°) | Slight right | 1 in, 1 out |

### Turnouts & Switches
| Piece | Description | Endpoints |
|-------|-------------|-----------|
| Turnout Left | Splits track, diverging left | 1 in, 2 out |
| Turnout Right | Splits track, diverging right | 1 in, 2 out |
| Wye | Y-shaped three-way split | 1 in, 2 out (both diverge) |
| Three-way turnout | Three routes from one point | 1 in, 3 out |
| Curved turnout Left | Turnout on a curve | 1 in, 2 out |
| Curved turnout Right | Turnout on a curve | 1 in, 2 out |
| Double-slip switch | Two routes crossing with switching | 2 in, 2 out |
| Single-slip switch | Crossing with one switch option | 2 in, 2 out |

### Crossings & Connections
| Piece | Description | Endpoints |
|-------|-------------|-----------|
| 90° crossing | Tracks cross at right angles | 2 in, 2 out |
| 45° diamond | Tracks cross at 45° | 2 in, 2 out |
| Double crossover | Connects two parallel tracks both ways | 2 in, 2 out |
| Single crossover | Connects two parallel tracks one way | 2 in, 2 out |
| Scissors crossover | Double crossover, compact | 2 in, 2 out |

### Terminals & Facilities
| Piece | Description | Endpoints |
|-------|-------------|-----------|
| Bumper / end stop | Dead-end terminator | 1 in, 0 out |
| Turntable | Rotating bridge, connects to stalls | 1 in, N out (configurable) |
| Roundhouse stall | Attaches to turntable | 1 in (from turntable), 0 out |
| Engine house (1-track) | Small engine facility | 1 in, 0 out |
| Engine house (2-track) | Larger engine facility | 2 in, 0 out |
| Coaling tower | Fuel facility marker | 0 (placed adjacent to track) |
| Water column | Water facility marker | 0 (placed adjacent to track) |
| Ash pit | Maintenance facility marker | 1 in, 1 out (inline) |

### Specialty
| Piece | Description | Endpoints |
|-------|-------------|-----------|
| Bridge section | Visual bridge marker | 1 in, 1 out |
| Tunnel portal | Visual tunnel entry | 1 in, 1 out |
| Grade crossing | Road crosses track | 1 in, 1 out |
| Signal marker | Signal placement | 0 (placed adjacent to track) |
| Switch stand | Manual switch indicator | 0 (placed at turnout) |

## Visual Design

### Clean Schematic Style (Transit Map)
- Bold rounded lines with `stroke-linecap: round`
- Color-coded by track type (see below)
- Pill-shaped capacity badges on tracks
- Track labels displayed inline
- Turnout indicators: colored circle at switch point
- Bumpers: filled circle at end of track
- Facilities (turntable, roundhouse): stylized SVG shapes

### Track Type Color System
Uses CSS custom properties, with light and dark theme variants:

| Type | Purpose | Dark Mode | Light Mode |
|------|---------|-----------|------------|
| Lead / Main | Primary movement | `#c8cdd8` | `#3a3f4b` |
| Arrival | Inbound trains | `#34d399` | `#059669` |
| Classification | Sorting | `#4a9eff` | `#2563eb` |
| Departure | Outbound trains | `#f59e0b` | `#d97706` |
| Engine Service | Locomotive facilities | `#a78bfa` | `#7c3aed` |
| RIP / Bad Order | Repair track | `#f87171` | `#dc2626` |
| Caboose | Caboose storage | `#fb923c` | `#ea580c` |
| Runaround | Runaround track | `#94a3b8` | `#64748b` |
| Switcher Pocket | Switcher storage | `#78716c` | `#57534e` |

### Theme Integration
- All colors defined as CSS custom properties in the app's theme system
- Surfaces, borders, text colors inherit from the existing shadcn/ui theme tokens
- Canvas background uses the app's background color
- Properties panel matches the existing sidebar styling

### Open Endpoints
- Pulsing blue glow animation to indicate clickable build points
- Radial gradient glow effect
- Animate between 0.5 and 0.9 opacity on a 2s cycle

## Data Model

### Piece Element (client state, stored in LocationCanvas.trackElements JSON)

```typescript
type PieceElement = {
  id: string
  pieceType: string           // "straight" | "curve-left-45" | "turnout-right" | "bumper" | "turntable" | etc.
  position: { x: number; y: number }
  rotation: number            // degrees, determines direction
  parentEndpointId: string    // which endpoint this piece was placed from
  endpoints: Endpoint[]       // this piece's output endpoints
  trackType?: YardTrackType   // ARRIVAL, CLASSIFICATION, etc.
  yardTrackId?: string        // links to YardTrack DB record (for tracks with capacity)
  name?: string
  capacity?: number
  metadata?: Record<string, unknown>  // piece-specific data (e.g., turntable stall count)
}

type Endpoint = {
  id: string
  position: { x: number; y: number }
  direction: number           // angle in degrees, determines valid next pieces
  connectedPieceId?: string   // if another piece is connected here
}
```

### Piece Definitions (static registry)

```typescript
type PieceDefinition = {
  id: string                  // "straight", "curve-left-45", etc.
  name: string                // "Straight Track"
  category: "basic" | "turnout" | "crossing" | "terminal" | "specialty"
  icon: React.ComponentType   // SVG icon for picker
  description: string
  inEndpoints: number         // how many input connections
  outEndpoints: EndpointDef[] // output endpoint positions relative to piece
  render: (props) => SVGElement  // how to draw this piece on canvas
  width: number               // bounding box for layout
  height: number
}

type EndpointDef = {
  offsetX: number
  offsetY: number
  direction: number           // exit angle
}
```

### Database
No schema changes needed. The existing `LocationCanvas.trackElements` JSON column stores the piece array. `YardTrack` records are created/linked when a track segment is assigned a type and capacity.

## UI Components

### New Components
- `YardPieceEditor` — main canvas component (replaces `YardDetailCanvas`)
- `RadialPiecePicker` — the endpoint piece selector
- `PieceCatalog` — full categorized piece browser (opened from "More...")
- `PieceRenderer` — SVG renderer for each piece type
- `EndpointMarker` — the pulsing open endpoint indicator
- `YardPieceProperties` — right panel for editing selected piece

### Modified Components
- `MapEditor` — update to use new `YardPieceEditor` instead of `YardDetailCanvas`
- `TrackLayoutCanvas` — update edge styling for clean schematic look
- Theme tokens — add track type color variables

### Removed Components
- `YardDetailCanvas` — replaced entirely by `YardPieceEditor`
- Freeform drawing tools (draw-track, add-turnout from toolbar)

## Layout Overview Refinements

- Style edges as clean lines matching the schematic aesthetic
- Mainline: thick solid, Branch: medium dashed, Spur: thin dotted
- Use the track color system for edge colors
- Ensure dark/light theme support on the ReactFlow canvas

## Key Constraints

- **No external 2D asset libraries** — all pieces rendered as SVG paths, keeping the bundle lean and the style consistent
- **All SVG, no Canvas API** — SVG is easier to theme, style, and make accessible
- **Pieces are pure geometry** — each piece definition is a set of SVG path commands + endpoint positions, making the library easy to extend
- **Theme-first** — every color comes from CSS custom properties, dark/light mode is automatic
- **Progressive disclosure** — radial picker shows common pieces, full catalog available via "More..."
- **Undo/redo from day one** — piece placement is a discrete action, making undo trivial compared to freeform drawing
