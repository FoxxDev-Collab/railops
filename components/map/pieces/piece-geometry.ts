import type { Point, EndpointDef, PlacedPiece, ResolvedEndpoint, PieceDefinition } from "./piece-types"

const DEG_TO_RAD = Math.PI / 180

export function rotatePoint(p: Point, degrees: number): Point {
  const rad = degrees * DEG_TO_RAD
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return {
    x: p.x * cos - p.y * sin,
    y: p.x * sin + p.y * cos,
  }
}

export function normalizeAngle(degrees: number): number {
  return ((degrees % 360) + 360) % 360
}

export function resolveEndpoint(
  piece: PlacedPiece,
  def: EndpointDef,
  pieceDef: PieceDefinition
): ResolvedEndpoint {
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

export function resolveAllEndpoints(
  piece: PlacedPiece,
  pieceDef: PieceDefinition
): ResolvedEndpoint[] {
  return pieceDef.endpoints.map((def) => resolveEndpoint(piece, def, pieceDef))
}

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

export function calculatePlacement(
  openEndpoint: ResolvedEndpoint,
  newPieceDef: PieceDefinition,
  inputEndpointId?: string
): { position: Point; rotation: number } {
  const inputDef = inputEndpointId
    ? newPieceDef.endpoints.find((e) => e.id === inputEndpointId)
    : newPieceDef.endpoints.find((e) => e.role === "in")

  if (!inputDef) {
    return { position: openEndpoint.position, rotation: 0 }
  }

  const desiredInputDirection = normalizeAngle(openEndpoint.direction + 180)
  const rotation = normalizeAngle(desiredInputDirection - inputDef.direction)

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

export function pieceTransform(piece: PlacedPiece, pieceDef: PieceDefinition): string {
  const cx = piece.position.x + pieceDef.width / 2
  const cy = piece.position.y + pieceDef.height / 2
  if (piece.rotation === 0) {
    return `translate(${piece.position.x}, ${piece.position.y})`
  }
  return `translate(${piece.position.x}, ${piece.position.y}) rotate(${piece.rotation}, ${pieceDef.width / 2}, ${pieceDef.height / 2})`
}

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
