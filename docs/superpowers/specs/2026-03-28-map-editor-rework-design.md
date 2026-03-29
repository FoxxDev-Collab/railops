# Map Editor Rework — Design Spec

## Overview

Rework the map page from a single-mode location overview into a three-tab editor with: Location Overview (existing), Track Layout (survey-map style with waypoints), and Yard Detail (full spatial track editor per location).

## Tab System

Top tab bar across the map area with three tabs:

- **Locations** — Existing ReactFlow node/edge overview. No changes to current functionality.
- **Track Layout** — Survey/topo map style canvas for drawing track sections with waypoints between locations.
- **Yard Detail** — Full yard editor for drawing internal track arrangements within a selected location.

**Tab behavior:**
- All three tabs share the same left toolbar (tools adapt per tab) and right properties panel (contextual).
- Locations and Track Layout share the same canvas viewport and data — locations are visible as anchor points in Track Layout, but non-editable.
- Yard Detail is a separate canvas scoped to one location. A dropdown in the tab bar selects which location to view. Defaults to the currently selected location from the other tabs.
- Save status indicator persists across tabs.

## Visual Style: Survey/Topo Map

All three tabs use a consistent USGS survey/cartographic visual language:

**Track rendering:**
- Line with perpendicular crosshatch ticks (classic railroad map symbol)
- Mainline: 2.5px stroke, dark color, ticks every ~20px
- Branch: 1.8px stroke, lighter, ticks every ~25px
- Spur: 1.2px stroke, dashed (6,3), no ticks
- Track colors by type in Yard Detail: Arrival (blue), Classification (amber), Departure (green), Engine Service (purple), RIP (red), Caboose (pink), Lead (dark)

**Locations:**
- Open circles with fill matching the background
- Serif italic labels (Georgia) below
- Location type in monospace below the name
- Size varies by importance (yards larger than sidings)

**Waypoints:**
- Small filled dots, subtle opacity (~0.25) until hovered/selected
- Selected waypoint gets a dashed circle highlight

**Turnouts (Yard Detail):**
- Small circle symbol at the diverge point on the lead
- Horizontal line through center indicating through-route
- Faint line indicating diverging route direction

**Industries (Yard Detail):**
- Rectangular building shapes with rounded corners
- Serif italic name label
- Spot count indicator

**Theme adaptation:**
- Light mode: cream/parchment background (#fafaf5), dark strokes
- Dark mode: inverted — dark background, light strokes, same symbol language
- Uses CSS variables where possible; SVG elements use theme-aware computed colors

## Track Layout Mode

**Purpose:** Draw track sections between locations with intermediate waypoints for realistic routing.

**Canvas:**
- Same ReactFlow canvas as Locations tab, with locations rendered as topo-style open circles (replacing the card-style nodes)
- Track sections rendered as SVG paths with tick marks
- Background has subtle topo contour hints

**Tools (left toolbar):**
- Select (V) — Click track sections or waypoints to select. Drag waypoints to reposition.
- Draw Track (T) — Click a location to start. Click-and-drag on the canvas to place waypoints with real-time curve preview. Click a destination location to finish the section.
- Pan (H) — Standard pan/zoom.
- Zoom controls (+, -, fit)

**Track section properties (right panel):**
- Name/label (editable text input)
- Track type toggle: Mainline / Branch / Spur
- Origin and destination locations (read-only)
- Waypoint count
- Via locations (locations the track passes through)

**Interaction: Drawing a track section:**
1. Select Draw Track tool (T)
2. Click a location node to set the origin — hint text updates
3. Click-and-drag on the canvas to place a waypoint — while dragging, a live curve preview shows from the last point through the drag position
4. Release to commit the waypoint
5. Repeat step 3 for additional waypoints
6. Click a destination location to finish the section
7. Press Escape to cancel mid-draw

**Data model:**
- Uses existing `CanvasEdge` model
- `CanvasEdge.pathData` JSON stores: `{ waypoints: [{ x: number, y: number }...] }`
- `CanvasEdge.trackType` stores "mainline" | "branch" | "spur" (already exists)
- `CanvasEdge.label` stores the section name (already exists)
- No new Prisma models needed

## Yard Detail Mode

**Purpose:** Full spatial editor for drawing individual tracks, turnouts, and industries within a single yard/location.

**Canvas:**
- Separate canvas (not ReactFlow — custom SVG canvas with pan/zoom)
- Scoped to one location at a time, selected via dropdown in the tab bar
- Lead track runs horizontally as the primary through-line
- Tracks branch off the lead via turnouts
- Industries are positioned as building shapes with spur connections

**Tools (left toolbar):**
- Select (V) — Click tracks, turnouts, or industries to select. Drag to reposition.
- Draw Track (T) — Click to start a track segment, drag to shape, click to end. Creates a YardTrack record automatically.
- Add Turnout (F) — Click on an existing track to place a turnout point. This is where other tracks can diverge.
- Add Industry (I) — Click on the canvas to place an industry building. Creates an Industry record. Connect to a track via the Draw Track tool.
- Pan (H) — Standard pan/zoom.
- Zoom controls

**Track properties (right panel) — when a yard track is selected:**
- Track type toggle: ARR / CLS / DEP / ENG / RIP / CAB / LEAD / RUN / SWP
- Name (editable)
- Capacity (number input)
- Length (optional, text input for scale-specific values like `48"`)
- Connected turnout (read-only)
- Cars currently on the track (read-only list from operations data)
- Delete track button

**Industry properties (right panel) — when an industry is selected:**
- Name (editable)
- Spot count (number)
- Connected track
- Delete industry button

**Turnout properties (right panel) — when a turnout is selected:**
- Position on parent track
- Connected tracks (read-only list)
- Delete turnout button

**Data persistence:**
- Uses existing `LocationCanvas` model
- `LocationCanvas.trackElements` JSON stores array of track element objects:
  ```
  {
    id: string,              // client-generated CUID (via createId())
    type: "track" | "turnout" | "industry",
    // For tracks:
    yardTrackId?: string,    // links to YardTrack record
    points: [{x, y}...],     // path points
    trackType?: YardTrackType,
    // For turnouts:
    parentTrackId?: string,  // which track element it sits on
    position: {x, y},
    // For industries:
    industryId?: string,     // links to Industry record
    position: {x, y},
    width?: number,
    height?: number,
    connectedTrackId?: string
  }
  ```
- `LocationCanvas.carSlots` JSON stores car placement positions (for future operations visualization)

**Auto-creation of records:**
- Drawing a track in Yard Detail automatically creates a `YardTrack` record (with default name, type, and capacity — editable in properties panel)
- Placing an industry automatically creates an `Industry` record (with default name — editable in properties panel)
- Deleting a track element deletes the corresponding `YardTrack` or `Industry` record
- This makes the Yard Detail editor the single source of truth for yard structure

## Server Actions

**New actions needed:**

`app/actions/yard-canvas.ts`:
- `getYardCanvasData(locationId)` — Fetch or create LocationCanvas with linked YardTrack and Industry data
- `saveYardCanvas(locationCanvasId, trackElements, carSlots?)` — Save the full yard canvas state (debounced auto-save like the main canvas)
- `createYardTrackElement(locationId, trackElement)` — Create a YardTrack record + add element to canvas JSON
- `createIndustryElement(locationId, industryElement)` — Create an Industry record + add element to canvas JSON
- `updateYardElement(locationCanvasId, elementId, updates)` — Update element position/properties + sync to YardTrack/Industry record
- `deleteYardElement(locationCanvasId, elementId)` — Delete element + cascade delete YardTrack/Industry record
- `createTurnoutElement(locationCanvasId, turnoutElement)` — Add turnout to canvas (no separate DB record, purely visual)

**Modified actions:**

`app/actions/canvas.ts`:
- `createCanvasEdge` — Accept optional `pathData` with waypoints
- `updateCanvasEdge` — New action to update edge pathData/trackType/label

## Components

**New components:**

- `components/map/map-tab-bar.tsx` — Top tab bar with Locations / Track Layout / Yard Detail tabs, plus location selector for Yard Detail mode
- `components/map/track-layout-canvas.tsx` — SVG-based track layout renderer overlaying the ReactFlow canvas. Renders track sections with topo-style tick marks, location circles, and waypoints.
- `components/map/track-section-renderer.tsx` — SVG component that renders a single track section with tick marks along its path
- `components/map/yard-detail-canvas.tsx` — Custom SVG canvas with pan/zoom for yard detail editing. Renders tracks, turnouts, and industries.
- `components/map/yard-track-renderer.tsx` — SVG component for rendering a single yard track with type-specific color and ticks
- `components/map/yard-turnout.tsx` — SVG component for turnout symbol
- `components/map/yard-industry.tsx` — SVG component for industry building shape
- `components/map/yard-toolbar.tsx` — Toolbar variant with yard-specific tools (or extend existing MapToolbar)
- `components/map/yard-properties.tsx` — Properties panel variant for yard elements (or extend existing MapProperties)
- `components/map/use-yard-store.ts` — Zustand store for yard detail editor state (selected element, tool, drawing state)

**Modified components:**

- `components/map/map-editor.tsx` — Add tab state, render tab bar, switch between canvas modes
- `components/map/map-toolbar.tsx` — Adapt tools based on active tab
- `components/map/map-properties.tsx` — Adapt properties based on active tab
- `components/map/location-node.tsx` — Add topo-style rendering variant for Track Layout mode (open circle instead of card)
- `components/map/track-edge.tsx` — Add topo-style rendering with tick marks for Track Layout mode

## Data Flow

**Track Layout mode:**
1. Page loads → `getCanvasData()` returns nodes + edges with `pathData`
2. ReactFlow renders location nodes as open circles
3. Track sections rendered as SVG overlay with tick marks, using edge `pathData.waypoints`
4. User draws new track → waypoints collected via click-and-drag → `createCanvasEdge()` with pathData
5. User drags waypoint → `updateCanvasEdge()` with new pathData → debounced auto-save
6. Properties panel shows selected edge info, editable fields save via `updateCanvasEdge()`

**Yard Detail mode:**
1. User selects Yard Detail tab + picks a location
2. `getYardCanvasData(locationId)` returns LocationCanvas with trackElements
3. Custom SVG canvas renders all elements
4. User draws track → creates element visually → `createYardTrackElement()` creates YardTrack + saves element
5. User places industry → creates element visually → `createIndustryElement()` creates Industry + saves element
6. User edits properties → `updateYardElement()` syncs to DB records
7. Auto-save debounces position/layout changes

## Out of Scope

- Car placement visualization on yard tracks (future: use `carSlots` field)
- Signal placement
- Track grades/elevation
- Geographic/satellite background imagery
- Undo/redo for yard detail (use existing undo system for track layout)
- Multi-user collaborative editing
