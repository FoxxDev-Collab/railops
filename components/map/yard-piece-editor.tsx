"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { useTheme } from "next-themes"
import { getYardCanvasData, saveYardCanvas } from "@/app/actions/yard-canvas"
import { usePieceStore } from "./use-piece-store"
import { getPieceDef, getPieceRegistry } from "./pieces/piece-registry"
import {
  resolveAllEndpoints,
  findOpenEndpoints,
  calculatePlacement,
  isPointInPiece,
} from "./pieces/piece-geometry"
import type { PlacedPiece, ResolvedEndpoint, PieceDefinition, Point } from "./pieces/piece-types"
import { PieceRenderer } from "./svg/piece-renderer"
import { EndpointMarker } from "./svg/endpoint-marker"
import { RadialPiecePicker } from "./radial-piece-picker"
import { PieceCatalog } from "./piece-catalog"
import { YardPieceProperties } from "./yard-piece-properties"

// ─── Constants ──────────────────────────────────────────

const GRID_CELL = 20
const SAVE_DEBOUNCE_MS = 1200
const ENDPOINT_HIT_RADIUS = 16

// ─── Types ──────────────────────────────────────────────

interface Viewport {
  x: number
  y: number
  zoom: number
}

interface YardPieceEditorProps {
  locationId: string
}

// ─── Grid dots background ────────────────────────────────

function GridDots({
  viewport,
  width,
  height,
  isDark,
}: {
  viewport: Viewport
  width: number
  height: number
  isDark: boolean
}) {
  const dotColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"
  const spacing = GRID_CELL * viewport.zoom
  const offsetX = ((viewport.x % spacing) + spacing) % spacing
  const offsetY = ((viewport.y % spacing) + spacing) % spacing

  const cols = Math.ceil(width / spacing) + 2
  const rows = Math.ceil(height / spacing) + 2

  const dots: React.ReactNode[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = offsetX + c * spacing - spacing
      const cy = offsetY + r * spacing - spacing
      dots.push(
        <circle key={`${r}-${c}`} cx={cx} cy={cy} r={1} fill={dotColor} />
      )
    }
  }

  return <g>{dots}</g>
}

// ─── Save status badge ───────────────────────────────────

function SaveBadge({ status }: { status: "saved" | "saving" | "unsaved" }) {
  const label = status === "saving" ? "Saving…" : status === "unsaved" ? "Unsaved" : "Saved"
  const color =
    status === "saving"
      ? "text-amber-500"
      : status === "unsaved"
      ? "text-rose-500"
      : "text-emerald-500"

  return (
    <span className={`text-[11px] font-semibold tracking-wide ${color} tabular-nums`}>
      {label}
    </span>
  )
}

// ─── Main component ──────────────────────────────────────

export function YardPieceEditor({ locationId }: YardPieceEditorProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  // Canvas container ref and dimensions
  const containerRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ width: 800, height: 600 })

  // Viewport state: pan (x, y) and zoom
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 })

  // Panning state
  const isPanningRef = useRef(false)
  const panStartRef = useRef<{ x: number; y: number; vx: number; vy: number }>({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
  })

  // Loading state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Store
  const pieces = usePieceStore((s) => s.pieces)
  const selectedPieceId = usePieceStore((s) => s.selectedPieceId)
  const activeEndpoint = usePieceStore((s) => s.activeEndpoint)
  const canvasId = usePieceStore((s) => s.canvasId)
  const saveStatus = usePieceStore((s) => s.saveStatus)
  const showCatalog = usePieceStore((s) => s.showCatalog)
  const setPieces = usePieceStore((s) => s.setPieces)
  const setCanvasInfo = usePieceStore((s) => s.setCanvasInfo)
  const setSaveStatus = usePieceStore((s) => s.setSaveStatus)
  const placePiece = usePieceStore((s) => s.placePiece)
  const removePiece = usePieceStore((s) => s.removePiece)
  const selectPiece = usePieceStore((s) => s.selectPiece)
  const setActiveEndpoint = usePieceStore((s) => s.setActiveEndpoint)
  const setShowCatalog = usePieceStore((s) => s.setShowCatalog)
  const undo = usePieceStore((s) => s.undo)
  const redo = usePieceStore((s) => s.redo)
  const canUndo = usePieceStore((s) => s.canUndo)
  const canRedo = usePieceStore((s) => s.canRedo)
  const reset = usePieceStore((s) => s.reset)

  // Save debounce ref
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canvasIdRef = useRef<string | null>(null)

  // Keep canvasIdRef in sync
  useEffect(() => {
    canvasIdRef.current = canvasId
  }, [canvasId])

  // ── Load canvas data ────────────────────────────────────

  useEffect(() => {
    reset()
    setLoading(true)
    setError(null)

    getYardCanvasData(locationId)
      .then((data) => {
        const { canvas, yardTracks: _yardTracks, industries: _industries } = data

        setCanvasInfo(canvas.id, locationId)
        canvasIdRef.current = canvas.id

        // Restore viewport
        if (canvas.viewport && typeof canvas.viewport === "object") {
          const vp = canvas.viewport as { x?: number; y?: number; zoom?: number }
          setViewport({
            x: vp.x ?? 0,
            y: vp.y ?? 0,
            zoom: vp.zoom ?? 1,
          })
        }

        // Restore pieces
        const saved = canvas.trackElements
        if (Array.isArray(saved) && saved.length > 0) {
          const loadedPieces: PlacedPiece[] = (saved as Record<string, unknown>[]).flatMap((el) => {
            if (
              el.id &&
              el.pieceDefId &&
              el.position &&
              typeof el.rotation === "number" &&
              el.connectedEndpoints
            ) {
              return [el as unknown as PlacedPiece]
            }
            return []
          })
          setPieces(loadedPieces)
        } else {
          // No canvas yet — place a starter straight piece at origin
          const starterPiece: PlacedPiece = {
            id: `piece-${Date.now()}`,
            pieceDefId: "straight",
            position: { x: 200, y: 200 },
            rotation: 0,
            trackType: "LEAD",
            connectedEndpoints: { in: null, out: null },
          }
          setPieces([starterPiece])
        }
        setLoading(false)
      })
      .catch((err) => {
        setError(err?.message ?? "Failed to load canvas")
        setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId])

  // ── Auto-save ────────────────────────────────────────────

  useEffect(() => {
    if (saveStatus !== "unsaved") return
    if (!canvasIdRef.current) return

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      const cid = canvasIdRef.current
      if (!cid) return
      setSaveStatus("saving")
      try {
        await saveYardCanvas({
          canvasId: cid,
          locationId,
          trackElements: usePieceStore.getState().pieces as unknown[],
          viewport,
        })
        setSaveStatus("saved")
      } catch {
        setSaveStatus("unsaved")
      }
    }, SAVE_DEBOUNCE_MS)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveStatus, pieces])

  // ── Resize observer ─────────────────────────────────────

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setDims({ width, height })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── Keyboard shortcuts ──────────────────────────────────

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return

      if (e.key === "Escape") {
        setActiveEndpoint(null)
        selectPiece(null)
        setShowCatalog(false)
        return
      }

      if ((e.key === "Delete" || e.key === "Backspace") && selectedPieceId) {
        e.preventDefault()
        removePiece(selectedPieceId)
        return
      }

      if (e.ctrlKey && e.shiftKey && e.key === "Z") {
        e.preventDefault()
        if (canRedo()) redo()
        return
      }
      if (e.ctrlKey && e.key === "z") {
        e.preventDefault()
        if (canUndo()) undo()
        return
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [selectedPieceId, selectPiece, setActiveEndpoint, setShowCatalog, removePiece, undo, redo, canUndo, canRedo])

  // ── Canvas coordinate helpers ────────────────────────────

  const svgToCanvas = useCallback(
    (svgX: number, svgY: number): Point => ({
      x: (svgX - viewport.x) / viewport.zoom,
      y: (svgY - viewport.y) / viewport.zoom,
    }),
    [viewport]
  )

  const getEventSVGCoords = useCallback((e: React.MouseEvent): Point => {
    const svg = containerRef.current?.querySelector("svg")
    if (!svg) return { x: e.clientX, y: e.clientY }
    const rect = svg.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }, [])

  // ── Panning ──────────────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const isMiddle = e.button === 1
      const isAltLeft = e.button === 0 && e.altKey
      if (!isMiddle && !isAltLeft) return

      e.preventDefault()
      isPanningRef.current = true
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        vx: viewport.x,
        vy: viewport.y,
      }
    },
    [viewport]
  )

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanningRef.current) return
    const dx = e.clientX - panStartRef.current.x
    const dy = e.clientY - panStartRef.current.y
    setViewport((v) => ({
      ...v,
      x: panStartRef.current.vx + dx,
      y: panStartRef.current.vy + dy,
    }))
  }, [])

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false
  }, [])

  // ── Zoom ─────────────────────────────────────────────────

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
    const svg = containerRef.current?.querySelector("svg")
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    setViewport((v) => {
      const newZoom = Math.max(0.2, Math.min(4, v.zoom * factor))
      const zoomRatio = newZoom / v.zoom
      return {
        zoom: newZoom,
        x: mx - zoomRatio * (mx - v.x),
        y: my - zoomRatio * (my - v.y),
      }
    })
  }, [])

  // ── Open endpoints ───────────────────────────────────────

  const registry = getPieceRegistry()
  const openEndpoints = findOpenEndpoints(pieces, registry)

  // ── Endpoint click ────────────────────────────────────────

  const handleEndpointClick = useCallback(
    (ep: ResolvedEndpoint) => {
      setActiveEndpoint(ep)
      selectPiece(null)
    },
    [setActiveEndpoint, selectPiece]
  )

  // ── Piece selection (canvas click) ───────────────────────

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0 || e.altKey) return
      if (isPanningRef.current) return

      const svgCoords = getEventSVGCoords(e)
      const canvasPoint = svgToCanvas(svgCoords.x, svgCoords.y)

      // Check if click is near any open endpoint first
      for (const ep of openEndpoints) {
        const dx = canvasPoint.x - ep.position.x
        const dy = canvasPoint.y - ep.position.y
        if (Math.sqrt(dx * dx + dy * dy) < ENDPOINT_HIT_RADIUS) {
          // endpoint-marker's onClick will handle this
          return
        }
      }

      // Check if click is on a placed piece
      let hitPieceId: string | null = null
      for (let i = pieces.length - 1; i >= 0; i--) {
        const piece = pieces[i]
        const def = getPieceDef(piece.pieceDefId)
        if (!def) continue
        if (isPointInPiece(canvasPoint, piece, def, 8)) {
          hitPieceId = piece.id
          break
        }
      }

      if (hitPieceId) {
        selectPiece(hitPieceId)
      } else {
        selectPiece(null)
        setActiveEndpoint(null)
      }
    },
    [pieces, openEndpoints, svgToCanvas, getEventSVGCoords, selectPiece, setActiveEndpoint]
  )

  // ── Place piece from radial/catalog ─────────────────────

  const handlePieceSelect = useCallback(
    (pieceDef: PieceDefinition, endpoint: ResolvedEndpoint) => {
      const { position, rotation } = calculatePlacement(endpoint, pieceDef)

      // Build connectedEndpoints map
      const connectedEndpoints: Record<string, string | null> = {}
      for (const ep of pieceDef.endpoints) {
        connectedEndpoints[ep.id] = null
      }

      // Find the "in" endpoint of the new piece and connect it
      const inputDef = pieceDef.endpoints.find((ep) => ep.role === "in")
      if (inputDef) {
        connectedEndpoints[inputDef.id] = endpoint.globalId
      }

      const newPiece: PlacedPiece = {
        id: `piece-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        pieceDefId: pieceDef.id,
        position,
        rotation,
        trackType: pieceDef.defaultTrackType ?? "LEAD",
        connectedEndpoints,
      }

      placePiece(newPiece)
      selectPiece(newPiece.id)
    },
    [placePiece, selectPiece]
  )

  // ── Render ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-full text-muted-foreground text-sm">
        <span className="animate-pulse">Loading canvas…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full text-destructive text-sm">
        {error}
      </div>
    )
  }

  const transform = `translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`

  const bgColor = isDark ? "#0f1117" : "#f8fafc"
  const cursor = isPanningRef.current ? "grabbing" : "default"

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* ── SVG Canvas ── */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden"
        style={{ background: bgColor, cursor }}
      >
        <svg
          width={dims.width}
          height={dims.height}
          style={{ display: "block", userSelect: "none" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onClick={handleCanvasClick}
        >
          {/* Grid dots */}
          <GridDots
            viewport={viewport}
            width={dims.width}
            height={dims.height}
            isDark={isDark}
          />

          {/* Main canvas transform group */}
          <g transform={transform}>
            {/* Placed pieces */}
            {pieces.map((piece) => {
              const def = getPieceDef(piece.pieceDefId)
              if (!def) return null
              return (
                <PieceRenderer
                  key={piece.id}
                  piece={piece}
                  pieceDef={def}
                  isDark={isDark}
                  selected={piece.id === selectedPieceId}
                />
              )
            })}

            {/* Open endpoint markers */}
            {!activeEndpoint &&
              !showCatalog &&
              openEndpoints.map((ep) => (
                <EndpointMarker
                  key={ep.globalId}
                  endpoint={ep}
                  isDark={isDark}
                  onClick={handleEndpointClick}
                />
              ))}

            {/* Radial piece picker */}
            {activeEndpoint && !showCatalog && (
              <RadialPiecePicker
                endpoint={activeEndpoint}
                isDark={isDark}
                onSelect={handlePieceSelect}
                onOpenCatalog={() => setShowCatalog(true)}
                onClose={() => setActiveEndpoint(null)}
              />
            )}
          </g>
        </svg>

        {/* Piece catalog overlay (absolute, over svg) */}
        {showCatalog && activeEndpoint && (
          <PieceCatalog
            endpoint={activeEndpoint}
            isDark={isDark}
            onSelect={(def, ep) => {
              setShowCatalog(false)
              handlePieceSelect(def, ep)
            }}
            onClose={() => setShowCatalog(false)}
          />
        )}

        {/* ── Toolbar overlay ── */}
        <div
          className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/60 backdrop-blur-sm shadow-sm"
          style={{
            background: isDark ? "rgba(20,22,30,0.85)" : "rgba(255,255,255,0.85)",
            pointerEvents: "auto",
          }}
        >
          <button
            className="p-1 rounded hover:bg-accent disabled:opacity-30 transition-colors"
            title="Undo (Ctrl+Z)"
            disabled={!canUndo()}
            onClick={() => undo()}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7v6h6" />
              <path d="M3 13A9 9 0 1 0 6 6.5" />
            </svg>
          </button>
          <button
            className="p-1 rounded hover:bg-accent disabled:opacity-30 transition-colors"
            title="Redo (Ctrl+Shift+Z)"
            disabled={!canRedo()}
            onClick={() => redo()}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 7v6h-6" />
              <path d="M21 13A9 9 0 1 1 18 6.5" />
            </svg>
          </button>

          <div className="w-px h-4 bg-border" />

          <button
            className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground"
            title="Reset zoom"
            onClick={() => setViewport({ x: 0, y: 0, zoom: 1 })}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="8" y1="11" x2="14" y2="11" />
              <line x1="11" y1="8" x2="11" y2="14" />
            </svg>
          </button>

          <div className="w-px h-4 bg-border" />

          <span className="text-[11px] text-muted-foreground tabular-nums">
            {Math.round(viewport.zoom * 100)}%
          </span>

          <div className="w-px h-4 bg-border" />

          <SaveBadge status={saveStatus} />
        </div>

        {/* ── Keyboard hint ── */}
        <div
          className="absolute bottom-3 left-3 text-[10px] text-muted-foreground/50 select-none pointer-events-none"
        >
          Alt+drag or middle-click to pan · Scroll to zoom · Click endpoint to add · Delete to remove
        </div>
      </div>

      {/* ── Properties panel ── */}
      <YardPieceProperties isDark={isDark} />
    </div>
  )
}
