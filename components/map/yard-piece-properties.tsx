"use client"

import { useCallback } from "react"
import { usePieceStore } from "./use-piece-store"
import { getPieceDef } from "./pieces/piece-registry"
import { getTrackColor, TRACK_TYPE_COLORS, type TrackTypeName } from "./svg/track-colors"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface YardPiecePropertiesProps {
  isDark: boolean
}

const TRACK_TYPES: { value: string; label: string }[] = Object.entries(TRACK_TYPE_COLORS).map(
  ([key, val]) => ({ value: key, label: val.label })
)

export function YardPieceProperties({ isDark }: YardPiecePropertiesProps) {
  const pieces = usePieceStore((s) => s.pieces)
  const selectedPieceId = usePieceStore((s) => s.selectedPieceId)
  const updatePiece = usePieceStore((s) => s.updatePiece)
  const removePieceWithDownstream = usePieceStore((s) => s.removePieceWithDownstream)

  const selectedPiece = pieces.find((p) => p.id === selectedPieceId)
  const pieceDef = selectedPiece ? getPieceDef(selectedPiece.pieceDefId) : null

  const handleNameChange = useCallback(
    (value: string) => {
      if (selectedPieceId) updatePiece(selectedPieceId, { name: value || undefined })
    },
    [selectedPieceId, updatePiece]
  )

  const handleTypeChange = useCallback(
    (value: string) => {
      if (selectedPieceId) updatePiece(selectedPieceId, { trackType: value })
    },
    [selectedPieceId, updatePiece]
  )

  const handleCapacityChange = useCallback(
    (value: string) => {
      const num = parseInt(value, 10)
      if (selectedPieceId) updatePiece(selectedPieceId, { capacity: isNaN(num) ? undefined : num })
    },
    [selectedPieceId, updatePiece]
  )

  const handleDelete = useCallback(() => {
    if (selectedPieceId) removePieceWithDownstream(selectedPieceId)
  }, [selectedPieceId, removePieceWithDownstream])

  const totalTracks = pieces.filter((p) => {
    const def = getPieceDef(p.pieceDefId)
    return def?.category === "basic" || def?.category === "terminal"
  }).length
  const totalTurnouts = pieces.filter((p) => {
    const def = getPieceDef(p.pieceDefId)
    return def?.category === "turnout" || def?.category === "crossing"
  }).length
  const totalCapacity = pieces.reduce((sum, p) => sum + (p.capacity ?? 0), 0)

  return (
    <div className="flex flex-col gap-4 p-4 border-l border-border bg-card h-full overflow-y-auto" style={{ width: 280 }}>
      {selectedPiece && pieceDef ? (
        <>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
              Selected: {pieceDef.name}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input
                value={selectedPiece.name ?? ""}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Track name..."
                className="mt-1 h-8 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Track Type</Label>
              <Select
                value={selectedPiece.trackType ?? "LEAD"}
                onValueChange={handleTypeChange}
              >
                <SelectTrigger className="mt-1 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRACK_TYPES.map((tt) => (
                    <SelectItem key={tt.value} value={tt.value}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full"
                          style={{ background: getTrackColor(tt.value, isDark) }}
                        />
                        {tt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Capacity (cars)</Label>
              <Input
                type="number"
                min={0}
                value={selectedPiece.capacity ?? ""}
                onChange={(e) => handleCapacityChange(e.target.value)}
                placeholder="0"
                className="mt-1 h-8 text-sm"
              />
            </div>

            <div className="pt-2">
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={handleDelete}
              >
                Delete Piece
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
            No Selection
          </p>
          <p className="text-xs text-muted-foreground">
            Click a track piece to edit its properties, or click an open endpoint to add a new piece.
          </p>
        </div>
      )}

      <div className="h-px bg-border my-1" />

      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
          Yard Summary
        </p>
        <div className="flex flex-col gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Track pieces</span>
            <span>{totalTracks}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Turnouts</span>
            <span>{totalTurnouts}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total capacity</span>
            <span>{totalCapacity} cars</span>
          </div>
        </div>
      </div>

      <div className="h-px bg-border my-1" />

      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
          Track Types
        </p>
        <div className="flex flex-col gap-1.5">
          {TRACK_TYPES.map((tt) => (
            <div key={tt.value} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className="inline-block w-5 h-0.5 rounded"
                style={{ background: getTrackColor(tt.value, isDark) }}
              />
              {tt.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
