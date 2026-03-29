import { create } from "zustand";

export type Tool = "select" | "add-location" | "draw-track" | "pan" | "add-turnout" | "add-industry";

export type MapTab = "locations" | "track-layout" | "yard-detail";

interface UndoEntry {
  type: "move" | "add-node" | "delete-node" | "add-edge" | "delete-edge";
  data: Record<string, unknown>;
}

interface MapStore {
  tool: Tool;
  setTool: (tool: Tool) => void;

  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  clearSelection: () => void;

  drawSourceNodeId: string | null;
  setDrawSource: (id: string | null) => void;

  detailLocationId: string | null;
  setDetailLocation: (id: string | null) => void;

  isFullscreen: boolean;
  toggleFullscreen: () => void;

  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
  pushUndo: (entry: UndoEntry) => void;
  undo: () => UndoEntry | undefined;
  redo: () => UndoEntry | undefined;

  activeTab: MapTab;
  setActiveTab: (tab: MapTab) => void;
  yardDetailLocationId: string | null;
  setYardDetailLocation: (id: string | null) => void;

  saveStatus: "saved" | "saving" | "unsaved";
  setSaveStatus: (status: "saved" | "saving" | "unsaved") => void;
}

export const useMapStore = create<MapStore>((set, get) => ({
  tool: "select",
  setTool: (tool) => set({ tool, drawSourceNodeId: null }),

  selectedNodeId: null,
  selectedEdgeId: null,
  selectNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  selectEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
  clearSelection: () => set({ selectedNodeId: null, selectedEdgeId: null }),

  drawSourceNodeId: null,
  setDrawSource: (id) => set({ drawSourceNodeId: id }),

  detailLocationId: null,
  setDetailLocation: (id) => set({ detailLocationId: id }),

  isFullscreen: false,
  toggleFullscreen: () => set((s) => ({ isFullscreen: !s.isFullscreen })),

  undoStack: [],
  redoStack: [],
  pushUndo: (entry) =>
    set((s) => ({
      undoStack: [...s.undoStack.slice(-49), entry],
      redoStack: [],
    })),
  undo: () => {
    const { undoStack } = get();
    if (undoStack.length === 0) return undefined;
    const entry = undoStack[undoStack.length - 1];
    set((s) => ({
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [...s.redoStack, entry],
    }));
    return entry;
  },
  redo: () => {
    const { redoStack } = get();
    if (redoStack.length === 0) return undefined;
    const entry = redoStack[redoStack.length - 1];
    set((s) => ({
      redoStack: s.redoStack.slice(0, -1),
      undoStack: [...s.undoStack, entry],
    }));
    return entry;
  },

  activeTab: "locations",
  setActiveTab: (tab) => set({ activeTab: tab, tool: "select", drawSourceNodeId: null }),
  yardDetailLocationId: null,
  setYardDetailLocation: (id) => set({ yardDetailLocationId: id }),

  saveStatus: "saved",
  setSaveStatus: (status) => set({ saveStatus: status }),
}));
