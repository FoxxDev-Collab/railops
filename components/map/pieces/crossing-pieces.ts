import type { PieceDefinition } from "./piece-types"

const SEG = 60
const CROSS_DY = 25

export const crossing90: PieceDefinition = {
  id: "crossing-90",
  name: "90° Crossing",
  category: "crossing",
  description: "Tracks cross at right angles",
  width: SEG,
  height: SEG,
  endpoints: [
    { id: "in-h", offsetX: 0, offsetY: 30, direction: 180, role: "in" },
    { id: "out-h", offsetX: SEG, offsetY: 30, direction: 0, role: "out" },
    { id: "in-v", offsetX: 30, offsetY: 0, direction: 270, role: "in" },
    { id: "out-v", offsetX: 30, offsetY: SEG, direction: 90, role: "out" },
  ],
  svgPath: `M 0,30 L 60,30 M 30,0 L 30,60`,
  svgExtra: `<rect x="26" y="26" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1" opacity="0.4"/>`,
}

export const diamond45: PieceDefinition = {
  id: "diamond-45",
  name: "45° Diamond",
  category: "crossing",
  description: "Tracks cross at 45°",
  width: SEG,
  height: CROSS_DY + 20,
  endpoints: [
    { id: "in-a", offsetX: 0, offsetY: 10, direction: 180, role: "in" },
    { id: "out-a", offsetX: SEG, offsetY: 10, direction: 0, role: "out" },
    { id: "in-b", offsetX: 0, offsetY: CROSS_DY + 10, direction: 180, role: "in" },
    { id: "out-b", offsetX: SEG, offsetY: CROSS_DY + 10, direction: 0, role: "out" },
  ],
  svgPath: `M 0,10 L 60,10 M 0,${CROSS_DY + 10} L 60,${CROSS_DY + 10}`,
  svgExtra: `<path d="M 20,10 L 40,${CROSS_DY + 10}" stroke="currentColor" stroke-width="1" opacity="0.4"/><path d="M 40,10 L 20,${CROSS_DY + 10}" stroke="currentColor" stroke-width="1" opacity="0.4"/>`,
}

export const doubleCrossover: PieceDefinition = {
  id: "double-crossover",
  name: "Double Crossover",
  category: "crossing",
  description: "Connects two parallel tracks both directions",
  width: SEG + 20,
  height: CROSS_DY + 20,
  endpoints: [
    { id: "in-a", offsetX: 0, offsetY: 10, direction: 180, role: "in" },
    { id: "out-a", offsetX: SEG + 20, offsetY: 10, direction: 0, role: "out" },
    { id: "in-b", offsetX: 0, offsetY: CROSS_DY + 10, direction: 180, role: "in" },
    { id: "out-b", offsetX: SEG + 20, offsetY: CROSS_DY + 10, direction: 0, role: "out" },
  ],
  svgPath: `M 0,10 L 80,10 M 0,${CROSS_DY + 10} L 80,${CROSS_DY + 10}`,
  svgExtra: `<path d="M 20,10 L 60,${CROSS_DY + 10}" stroke="currentColor" stroke-width="inherit" fill="none" opacity="0.6"/><path d="M 20,${CROSS_DY + 10} L 60,10" stroke="currentColor" stroke-width="inherit" fill="none" opacity="0.6"/><circle cx="25" cy="12" r="3" class="turnout-dot"/><circle cx="55" cy="${CROSS_DY + 8}" r="3" class="turnout-dot"/>`,
}

export const singleCrossover: PieceDefinition = {
  id: "single-crossover",
  name: "Single Crossover",
  category: "crossing",
  description: "Connects two parallel tracks one direction",
  width: SEG + 20,
  height: CROSS_DY + 20,
  endpoints: [
    { id: "in-a", offsetX: 0, offsetY: 10, direction: 180, role: "in" },
    { id: "out-a", offsetX: SEG + 20, offsetY: 10, direction: 0, role: "out" },
    { id: "in-b", offsetX: 0, offsetY: CROSS_DY + 10, direction: 180, role: "in" },
    { id: "out-b", offsetX: SEG + 20, offsetY: CROSS_DY + 10, direction: 0, role: "out" },
  ],
  svgPath: `M 0,10 L 80,10 M 0,${CROSS_DY + 10} L 80,${CROSS_DY + 10}`,
  svgExtra: `<path d="M 25,10 L 55,${CROSS_DY + 10}" stroke="currentColor" stroke-width="inherit" fill="none" opacity="0.6"/><circle cx="25" cy="10" r="3" class="turnout-dot"/>`,
}

export const scissorsCrossover: PieceDefinition = {
  id: "scissors-crossover",
  name: "Scissors Crossover",
  category: "crossing",
  description: "Compact double crossover",
  width: SEG,
  height: CROSS_DY + 20,
  endpoints: [
    { id: "in-a", offsetX: 0, offsetY: 10, direction: 180, role: "in" },
    { id: "out-a", offsetX: SEG, offsetY: 10, direction: 0, role: "out" },
    { id: "in-b", offsetX: 0, offsetY: CROSS_DY + 10, direction: 180, role: "in" },
    { id: "out-b", offsetX: SEG, offsetY: CROSS_DY + 10, direction: 0, role: "out" },
  ],
  svgPath: `M 0,10 L 60,10 M 0,${CROSS_DY + 10} L 60,${CROSS_DY + 10}`,
  svgExtra: `<path d="M 10,10 L 50,${CROSS_DY + 10}" stroke="currentColor" stroke-width="inherit" fill="none" opacity="0.6"/><path d="M 10,${CROSS_DY + 10} L 50,10" stroke="currentColor" stroke-width="inherit" fill="none" opacity="0.6"/><circle cx="30" cy="${(CROSS_DY + 20) / 2}" r="3" class="turnout-dot"/><circle cx="15" cy="11" r="2.5" class="turnout-dot"/><circle cx="45" cy="${CROSS_DY + 9}" r="2.5" class="turnout-dot"/>`,
}

export const CROSSING_PIECES: PieceDefinition[] = [
  crossing90, diamond45, doubleCrossover, singleCrossover, scissorsCrossover,
]
