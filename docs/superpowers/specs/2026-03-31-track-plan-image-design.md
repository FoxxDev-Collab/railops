# Track Plan Image Upload + Location Pins

**Date:** 2026-03-31
**Replaces:** Layout map editor (all prior map/canvas specs are superseded)

## Problem

The custom SVG track editor is broken — tracks disappear, curves lose styling, drawing is clunky. Building a track planning tool is the wrong approach. Serious model railroaders already have track plans from dedicated software (XTrackCAD, SCARM, AnyRail) or hand drawings. RailOps should import their existing work, not compete with it.

## Solution

Replace the entire map editor with: **image upload + location pins.**

1. Upload a track plan image (PNG, JPG, WebP)
2. Display it on the layout page
3. Drop pins on the image to mark where Locations are
4. Click a pin to navigate to that Location

No drawing tools. No canvas state. Just an image with markers.

## Removal Scope

Delete entirely:

- `app/(dashboard)/dashboard/railroad/[id]/map/` — map editor route
- `components/map/` — all files (30+ components, stores, SVG renderers)
- Prisma models: `LayoutCanvas`, `CanvasNode`, `CanvasEdge`, `LocationCanvas`
- `Layout.canvas` relation in schema

## Schema Changes

### Remove

```prisma
// DELETE these models entirely
model LayoutCanvas { ... }
model CanvasNode { ... }
model CanvasEdge { ... }
model LocationCanvas { ... }
```

### Modify

```prisma
model Layout {
  // imageUrl already exists — repurpose for track plan image
  imageUrl String?
  // remove: canvas LayoutCanvas?
}

model Location {
  // ADD: normalized pin coordinates (0-1 range, relative to image dimensions)
  pinX Float?
  pinY Float?
}
```

## File Storage

Use Vercel Blob (`@vercel/blob`) — simple, no infrastructure, works with the existing Vercel deployment. One new env var: `BLOB_READ_WRITE_TOKEN`.

## UI

### Layout Form (create/edit)

- Add a drop zone below the existing fields: "Drop your track plan image here"
- Accept PNG, JPG, WebP (max 10MB)
- Shows thumbnail preview after upload
- Replace/remove buttons on existing image

### Layout Detail Page

- Track plan image displayed prominently (full-width, zoomable with scroll)
- Location pins overlaid as small markers with name labels
- Click pin → navigate to Location detail page
- "Edit Pins" button toggles pin editing mode

### Pin Editing Mode

- Click on image → dropdown to select a Location → pin placed at click coordinates
- Existing pins are draggable to reposition
- Click existing pin → option to remove it
- Save triggers server action to update `pinX`/`pinY` on each Location
- Coordinates stored as 0-1 ratio so they work at any display size

## Server Actions

- `uploadTrackPlanImage(layoutId, file)` — upload to Vercel Blob, save URL to `Layout.imageUrl`
- `removeTrackPlanImage(layoutId)` — delete blob, clear `Layout.imageUrl`
- `updateLocationPins(layoutId, pins: {locationId, pinX, pinY}[])` — batch update pin coordinates

## Future (Not In This Spec)

- Operational overlay: show train positions on the track plan during sessions
- PDF track plan support (render first page as image on upload)
- Multiple images per layout (different views/levels)
