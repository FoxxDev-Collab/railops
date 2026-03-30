import type { PieceDefinition } from "./piece-types"

const SEG = 60
const DIVERGE_DY = 25

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
  turnoutRight, turnoutLeft, wye, threeWay,
  curvedTurnoutRight, curvedTurnoutLeft, doubleSlip, singleSlip,
]
