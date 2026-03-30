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
  bridge, tunnel, gradeCrossing, signal, switchStand,
]
