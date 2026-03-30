import type { PieceDefinition } from "./piece-types"

const SEG = 60
const HALF_SEG = 30

export const straight: PieceDefinition = {
  id: "straight",
  name: "Straight",
  category: "basic",
  description: "Standard straight track segment",
  width: SEG,
  height: 20,
  endpoints: [
    { id: "in", offsetX: 0, offsetY: 10, direction: 180, role: "in" },
    { id: "out", offsetX: SEG, offsetY: 10, direction: 0, role: "out" },
  ],
  svgPath: "M 0,10 L 60,10",
}

export const straightLong: PieceDefinition = {
  id: "straight-long",
  name: "Long Straight",
  category: "basic",
  description: "Double-length straight track segment",
  width: SEG * 2,
  height: 20,
  endpoints: [
    { id: "in", offsetX: 0, offsetY: 10, direction: 180, role: "in" },
    { id: "out", offsetX: SEG * 2, offsetY: 10, direction: 0, role: "out" },
  ],
  svgPath: "M 0,10 L 120,10",
}

const R = 80
const ARC_45_DX = R * Math.sin(Math.PI / 4)
const ARC_45_DY = R - R * Math.cos(Math.PI / 4)

export const curveLeft45: PieceDefinition = {
  id: "curve-left-45",
  name: "Curve Left",
  category: "basic",
  description: "45° left curve",
  width: Math.ceil(ARC_45_DX) + 4,
  height: Math.ceil(ARC_45_DY) + 14,
  endpoints: [
    { id: "in", offsetX: 0, offsetY: Math.ceil(ARC_45_DY) + 10, direction: 180, role: "in" },
    { id: "out", offsetX: Math.ceil(ARC_45_DX), offsetY: 4, direction: 315, role: "out" },
  ],
  svgPath: `M 0,${Math.ceil(ARC_45_DY) + 10} A ${R},${R} 0 0,1 ${Math.ceil(ARC_45_DX)},4`,
}

export const curveRight45: PieceDefinition = {
  id: "curve-right-45",
  name: "Curve Right",
  category: "basic",
  description: "45° right curve",
  width: Math.ceil(ARC_45_DX) + 4,
  height: Math.ceil(ARC_45_DY) + 14,
  endpoints: [
    { id: "in", offsetX: 0, offsetY: 4, direction: 180, role: "in" },
    { id: "out", offsetX: Math.ceil(ARC_45_DX), offsetY: Math.ceil(ARC_45_DY) + 10, direction: 45, role: "out" },
  ],
  svgPath: `M 0,4 A ${R},${R} 0 0,0 ${Math.ceil(ARC_45_DX)},${Math.ceil(ARC_45_DY) + 10}`,
}

const R_BROAD = 140
const BROAD_45_DX = R_BROAD * Math.sin(Math.PI / 4)
const BROAD_45_DY = R_BROAD - R_BROAD * Math.cos(Math.PI / 4)

export const curveLeftBroad: PieceDefinition = {
  id: "curve-left-broad",
  name: "Broad Curve Left",
  category: "basic",
  description: "Gentle 45° left curve",
  width: Math.ceil(BROAD_45_DX) + 4,
  height: Math.ceil(BROAD_45_DY) + 14,
  endpoints: [
    { id: "in", offsetX: 0, offsetY: Math.ceil(BROAD_45_DY) + 10, direction: 180, role: "in" },
    { id: "out", offsetX: Math.ceil(BROAD_45_DX), offsetY: 4, direction: 315, role: "out" },
  ],
  svgPath: `M 0,${Math.ceil(BROAD_45_DY) + 10} A ${R_BROAD},${R_BROAD} 0 0,1 ${Math.ceil(BROAD_45_DX)},4`,
}

export const curveRightBroad: PieceDefinition = {
  id: "curve-right-broad",
  name: "Broad Curve Right",
  category: "basic",
  description: "Gentle 45° right curve",
  width: Math.ceil(BROAD_45_DX) + 4,
  height: Math.ceil(BROAD_45_DY) + 14,
  endpoints: [
    { id: "in", offsetX: 0, offsetY: 4, direction: 180, role: "in" },
    { id: "out", offsetX: Math.ceil(BROAD_45_DX), offsetY: Math.ceil(BROAD_45_DY) + 10, direction: 45, role: "out" },
  ],
  svgPath: `M 0,4 A ${R_BROAD},${R_BROAD} 0 0,0 ${Math.ceil(BROAD_45_DX)},${Math.ceil(BROAD_45_DY) + 10}`,
}

const HALF_ARC_DX = R * Math.sin(Math.PI / 8)
const HALF_ARC_DY = R - R * Math.cos(Math.PI / 8)

export const halfCurveLeft: PieceDefinition = {
  id: "half-curve-left",
  name: "Half Curve Left",
  category: "basic",
  description: "22.5° left curve",
  width: Math.ceil(HALF_ARC_DX) + 4,
  height: Math.ceil(HALF_ARC_DY) + 14,
  endpoints: [
    { id: "in", offsetX: 0, offsetY: Math.ceil(HALF_ARC_DY) + 10, direction: 180, role: "in" },
    { id: "out", offsetX: Math.ceil(HALF_ARC_DX), offsetY: 4, direction: 337.5, role: "out" },
  ],
  svgPath: `M 0,${Math.ceil(HALF_ARC_DY) + 10} A ${R},${R} 0 0,1 ${Math.ceil(HALF_ARC_DX)},4`,
}

export const halfCurveRight: PieceDefinition = {
  id: "half-curve-right",
  name: "Half Curve Right",
  category: "basic",
  description: "22.5° right curve",
  width: Math.ceil(HALF_ARC_DX) + 4,
  height: Math.ceil(HALF_ARC_DY) + 14,
  endpoints: [
    { id: "in", offsetX: 0, offsetY: 4, direction: 180, role: "in" },
    { id: "out", offsetX: Math.ceil(HALF_ARC_DX), offsetY: Math.ceil(HALF_ARC_DY) + 10, direction: 22.5, role: "out" },
  ],
  svgPath: `M 0,4 A ${R},${R} 0 0,0 ${Math.ceil(HALF_ARC_DX)},${Math.ceil(HALF_ARC_DY) + 10}`,
}

export const BASIC_PIECES: PieceDefinition[] = [
  straight,
  straightLong,
  curveLeft45,
  curveRight45,
  curveLeftBroad,
  curveRightBroad,
  halfCurveLeft,
  halfCurveRight,
]
