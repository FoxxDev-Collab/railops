"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { MapCanvas, type MapCanvasHandle } from "./map-canvas";
import { MapToolbar } from "./map-toolbar";
import { MapProperties } from "./map-properties";
import { AddLocationForm } from "./add-location-form";
import { MapTabBar } from "./map-tab-bar";
import { TrackLayoutCanvas } from "./track-layout-canvas";
import { SessionOverlay } from "./session-overlay";
import { useMapStore } from "./use-map-store";
import { deleteCanvasElement } from "@/app/actions/canvas";
import { toast } from "sonner";
import type { LocationNodeData } from "./location-node";

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
    pathData: Record<string, unknown>;
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
  const activeTab = useMapStore((s) => s.activeTab);
  const [addLocationPos, setAddLocationPos] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<MapCanvasHandle>(null);

  // Build locations list for tab bar
  const locationsList = useMemo(
    () =>
      canvasData.nodes.map((n) => ({
        id: n.locationId,
        name: n.location.name,
        locationType: n.location.locationType,
      })),
    [canvasData.nodes]
  );

  // Handle initial view from query params
  useEffect(() => {
    if (initialView === "detail" && initialDetailLocationId) {
      const setYardDetailLocation = useMapStore.getState().setYardDetailLocation;
      const setActiveTab = useMapStore.getState().setActiveTab;
      setYardDetailLocation(initialDetailLocationId);
      setActiveTab("yard-detail");
    }
  }, [initialView, initialDetailLocationId]);

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

      const currentTab = useMapStore.getState().activeTab;

      switch (e.key.toLowerCase()) {
        case "v":
          setTool("select");
          break;
        case "l":
          if (currentTab === "locations") {
            setTool("add-location");
          }
          break;
        case "t":
          setTool("draw-track");
          break;
        case "h":
          setTool("pan");
          break;
        case "f":
          if (currentTab === "yard-detail") {
            setTool("add-turnout");
          }
          break;
        case "i":
          if (currentTab === "yard-detail") {
            setTool("add-industry");
          }
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

  const handleLocationCreated = useCallback((node: {
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
  }) => {
    canvasRef.current?.addNode({
      id: node.id,
      type: "location",
      position: { x: node.x, y: node.y },
      data: {
        locationId: node.locationId,
        name: node.location.name,
        locationType: node.location.locationType,
        industriesCount: node.location.industries.length,
        yardTracksCount: node.location.yardTracks.length,
      } satisfies LocationNodeData,
    });

    canvasData.nodes.push(node);

    useMapStore.getState().pushUndo({ type: "add-node", data: { nodeId: node.id } });
    setAddLocationPos(null);
  }, [canvasData]);

  return (
    <div className={`flex flex-col h-full ${isFullscreen ? "fixed inset-0 z-50" : ""}`}>
      <MapTabBar locations={locationsList} saveStatus={saveStatus} />
      <div className="flex flex-1 min-h-0">
        <MapToolbar />
        <div className="relative flex-1">
          {activeTab === "locations" && (
            <>
              <MapCanvas ref={canvasRef} canvasData={canvasData} onAddLocation={setAddLocationPos} />

              {activeSessionId && (
                <SessionOverlay
                  sessionId={activeSessionId}
                  isDispatcher={isDispatcher ?? false}
                />
              )}

              {/* Tool hint */}
              {tool === "add-location" && !addLocationPos && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 rounded-md bg-primary px-3 py-1.5 font-mono text-xs text-primary-foreground shadow-lg">
                  Click on the canvas to place a new location
                </div>
              )}
              {tool === "draw-track" && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 rounded-md bg-primary px-3 py-1.5 font-mono text-xs text-primary-foreground shadow-lg">
                  Click a location to start, then click another to connect
                </div>
              )}
            </>
          )}

          {activeTab === "track-layout" && (
            <TrackLayoutCanvas
              canvasId={canvasData.id}
              nodes={canvasData.nodes}
              edges={canvasData.edges.map((e) => ({
                ...e,
                pathData: (e.pathData ?? {}) as { waypoints?: { x: number; y: number }[] } & Record<string, unknown>,
              }))}
              gridSize={canvasData.gridSize}
            />
          )}

          {activeTab === "yard-detail" && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="font-mono text-sm text-muted-foreground">Yard Detail</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground/60">Select a location to view yard details</p>
              </div>
            </div>
          )}
        </div>

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
