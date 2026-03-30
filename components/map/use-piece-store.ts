import { create } from "zustand"
import type { PlacedPiece, PieceAction, ResolvedEndpoint } from "./pieces/piece-types"

const MAX_UNDO = 50

interface PieceStore {
  pieces: PlacedPiece[]
  selectedPieceId: string | null
  activeEndpoint: ResolvedEndpoint | null
  canvasId: string | null
  locationId: string | null
  saveStatus: "saved" | "saving" | "unsaved"
  showCatalog: boolean
  undoStack: PieceAction[]
  redoStack: PieceAction[]

  setPieces: (pieces: PlacedPiece[]) => void
  setCanvasInfo: (canvasId: string, locationId: string) => void
  setSaveStatus: (status: "saved" | "saving" | "unsaved") => void

  placePiece: (piece: PlacedPiece) => void
  removePiece: (pieceId: string) => void
  removePieceWithDownstream: (pieceId: string) => void
  updatePiece: (pieceId: string, updates: Partial<PlacedPiece>) => void

  selectPiece: (pieceId: string | null) => void
  setActiveEndpoint: (endpoint: ResolvedEndpoint | null) => void
  setShowCatalog: (show: boolean) => void

  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  reset: () => void
}

function findDownstream(pieces: PlacedPiece[], rootId: string): PlacedPiece[] {
  const downstream: PlacedPiece[] = []
  const visited = new Set<string>()
  const queue = [rootId]

  while (queue.length > 0) {
    const currentId = queue.shift()!
    if (visited.has(currentId)) continue
    visited.add(currentId)

    const current = pieces.find((p) => p.id === currentId)
    if (!current) continue

    for (const piece of pieces) {
      if (visited.has(piece.id)) continue
      for (const connectedGlobalId of Object.values(piece.connectedEndpoints)) {
        if (connectedGlobalId && connectedGlobalId.startsWith(currentId + ":")) {
          downstream.push(piece)
          queue.push(piece.id)
          break
        }
      }
    }
  }

  return downstream
}

export const usePieceStore = create<PieceStore>((set, get) => ({
  pieces: [],
  selectedPieceId: null,
  activeEndpoint: null,
  canvasId: null,
  locationId: null,
  saveStatus: "saved",
  showCatalog: false,
  undoStack: [],
  redoStack: [],

  setPieces: (pieces) => set({ pieces, undoStack: [], redoStack: [] }),
  setCanvasInfo: (canvasId, locationId) => set({ canvasId, locationId }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),

  placePiece: (piece) => {
    const action: PieceAction = { type: "place", piece }
    set((s) => ({
      pieces: [...s.pieces, piece],
      undoStack: [...s.undoStack.slice(-MAX_UNDO + 1), action],
      redoStack: [],
      saveStatus: "unsaved",
      activeEndpoint: null,
      showCatalog: false,
    }))
  },

  removePiece: (pieceId) => {
    const { pieces } = get()
    const piece = pieces.find((p) => p.id === pieceId)
    if (!piece) return

    const action: PieceAction = { type: "remove", piece, downstream: [] }
    set((s) => ({
      pieces: s.pieces.filter((p) => p.id !== pieceId).map((p) => {
        const updated = { ...p, connectedEndpoints: { ...p.connectedEndpoints } }
        for (const [key, val] of Object.entries(updated.connectedEndpoints)) {
          if (val && val.startsWith(pieceId + ":")) {
            updated.connectedEndpoints[key] = null
          }
        }
        return updated
      }),
      undoStack: [...s.undoStack.slice(-MAX_UNDO + 1), action],
      redoStack: [],
      selectedPieceId: s.selectedPieceId === pieceId ? null : s.selectedPieceId,
      saveStatus: "unsaved",
    }))
  },

  removePieceWithDownstream: (pieceId) => {
    const { pieces } = get()
    const piece = pieces.find((p) => p.id === pieceId)
    if (!piece) return

    const downstream = findDownstream(pieces, pieceId)
    const removeIds = new Set([pieceId, ...downstream.map((p) => p.id)])
    const action: PieceAction = { type: "remove", piece, downstream }

    set((s) => ({
      pieces: s.pieces.filter((p) => !removeIds.has(p.id)).map((p) => {
        const updated = { ...p, connectedEndpoints: { ...p.connectedEndpoints } }
        for (const [key, val] of Object.entries(updated.connectedEndpoints)) {
          if (val) {
            const refPieceId = val.split(":")[0]
            if (removeIds.has(refPieceId)) {
              updated.connectedEndpoints[key] = null
            }
          }
        }
        return updated
      }),
      undoStack: [...s.undoStack.slice(-MAX_UNDO + 1), action],
      redoStack: [],
      selectedPieceId: removeIds.has(s.selectedPieceId ?? "") ? null : s.selectedPieceId,
      saveStatus: "unsaved",
    }))
  },

  updatePiece: (pieceId, updates) => {
    const { pieces } = get()
    const piece = pieces.find((p) => p.id === pieceId)
    if (!piece) return

    const before: Partial<PlacedPiece> = {}
    const after: Partial<PlacedPiece> = {}
    for (const key of Object.keys(updates) as (keyof PlacedPiece)[]) {
      (before as Record<string, unknown>)[key] = piece[key];
      (after as Record<string, unknown>)[key] = updates[key]
    }

    const action: PieceAction = { type: "update", pieceId, before, after }
    set((s) => ({
      pieces: s.pieces.map((p) => (p.id === pieceId ? { ...p, ...updates } : p)),
      undoStack: [...s.undoStack.slice(-MAX_UNDO + 1), action],
      redoStack: [],
      saveStatus: "unsaved",
    }))
  },

  selectPiece: (pieceId) => set({ selectedPieceId: pieceId, activeEndpoint: null, showCatalog: false }),
  setActiveEndpoint: (endpoint) => set({ activeEndpoint: endpoint, selectedPieceId: null }),
  setShowCatalog: (showCatalog) => set({ showCatalog }),

  undo: () => {
    const { undoStack, pieces } = get()
    if (undoStack.length === 0) return

    const action = undoStack[undoStack.length - 1]
    let newPieces = [...pieces]

    if (action.type === "place") {
      newPieces = newPieces.filter((p) => p.id !== action.piece.id).map((p) => {
        const updated = { ...p, connectedEndpoints: { ...p.connectedEndpoints } }
        for (const [key, val] of Object.entries(updated.connectedEndpoints)) {
          if (val && val.startsWith(action.piece.id + ":")) {
            updated.connectedEndpoints[key] = null
          }
        }
        return updated
      })
    } else if (action.type === "remove") {
      newPieces = [...newPieces, action.piece, ...action.downstream]
    } else if (action.type === "update") {
      newPieces = newPieces.map((p) =>
        p.id === action.pieceId ? { ...p, ...action.before } : p
      )
    }

    set((s) => ({
      pieces: newPieces,
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [...s.redoStack, action],
      saveStatus: "unsaved",
    }))
  },

  redo: () => {
    const { redoStack, pieces } = get()
    if (redoStack.length === 0) return

    const action = redoStack[redoStack.length - 1]
    let newPieces = [...pieces]

    if (action.type === "place") {
      newPieces = [...newPieces, action.piece]
    } else if (action.type === "remove") {
      const removeIds = new Set([action.piece.id, ...action.downstream.map((p) => p.id)])
      newPieces = newPieces.filter((p) => !removeIds.has(p.id))
    } else if (action.type === "update") {
      newPieces = newPieces.map((p) =>
        p.id === action.pieceId ? { ...p, ...action.after } : p
      )
    }

    set((s) => ({
      pieces: newPieces,
      undoStack: [...s.undoStack, action],
      redoStack: s.redoStack.slice(0, -1),
      saveStatus: "unsaved",
    }))
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  reset: () => set({
    pieces: [],
    selectedPieceId: null,
    activeEndpoint: null,
    canvasId: null,
    locationId: null,
    saveStatus: "saved",
    showCatalog: false,
    undoStack: [],
    redoStack: [],
  }),
}))
