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

const PIECE_MAP = new Map<string, PieceDefinition>()
for (const piece of ALL_PIECES) {
  PIECE_MAP.set(piece.id, piece)
}

export function getPieceDef(id: string): PieceDefinition | undefined {
  return PIECE_MAP.get(id)
}

export function getPieceRegistry(): Map<string, PieceDefinition> {
  return PIECE_MAP
}

export function getPiecesByCategory(category: PieceCategory): PieceDefinition[] {
  return ALL_PIECES.filter((p) => p.category === category)
}

export function getAllCategories(): { category: PieceCategory; label: string; pieces: PieceDefinition[] }[] {
  return [
    { category: "basic", label: "Basic Track", pieces: getPiecesByCategory("basic") },
    { category: "turnout", label: "Turnouts & Switches", pieces: getPiecesByCategory("turnout") },
    { category: "crossing", label: "Crossings", pieces: getPiecesByCategory("crossing") },
    { category: "terminal", label: "Terminals & Facilities", pieces: getPiecesByCategory("terminal") },
    { category: "specialty", label: "Specialty", pieces: getPiecesByCategory("specialty") },
  ]
}

export const RADIAL_DEFAULTS: string[] = [
  "straight",
  "curve-left-45",
  "curve-right-45",
  "turnout-right",
  "turnout-left",
  "bumper",
]

export function getRadialDefaults(): PieceDefinition[] {
  return RADIAL_DEFAULTS.map((id) => PIECE_MAP.get(id)).filter(Boolean) as PieceDefinition[]
}
