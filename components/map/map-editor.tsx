"use client";

import { useCallback, useEffect, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { MapCanvas } from "./map-canvas";
import { MapToolbar } from "./map-toolbar";
import { MapProperties } from "./map-properties";
import { AddLocationForm } from "./add-location-form";
import { LocationDetailView } from "./location-detail-view";
import { SessionOverlay } from "./session-overlay";
import { useMapStore } from "./use-map-store";
import { deleteCanvasElement } from "@/app/actions/canvas";
import { toast } from "sonner";

interface CanvasData {
  id: string;
  layoutId: string;
  viewport: { x: number; y: number; zoom: number };
  gridSize: number;
  nodes: Array<{
    id: string;
    locationId: string;
    x: number;
    y: number;
    location: {
      name: string;
      locationType: string;
      industries: { id: string; name: string }[];
      yardTracks: { id: string; name: string; trackType: string }[];
    };
  }>;
  edges: Array<{
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    trackType: string;
    label: string | null;
  }>;
}

interface MapEditorProps {
  canvasData: CanvasData;
  layoutId: string;
  activeSessionId?: string | null;
  isDispatcher?: boolean;
  initialView?: "overview" | "detail";
  initialDetailLocationId?: string | null;
}

function MapEditorInner({ canvasData, layoutId, activeSessionId, isDispatcher, initialView, initialDetailLocationId }: MapEditorProps) {
  const tool = useMapStore((s) => s.tool);
  const setTool = useMapStore((s) => s.setTool);
  const isFullscreen = useMapStore((s) => s.isFullscreen);
  const saveStatus = useMapStore((s) => s.saveStatus);
  const detailLocationId = useMapStore((s) => s.detailLocationId);
  const setDetailLocation = useMapStore((s) => s.setDetailLocation);
  const [addLocationPos, setAddLocationPos] = useState<{ x: number; y: number } | null>(null);

  const detailNode = detailLocationId
    ? canvasData.nodes.find((n) => n.locationId === detailLocationId)
    : null;

  // Handle initial view from query params
  useEffect(() => {
    if (initialView === "detail" && initialDetailLocationId) {
      setDetailLocation(initialDetailLocationId);
    }
  }, [initialView, initialDetailLocationId, setDetailLocation]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "v":
          setTool("select");
          break;
        case "l":
          setTool("add-location");
          break;
        case "t":
          setTool("draw-track");
          break;
        case "h":
          setTool("pan");
          break;
        case "escape":
          setTool("select");
          setAddLocationPos(null);
          break;
        case "delete":
        case "backspace":
          handleDelete();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setTool]);

  const handleDelete = useCallback(async () => {
    const { selectedNodeId, selectedEdgeId, clearSelection, pushUndo } = useMapStore.getState();

    const type = selectedNodeId ? "node" : "edge";
    const id = selectedNodeId ?? selectedEdgeId;
    if (!id) return;

    const result = await deleteCanvasElement({ type, id });
    if (result.error) {
      toast.error(result.error);
    } else {
      pushUndo({ type: type === "node" ? "delete-node" : "delete-edge", data: { id } });
      clearSelection();
      toast.success(`${type === "node" ? "Location" : "Track"} deleted`);
    }
  }, []);

  const handleLocationCreated = useCallback(() => {
    setAddLocationPos(null);
  }, []);

  return (
    <div className={`flex h-full ${isFullscreen ? "fixed inset-0 z-50" : ""}`}>
      <MapToolbar />
      {detailNode ? (
        <div className="relative flex-1">
          <LocationDetailView
            locationId={detailNode.locationId}
            locationName={detailNode.location.name}
            locationType={detailNode.location.locationType}
            yardTracks={detailNode.location.yardTracks.map((t) => ({
              ...t,
              capacity: undefined,
            }))}
            industries={detailNode.location.industries}
          />
        </div>
      ) : (
        <div className="relative flex-1">
          <MapCanvas canvasData={canvasData} onAddLocation={setAddLocationPos} />

          {activeSessionId && (
            <SessionOverlay
              sessionId={activeSessionId}
              isDispatcher={isDispatcher ?? false}
            />
          )}

          {/* Save status indicator */}
          <div className="absolute top-3 right-3 z-10 rounded-md border border-slate-700 bg-[#0f172a] px-2.5 py-1 font-mono text-xs">
            {saveStatus === "saved" && <span className="text-green-400">✓ Saved</span>}
            {saveStatus === "saving" && <span className="text-amber-400">Saving...</span>}
            {saveStatus === "unsaved" && <span className="text-slate-400">Unsaved</span>}
          </div>

          {/* Tool hint */}
          {tool === "add-location" && !addLocationPos && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 rounded-md bg-blue-600 px-3 py-1.5 font-mono text-xs text-white shadow-lg">
              Click on the canvas to place a new location
            </div>
          )}
          {tool === "draw-track" && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 rounded-md bg-blue-600 px-3 py-1.5 font-mono text-xs text-white shadow-lg">
              Click a location to start, then click another to connect
            </div>
          )}
        </div>
      )}

      {addLocationPos ? (
        <AddLocationForm
          layoutId={layoutId}
          position={addLocationPos}
          onCreated={handleLocationCreated}
          onCancel={() => setAddLocationPos(null)}
        />
      ) : (
        <MapProperties layoutId={layoutId} />
      )}
    </div>
  );
}

export function MapEditor(props: MapEditorProps) {
  return (
    <ReactFlowProvider>
      <MapEditorInner {...props} />
    </ReactFlowProvider>
  );
}
