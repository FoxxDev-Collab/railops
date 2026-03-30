"use client"

import { memo } from "react"
import type { PlacedPiece } from "../pieces/piece-types"
import type { PieceDefinition } from "../pieces/piece-types"
import { pieceTransform } from "../pieces/piece-geometry"
import { getTrackColor, getTurnoutColor, getBumperColor, getSelectionColor } from "./track-colors"

interface PieceRendererProps {
  piece: PlacedPiece
  pieceDef: PieceDefinition
  isDark: boolean
  selected?: boolean
}

export const PieceRenderer = memo(function PieceRenderer({
  piece,
  pieceDef,
  isDark,
  selected = false,
}: PieceRendererProps) {
  const trackColor = getTrackColor(piece.trackType ?? "LEAD", isDark)
  const turnoutColor = getTurnoutColor(isDark)
  const bumperColor = getBumperColor(isDark)
  const selectionColor = getSelectionColor(isDark)
  const transform = pieceTransform(piece, pieceDef)

  const strokeWidth = pieceDef.category === "basic" ? 3 : 2.5

  return (
    <g
      transform={transform}
      data-piece-id={piece.id}
      style={{ cursor: "pointer" }}
    >
      {selected && (
        <g opacity={0.25}>
          {pieceDef.svgPath && (
            <path
              d={pieceDef.svgPath}
              stroke={selectionColor}
              strokeWidth={strokeWidth + 6}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </g>
      )}

      {pieceDef.svgPath && (
        <path
          d={pieceDef.svgPath}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {pieceDef.svgExtra && (
        <g
          color={trackColor}
          strokeWidth={strokeWidth}
          dangerouslySetInnerHTML={{ __html: pieceDef.svgExtra }}
          style={
            {
              "--turnout-color": turnoutColor,
              "--bumper-color": bumperColor,
            } as React.CSSProperties
          }
        />
      )}

      {piece.name && (
        <g>
          <rect
            x={pieceDef.width / 2 - 30}
            y={-14}
            width={60}
            height={16}
            rx={8}
            fill={trackColor}
            opacity={0.12}
          />
          <text
            x={pieceDef.width / 2}
            y={-3}
            textAnchor="middle"
            fill={trackColor}
            fontSize={9}
            fontFamily="system-ui"
            fontWeight={600}
          >
            {piece.name}
          </text>
        </g>
      )}

      {piece.capacity != null && piece.capacity > 0 && (
        <g>
          <rect
            x={pieceDef.width - 36}
            y={-14}
            width={36}
            height={14}
            rx={7}
            fill={trackColor}
            opacity={0.08}
          />
          <text
            x={pieceDef.width - 18}
            y={-4}
            textAnchor="middle"
            fill={trackColor}
            fontSize={8}
            fontFamily="system-ui"
            opacity={0.8}
          >
            {piece.capacity} cars
          </text>
        </g>
      )}

      {selected && (
        <rect
          x={-2}
          y={-2}
          width={pieceDef.width + 4}
          height={pieceDef.height + 4}
          rx={3}
          fill="none"
          stroke={selectionColor}
          strokeWidth={1.5}
          strokeDasharray="4,3"
          opacity={0.5}
        />
      )}
    </g>
  )
})
