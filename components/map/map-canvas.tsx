"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type OnConnect,
  type OnNodeDrag,
  type OnSelectionChangeFunc,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { LocationNode, type LocationNodeData } from "./location-node";
import { TrackEdge, type TrackEdgeData } from "./track-edge";
import { useMapStore } from "./use-map-store";
import { useAutoSave } from "./use-auto-save";
import { createCanvasEdge } from "@/app/actions/canvas";

const nodeTypes = { location: LocationNode };
const edgeTypes = { track: TrackEdge };

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

interface MapCanvasProps {
  canvasData: CanvasData;
  onAddLocation?: (position: { x: number; y: number }) => void;
}

export function MapCanvas({ canvasData, onAddLocation }: MapCanvasProps) {
  const tool = useMapStore((s) => s.tool);
  const setDrawSource = useMapStore((s) => s.setDrawSource);
  const selectNode = useMapStore((s) => s.selectNode);
  const selectEdge = useMapStore((s) => s.selectEdge);
  const clearSelection = useMapStore((s) => s.clearSelection);
  const pushUndo = useMapStore((s) => s.pushUndo);
  const { queueSave } = useAutoSave(canvasData.id);

  const initialNodes: Node[] = useMemo(
    () =>
      canvasData.nodes.map((n) => ({
        id: n.id,
        type: "location",
        position: { x: n.x, y: n.y },
        data: {
          locationId: n.locationId,
          name: n.location.name,
          locationType: n.location.locationType,
          industriesCount: n.location.industries.length,
          yardTracksCount: n.location.yardTracks.length,
        } satisfies LocationNodeData,
      })),
    [canvasData.nodes]
  );

  const initialEdges: Edge[] = useMemo(
    () =>
      canvasData.edges.map((e) => ({
        id: e.id,
        type: "track",
        source: e.sourceNodeId,
        target: e.targetNodeId,
        data: {
          trackType: e.trackType,
          label: e.label ?? undefined,
        } satisfies TrackEdgeData,
      })),
    [canvasData.edges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_event, node) => {
      const gridSize = canvasData.gridSize;
      const snappedX = Math.round(node.position.x / gridSize) * gridSize;
      const snappedY = Math.round(node.position.y / gridSize) * gridSize;

      setNodes((nds) =>
        nds.map((n) =>
          n.id === node.id ? { ...n, position: { x: snappedX, y: snappedY } } : n
        )
      );

      pushUndo({
        type: "move",
        data: { nodeId: node.id, x: snappedX, y: snappedY },
      });

      queueSave({
        nodePositions: [{ id: node.id, x: snappedX, y: snappedY }],
      });
    },
    [canvasData.gridSize, setNodes, pushUndo, queueSave]
  );

  const onConnect: OnConnect = useCallback(
    async (connection) => {
      if (!connection.source || !connection.target) return;

      const result = await createCanvasEdge({
        canvasId: canvasData.id,
        sourceNodeId: connection.source,
        targetNodeId: connection.target,
        trackType: "mainline",
      });

      if (result.success && result.edge) {
        setEdges((eds) => [
          ...eds,
          {
            id: result.edge.id,
            type: "track",
            source: result.edge.sourceNodeId,
            target: result.edge.targetNodeId,
            data: {
              trackType: result.edge.trackType,
              label: result.edge.label ?? undefined,
            },
          },
        ]);
        pushUndo({ type: "add-edge", data: { edgeId: result.edge.id } });
      }

      setDrawSource(null);
    },
    [canvasData.id, setEdges, pushUndo, setDrawSource]
  );

  const onSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }) => {
      if (selectedNodes.length > 0) {
        selectNode(selectedNodes[0].id);
      } else if (selectedEdges.length > 0) {
        selectEdge(selectedEdges[0].id);
      } else {
        clearSelection();
      }
    },
    [selectNode, selectEdge, clearSelection]
  );

  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (tool === "add-location" && onAddLocation) {
        // screenToFlowPosition would be ideal here but we need the ReactFlow instance
        // This will be wired up in the map editor component
        const target = event.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const gridSize = canvasData.gridSize;
        const snappedX = Math.round(x / gridSize) * gridSize;
        const snappedY = Math.round(y / gridSize) * gridSize;
        onAddLocation({ x: snappedX, y: snappedY });
      } else {
        clearSelection();
        setDrawSource(null);
      }
    },
    [tool, onAddLocation, canvasData.gridSize, clearSelection, setDrawSource]
  );

  const viewport = canvasData.viewport as { x: number; y: number; zoom: number };

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeDragStop={onNodeDragStop}
      onConnect={onConnect}
      onSelectionChange={onSelectionChange}
      onPaneClick={onPaneClick}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      defaultViewport={viewport}
      snapToGrid={true}
      snapGrid={[canvasData.gridSize, canvasData.gridSize]}
      fitView={canvasData.nodes.length > 0}
      panOnDrag={tool === "pan" || tool === "select"}
      selectionOnDrag={false}
      className="!bg-[#0a0f1a]"
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={canvasData.gridSize}
        size={1}
        color="#1e293b"
      />
      <MiniMap
        nodeColor="#1e293b"
        maskColor="rgba(0,0,0,0.7)"
        className="!bg-[#0f172a] !border-slate-700"
      />
    </ReactFlow>
  );
}
