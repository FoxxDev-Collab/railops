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
  bumper, turntable, roundhouseStall, engineHouse1, engineHouse2, coalingTower, waterColumn, ashPit,
]
