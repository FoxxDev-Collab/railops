# Layout Map Editor — Design Spec

## Overview

A visual layout editor for RailOps that lets users build schematic railroad maps, drill into location-level track diagrams, and use the map as an interactive dispatcher console during operating sessions.

**Visual style:** Schematic/diagram (topology-focused, not CAD).
**Interaction model:** Point-to-point — place locations, draw track connections between them.
**Rendering:** React Flow for the railroad overview, Konva (react-konva) for location detail track diagrams.
**Session sync:** Polling — crew devices refresh every 5-10 seconds via a lightweight API route.

## Architecture

Three layers built on the same canvas infrastructure:

### Layer 1: Railroad Overview Editor

React Flow canvas at `/dashboard/map`. Users place location nodes and draw track edges between them.

- **Location nodes** — Custom React Flow node types per LocationType (YARD, PASSENGER_STATION, INTERCHANGE, JUNCTION, STAGING, TEAM_TRACK, SIDING). Each has a distinct color and icon. Nodes display name, type, and summary stats (track count, industry count).
- **Track edges** — Bezier curves connecting two location nodes. Three visual styles: mainline (solid, thick), branch (dashed), spur (thin). Optional label (subdivision name). Editable control points for curve shaping.
- **Toolbar** — Left-side vertical toolbar: Select (V), Add Location (L), Draw Track (T), Pan/Hand (H). Zoom controls at bottom (+/-).
- **Properties panel** — Right-side panel showing details of selected node or edge. For nodes: type, tracks, industries, connections, "View Detail" and "Edit Location" actions. For edges: track type, label, style.
- **Minimap** — React Flow built-in minimap in bottom-right corner.
- **Auto-save** — Debounced 1 second after last change. "Saved"/"Saving..." indicator top-right.

### Layer 2: Location Detail View

Konva canvas that replaces the overview when drilling into a location. Accessed by double-clicking a node or clicking "View Detail" in properties.

- **Yard track diagrams** — Horizontal parallel lines representing tracks (arrival, classification, departure, engine service, RIP, etc.). Track type labels. Capacity indicators.
- **Industry spurs and sidings** — Branching lines from the main tracks to industries. Industry labels.
- **Car positions** — Small rectangles on tracks representing freight cars, locomotives, etc. Colored by type. Tooltip shows reporting marks and load status.
- **Turnout indicators** — Visual markers where tracks diverge.
- **Navigation** — Breadcrumb: "Railroad Overview > [Location Name]". Animated zoom transition in/out. Back button returns to overview.

### Layer 3: Session Display

Overlay mode on the same canvases, active when an OperatingSession is running.

- **Train markers** — Colored circles/icons on the map at each train's current location. Animate along track edges when advancing.
- **Session banner** — Red top bar: "● LIVE SESSION — [Session Name]". Shows active train count, crew online count, poll interval.
- **Dispatcher interactions** — Click train marker for context menu: "Advance to next stop", "Hold", "Set off cars". Actions trigger server actions updating SessionTrain and SwitchList state.
- **Crew view** — Same map, read-only. Crew members can tap their assigned train to see their switch list. No editing capability.
- **Fullscreen mode** — Hides sidebar and properties panel. Canvas fills screen.

## Data Model

Four new Prisma models for canvas/visual state:

### LayoutCanvas

One-to-one with Layout. Stores viewport state and grid configuration.

```prisma
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
```

### CanvasNode

One-to-one with Location. Stores the visual position of a location on the overview canvas.

```prisma
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
```

### CanvasEdge

Track connection between two CanvasNodes. Purely visual — no domain model equivalent.

```prisma
model CanvasEdge {
  id           String       @id @default(cuid())
  canvasId     String
  canvas       LayoutCanvas @relation(fields: [canvasId], references: [id], onDelete: Cascade)
  sourceNodeId String
  sourceNode   CanvasNode   @relation("EdgeSource", fields: [sourceNodeId], references: [id], onDelete: Cascade)
  targetNodeId String
  targetNode   CanvasNode   @relation("EdgeTarget", fields: [targetNodeId], references: [id], onDelete: Cascade)
  pathData     Json         @default("{}") // Bezier control points
  trackType    String       @default("mainline") // mainline, branch, spur
  label        String?
  style        Json         @default("{}")

  @@index([canvasId])
}
```

### LocationCanvas

One-to-one with Location. Stores Konva-serialized track geometry for the detail view.

```prisma
model LocationCanvas {
  id            String   @id @default(cuid())
  locationId    String   @unique
  location      Location @relation(fields: [locationId], references: [id], onDelete: Cascade)
  viewport      Json     @default("{\"x\":0,\"y\":0,\"zoom\":1}")
  trackElements Json     @default("[]") // Konva serialized geometry
  carSlots      Json     @default("[]") // Positions where cars render
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### Relationships to existing models

- `Layout` gets a `canvas LayoutCanvas?` relation
- `Location` gets `canvasNode CanvasNode?` and `locationCanvas LocationCanvas?` relations
- All new models cascade-delete from their parent

## UI & Navigation

### Route structure

- `/dashboard/map` — Main layout editor (new sidebar item: "Map")
- `/dashboard/map?session=active` — Session display mode (same page, overlay when session is active)
- `/dashboard/map?view=overview` — Force overview for multi-screen
- `/dashboard/map?view=detail&location=[id]` — Force detail view for multi-screen
- Location detail views open inline via canvas zoom transition (no separate route)

### Sidebar integration

Add "Map" item to the railroad context menu in `app-sidebar.tsx`, positioned after "Operations Center" as the second item.

### Editor panels

- **Left toolbar:** 56px wide. Tool icons with keyboard shortcut tooltips.
- **Center canvas:** Fills remaining space. Dot grid background. Dark theme (#0a0f1a background).
- **Right properties panel:** 260px wide. Contextual based on selection.

## Interactions

### Track drawing

1. Select "Draw Track" tool (or press T)
2. Click source location node (highlights with glow)
3. Click target location node (edge created with auto-routed bezier)
4. Edge appears in properties panel for type/style editing

### Snapping

- **Grid snap:** Locations snap to configurable grid (default 20px) when dragged
- **Magnetic snap:** When drawing a track, cursor magnetizes to location connection ports within 30px. Visual glow indicates snap engagement.
- **Connection ports:** Each location node has ports on all 4 sides (top, right, bottom, left). Tracks connect to nearest available port.

### Adding a location from the editor

1. Select "Add Location" tool (or press L)
2. Click canvas to place
3. Inline form appears in properties panel: name, type, code (required fields)
4. Submit creates both the Location record and the CanvasNode
5. Full location details editable via existing location pages

### Zoom into location detail

1. Double-click location node OR click "View Detail" in properties
2. Canvas animates zoom transition into location
3. Switches rendering from React Flow to Konva
4. Breadcrumb: "Railroad Overview > [Location Name]"
5. Back button or breadcrumb click reverses animation to overview

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| V | Select tool |
| L | Add Location tool |
| T | Draw Track tool |
| H | Pan/Hand tool |
| Delete/Backspace | Delete selected |
| Ctrl+Z | Undo (canvas operations only: move, add, delete nodes/edges) |
| Ctrl+Y | Redo (canvas operations only) |
| Ctrl+0 | Fit viewport to content |
| + / - | Zoom in/out |

### Auto-save

- Debounce: 1 second after last change
- Saves: node positions, edge paths, viewport state, location canvas geometry
- Server action: `saveCanvasState(canvasId, { nodes, edges, viewport })`
- Indicator: top-right "✓ Saved" / "Saving..."

## Session Display

### Dispatcher flow

1. Start OperatingSession from existing sessions UI
2. Navigate to `/dashboard/map` — detects active session, enters session mode
3. Map overlays train markers at current locations from SessionTrain records
4. Red "LIVE SESSION" banner appears at top
5. Dispatcher clicks trains to issue orders (advance, hold, set off cars)
6. Server actions update SessionTrain and SwitchList records
7. Train markers animate to new positions

### Crew polling

- API route: `GET /api/session/[id]/state`
- Poll interval: 5 seconds (configurable)
- Payload: train positions, active switch lists, recent actions
- Response shape:

```json
{
  "timestamp": 1706000000,
  "trains": [
    { "id": "...", "locationId": "...", "status": "EN_ROUTE", "nextStopId": "..." }
  ],
  "switchLists": [
    { "id": "...", "trainId": "...", "entries": [] }
  ],
  "recentActions": [
    { "type": "TRAIN_DEPARTED", "trainId": "...", "from": "...", "at": 1706000000 }
  ]
}
```

### Crew member capabilities

- View the live map (read-only)
- Tap their assigned train to see their personal switch list
- No editing, no dispatching

### Dispatcher authorization

- Only the session owner or crew members with a dispatcher-capable role can interact
- Existing crew role permissions system determines dispatcher access
- Server actions validate role before applying changes

### Multi-screen support

- `/dashboard/map?view=overview` — Overview on screen 1
- `/dashboard/map?view=detail&location=[id]` — Yard detail on screen 2
- Both views poll the same session state independently
- "Fullscreen" button hides sidebar and properties panel for dedicated display screens

### Conflict handling

- Server actions validate current state before applying dispatcher commands
- If state has changed since the dispatcher's last render, the action either rejects with a message or applies if still valid
- No optimistic updates for session actions — wait for server confirmation

## Dependencies

### New packages

- `reactflow` — Overview canvas (nodes, edges, minimap, controls)
- `react-konva` + `konva` — Location detail canvas

### Existing infrastructure used

- Prisma (new models, schema push)
- Server Actions (canvas CRUD, session state mutations)
- NextAuth (role-based access for dispatcher vs crew)
- Crew system (role permissions)
- OperatingSession / SessionTrain models (session display)

## Decomposition

This is a large feature. Implementation phases:

1. **Phase 1: Canvas foundation** — Prisma models, LayoutCanvas CRUD, React Flow setup, location nodes with drag/snap, basic track edges
2. **Phase 2: Editor polish** — Properties panel, toolbar, keyboard shortcuts, auto-save, add-location-from-editor flow, undo/redo
3. **Phase 3: Location detail views** — Konva setup, yard track diagrams, zoom transition, breadcrumb navigation, car position rendering
4. **Phase 4: Session display** — Session detection, train markers, dispatcher interactions, crew polling endpoint, live session banner, fullscreen mode, multi-screen query params
