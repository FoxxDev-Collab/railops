"use client"

import { useCallback, useEffect, useState } from "react"
import type { ResolvedEndpoint, PieceDefinition } from "./pieces/piece-types"
import { getRadialDefaults } from "./pieces/piece-registry"
import { getTrackColor } from "./svg/track-colors"

interface RadialPiecePickerProps {
  endpoint: ResolvedEndpoint
  isDark: boolean
  onSelect: (pieceDef: PieceDefinition, endpoint: ResolvedEndpoint) => void
  onOpenCatalog: () => void
  onClose: () => void
}

const PIECE_ICONS: Record<string, string> = {
  "straight": "M 4,12 L 20,12",
  "curve-left-45": "M 4,18 Q 4,6 18,6",
  "curve-right-45": "M 4,6 Q 4,18 18,18",
  "turnout-right": "M 4,12 L 20,12 M 10,12 L 20,18",
  "turnout-left": "M 4,12 L 20,12 M 10,12 L 20,6",
  "bumper": "M 4,12 L 16,12",
}

const BUMPER_EXTRA = `<rect x="16" y="8" width="3" height="8" rx="1" fill="currentColor" opacity="0.7"/>`

export function RadialPiecePicker({
  endpoint,
  isDark,
  onSelect,
  onOpenCatalog,
  onClose,
}: RadialPiecePickerProps) {
  const defaults = getRadialDefaults()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose])

  const handleSelect = useCallback(
    (def: PieceDefinition) => {
      onSelect(def, endpoint)
    },
    [onSelect, endpoint]
  )

  const radius = 52
  const itemCount = defaults.length + 1
  const angleStep = (2 * Math.PI) / itemCount
  const startAngle = -Math.PI / 2

  const leadColor = getTrackColor("LEAD", isDark)

  return (
    <g className="radial-picker">
      <circle
        cx={endpoint.position.x}
        cy={endpoint.position.y}
        r={radius + 36}
        fill={isDark ? "rgba(15,17,23,0.6)" : "rgba(255,255,255,0.6)"}
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        style={{ cursor: "default" }}
      />

      <circle
        cx={endpoint.position.x}
        cy={endpoint.position.y}
        r={6}
        fill={isDark ? "#4a9eff" : "#2563eb"}
        opacity={0.9}
      />

      {defaults.map((def, i) => {
        const angle = startAngle + i * angleStep
        const x = endpoint.position.x + Math.cos(angle) * radius
        const y = endpoint.position.y + Math.sin(angle) * radius
        const iconPath = PIECE_ICONS[def.id] || PIECE_ICONS["straight"]

        return (
          <g
            key={def.id}
            onClick={(e) => {
              e.stopPropagation()
              handleSelect(def)
            }}
            style={{
              cursor: "pointer",
              opacity: visible ? 1 : 0,
              transform: visible ? "scale(1)" : "scale(0.7)",
              transformOrigin: `${x}px ${y}px`,
              transition: `all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.03}s`,
            }}
          >
            <rect
              x={x - 28}
              y={y - 28}
              width={56}
              height={56}
              rx={12}
              fill={isDark ? "#1a1d27" : "#ffffff"}
              stroke={isDark ? "#2e3345" : "#e2e8f0"}
              strokeWidth={1.5}
            />

            <svg
              x={x - 12}
              y={y - 16}
              width={24}
              height={24}
              viewBox="0 0 24 24"
            >
              <path
                d={iconPath}
                stroke={leadColor}
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
              />
              {def.id === "bumper" && (
                <g dangerouslySetInnerHTML={{ __html: BUMPER_EXTRA }} />
              )}
              {(def.id === "turnout-right" || def.id === "turnout-left") && (
                <circle
                  cx={10}
                  cy={12}
                  r={2}
                  fill={isDark ? "#ff8c42" : "#c2410c"}
                />
              )}
            </svg>

            <text
              x={x}
              y={y + 18}
              textAnchor="middle"
              fill={isDark ? "#8b90a0" : "#64748b"}
              fontSize={7}
              fontFamily="system-ui"
              fontWeight={600}
              letterSpacing={0.5}
            >
              {def.name.length > 10 ? def.name.slice(0, 9) + "…" : def.name}
            </text>
          </g>
        )
      })}

      {(() => {
        const angle = startAngle + defaults.length * angleStep
        const x = endpoint.position.x + Math.cos(angle) * radius
        const y = endpoint.position.y + Math.sin(angle) * radius

        return (
          <g
            onClick={(e) => {
              e.stopPropagation()
              onOpenCatalog()
            }}
            style={{
              cursor: "pointer",
              opacity: visible ? 1 : 0,
              transform: visible ? "scale(1)" : "scale(0.7)",
              transformOrigin: `${x}px ${y}px`,
              transition: `all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) ${defaults.length * 0.03}s`,
            }}
          >
            <rect
              x={x - 28}
              y={y - 28}
              width={56}
              height={56}
              rx={12}
              fill={isDark ? "#1a1d27" : "#ffffff"}
              stroke={isDark ? "#2e3345" : "#e2e8f0"}
              strokeWidth={1.5}
            />
            <circle cx={x - 6} cy={y - 4} r={1.5} fill={isDark ? "#8b90a0" : "#64748b"} />
            <circle cx={x} cy={y - 4} r={1.5} fill={isDark ? "#8b90a0" : "#64748b"} />
            <circle cx={x + 6} cy={y - 4} r={1.5} fill={isDark ? "#8b90a0" : "#64748b"} />
            <text
              x={x}
              y={y + 18}
              textAnchor="middle"
              fill={isDark ? "#8b90a0" : "#64748b"}
              fontSize={7}
              fontFamily="system-ui"
              fontWeight={600}
              letterSpacing={0.5}
            >
              More…
            </text>
          </g>
        )
      })()}
    </g>
  )
}
