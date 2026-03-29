import { create } from "zustand";

export type YardTool = "select" | "draw-track" | "add-turnout" | "add-industry" | "pan";

export interface TrackElement {
  id: string;
  type: "track";
  yardTrackId?: string;
  points: { x: number; y: number }[];
  trackType: string;
  name?: string;
  capacity?: number;
  length?: number;
}

export interface TurnoutElement {
  id: string;
  type: "turnout";
  parentTrackId: string;
  position: { x: number; y: number };
}

export interface IndustryElement {
  id: string;
  type: "industry";
  industryId?: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  connectedTrackId?: string;
  name?: string;
  spotCount?: number;
}

export type YardElement = TrackElement | TurnoutElement | IndustryElement;

interface YardStore {
  elements: YardElement[];
  setElements: (elements: YardElement[]) => void;
  addElement: (element: YardElement) => void;
  updateElement: (id: string, updates: Partial<YardElement>) => void;
  removeElement: (id: string) => void;

  selectedElementId: string | null;
  selectElement: (id: string | null) => void;

  canvasId: string | null;
  setCanvasId: (id: string | null) => void;

  locationId: string | null;
  setLocationId: (id: string | null) => void;

  drawingPoints: { x: number; y: number }[];
  setDrawingPoints: (points: { x: number; y: number }[]) => void;
  addDrawingPoint: (point: { x: number; y: number }) => void;
  clearDrawing: () => void;

  saveStatus: "saved" | "saving" | "unsaved";
  setSaveStatus: (status: "saved" | "saving" | "unsaved") => void;
}

export const useYardStore = create<YardStore>((set) => ({
  elements: [],
  setElements: (elements) => set({ elements }),
  addElement: (element) =>
    set((state) => ({ elements: [...state.elements, element] })),
  updateElement: (id, updates) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? ({ ...el, ...updates } as YardElement) : el
      ),
    })),
  removeElement: (id) =>
    set((state) => ({
      elements: state.elements.filter((el) => {
        if (el.id === id) return false;
        if (el.type === "turnout" && el.parentTrackId === id) return false;
        return true;
      }),
      selectedElementId: state.selectedElementId === id ? null : state.selectedElementId,
    })),

  selectedElementId: null,
  selectElement: (id) => set({ selectedElementId: id }),

  canvasId: null,
  setCanvasId: (id) => set({ canvasId: id }),

  locationId: null,
  setLocationId: (id) => set({ locationId: id }),

  drawingPoints: [],
  setDrawingPoints: (points) => set({ drawingPoints: points }),
  addDrawingPoint: (point) =>
    set((state) => ({ drawingPoints: [...state.drawingPoints, point] })),
  clearDrawing: () => set({ drawingPoints: [] }),

  saveStatus: "saved",
  setSaveStatus: (status) => set({ saveStatus: status }),
}));
