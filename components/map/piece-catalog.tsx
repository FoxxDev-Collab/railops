"use client"

import { useState } from "react"
import type { PieceDefinition, ResolvedEndpoint } from "./pieces/piece-types"
import { getAllCategories } from "./pieces/piece-registry"
import { getTrackColor } from "./svg/track-colors"

interface PieceCatalogProps {
  endpoint: ResolvedEndpoint
  isDark: boolean
  onSelect: (pieceDef: PieceDefinition, endpoint: ResolvedEndpoint) => void
  onClose: () => void
}

export function PieceCatalog({ endpoint, isDark, onSelect, onClose }: PieceCatalogProps) {
  const categories = getAllCategories()
  const [search, setSearch] = useState("")
  const leadColor = getTrackColor("LEAD", isDark)

  const filteredCategories = categories
    .map((cat) => ({
      ...cat,
      pieces: cat.pieces.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.description.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((cat) => cat.pieces.length > 0)

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: isDark ? "rgba(15,17,23,0.85)" : "rgba(255,255,255,0.85)",
        backdropFilter: "blur(8px)",
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(560px, 90%)",
          maxHeight: "70vh",
          background: isDark ? "#1a1d27" : "#ffffff",
          border: `1px solid ${isDark ? "#2e3345" : "#e2e8f0"}`,
          borderRadius: 12,
          boxShadow: isDark
            ? "0 24px 48px rgba(0,0,0,0.5)"
            : "0 24px 48px rgba(0,0,0,0.12)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "16px 20px 12px",
            borderBottom: `1px solid ${isDark ? "#2e3345" : "#e2e8f0"}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1,
                color: isDark ? "#8b90a0" : "#64748b",
                fontWeight: 600,
              }}
            >
              All Track Pieces
            </span>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: isDark ? "#8b90a0" : "#64748b",
                cursor: "pointer",
                fontSize: 16,
                padding: "2px 6px",
              }}
            >
              ✕
            </button>
          </div>
          <input
            type="text"
            placeholder="Search pieces..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 8,
              border: `1px solid ${isDark ? "#2e3345" : "#e2e8f0"}`,
              background: isDark ? "#0f1117" : "#f8fafc",
              color: isDark ? "#e4e7ef" : "#1e293b",
              fontSize: 13,
              outline: "none",
            }}
          />
        </div>

        <div style={{ overflowY: "auto", padding: "12px 20px 20px" }}>
          {filteredCategories.map((cat) => (
            <div key={cat.category} style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  color: isDark ? "#8b90a0" : "#94a3b8",
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                {cat.label}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                  gap: 8,
                }}
              >
                {cat.pieces.map((piece) => (
                  <button
                    key={piece.id}
                    onClick={() => onSelect(piece, endpoint)}
                    style={{
                      background: isDark ? "#232733" : "#f1f5f9",
                      border: `1px solid ${isDark ? "#2e3345" : "#e2e8f0"}`,
                      borderRadius: 8,
                      padding: "10px 8px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      transition: "all 0.15s",
                      color: isDark ? "#e4e7ef" : "#1e293b",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = isDark ? "#4a9eff" : "#2563eb"
                      e.currentTarget.style.background = isDark ? "#2e3345" : "#e2e8f0"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = isDark ? "#2e3345" : "#e2e8f0"
                      e.currentTarget.style.background = isDark ? "#232733" : "#f1f5f9"
                    }}
                  >
                    <svg width={40} height={24} viewBox={`0 0 ${piece.width} ${piece.height}`}>
                      {piece.svgPath && (
                        <path
                          d={piece.svgPath}
                          stroke={leadColor}
                          strokeWidth={2.5}
                          fill="none"
                          strokeLinecap="round"
                        />
                      )}
                      {piece.svgExtra && (
                        <g
                          color={leadColor}
                          strokeWidth={2}
                          dangerouslySetInnerHTML={{ __html: piece.svgExtra }}
                        />
                      )}
                    </svg>
                    <span style={{ fontSize: 10, fontWeight: 500, textAlign: "center" }}>
                      {piece.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {filteredCategories.length === 0 && (
            <div style={{ textAlign: "center", padding: 24, color: isDark ? "#8b90a0" : "#94a3b8", fontSize: 13 }}>
              No pieces match &ldquo;{search}&rdquo;
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
