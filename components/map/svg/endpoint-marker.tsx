"use client"

import { memo } from "react"
import type { ResolvedEndpoint } from "../pieces/piece-types"
import { getEndpointColor } from "./track-colors"

interface EndpointMarkerProps {
  endpoint: ResolvedEndpoint
  isDark: boolean
  onClick?: (endpoint: ResolvedEndpoint) => void
}

export const EndpointMarker = memo(function EndpointMarker({
  endpoint,
  isDark,
  onClick,
}: EndpointMarkerProps) {
  const color = getEndpointColor(isDark)

  return (
    <g
      style={{ cursor: "pointer" }}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.(endpoint)
      }}
    >
      <circle
        cx={endpoint.position.x}
        cy={endpoint.position.y}
        r={12}
        fill={color}
        opacity={0}
      >
        <animate
          attributeName="r"
          values="8;14;8"
          dur="2s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.15;0.05;0.15"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>

      <circle
        cx={endpoint.position.x}
        cy={endpoint.position.y}
        r={5}
        fill={color}
        opacity={0.8}
      >
        <animate
          attributeName="opacity"
          values="0.8;0.4;0.8"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>
    </g>
  )
})
