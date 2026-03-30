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
