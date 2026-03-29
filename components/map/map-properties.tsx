"use client";

import { useMapStore } from "./use-map-store";
import { useNodes, useEdges } from "@xyflow/react";
import type { LocationNodeData } from "./location-node";
import type { TrackEdgeData } from "./track-edge";
import Link from "next/link";
import { TrackLayoutProperties } from "./track-layout-properties";
import { YardProperties } from "./yard-properties";

interface MapPropertiesWrapperProps {
  layoutId: string;
  activeTab: string;
  edges?: Array<{
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    trackType: string;
    label: string | null;
    pathData: Record<string, unknown>;
  }>;
  nodeMap?: Map<string, { id: string; name: string; locationType: string }>;
}

export function MapPropertiesRouter({ layoutId, activeTab, edges, nodeMap }: MapPropertiesWrapperProps) {
  if (activeTab === "track-layout" && edges && nodeMap) {
    return (
      <TrackLayoutProperties
        edges={edges.map((e) => ({ ...e, pathData: e.pathData as { waypoints?: { x: number; y: number }[] } }))}
        nodeMap={nodeMap}
      />
    );
  }
  if (activeTab === "yard-detail") {
    return <YardProperties />;
  }
  return <MapProperties layoutId={layoutId} />;
}

export function MapProperties({ layoutId }: { layoutId: string }) {
  const selectedNodeId = useMapStore((s) => s.selectedNodeId);
  const selectedEdgeId = useMapStore((s) => s.selectedEdgeId);
  const nodes = useNodes();
  const edges = useEdges();

  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId)
    : null;
  const selectedEdge = selectedEdgeId
    ? edges.find((e) => e.id === selectedEdgeId)
    : null;

  if (!selectedNode && !selectedEdge) {
    return (
      <div className="w-[260px] border-l border-border bg-card p-4 font-mono text-xs">
        <div className="text-foreground font-bold mb-3">Properties</div>
        <div className="text-muted-foreground">Select a location or track to view details.</div>
      </div>
    );
  }

  if (selectedNode) {
    const data = selectedNode.data as LocationNodeData;

    const connectedEdges = edges.filter(
      (e) => e.source === selectedNode.id || e.target === selectedNode.id
    );
    const connectedNodes = connectedEdges.map((e) => {
      const otherId = e.source === selectedNode.id ? e.target : e.source;
      const otherNode = nodes.find((n) => n.id === otherId);
      const otherData = otherNode?.data as LocationNodeData | undefined;
      return {
        name: otherData?.name ?? "Unknown",
        trackType: (e.data as TrackEdgeData)?.trackType ?? "mainline",
      };
    });

    return (
      <div className="w-[260px] border-l border-border bg-card p-4 font-mono text-xs overflow-y-auto">
        <div className="text-foreground font-bold mb-3">Properties</div>

        <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">SELECTED NODE</div>
        <div className="text-foreground font-bold mb-3">{data.name}</div>

        <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">TYPE</div>
        <div className="text-foreground/80 mb-3">{data.locationType}</div>

        {data.yardTracksCount > 0 && (
          <>
            <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">TRACKS</div>
            <div className="text-foreground/80 mb-3">{data.yardTracksCount} tracks</div>
          </>
        )}

        {data.industriesCount > 0 && (
          <>
            <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">INDUSTRIES</div>
            <div className="text-foreground/80 mb-3">{data.industriesCount} industries</div>
          </>
        )}

        {connectedNodes.length > 0 && (
          <>
            <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">CONNECTIONS</div>
            {connectedNodes.map((cn, i) => (
              <div key={i} className="text-foreground/80 mb-0.5">
                → {cn.name} ({cn.trackType})
              </div>
            ))}
          </>
        )}

        <div className="mt-4 pt-4 border-t border-border space-y-2">
          <button
            onClick={() => {
              useMapStore.getState().setYardDetailLocation(data.locationId);
              useMapStore.getState().setActiveTab("yard-detail");
            }}
            className="w-full rounded-md bg-primary px-3 py-2 text-center font-bold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            View Detail →
          </button>
          <Link
            href={`/dashboard/railroad/${layoutId}/locations/${data.locationId}`}
            className="block w-full rounded-md bg-secondary px-3 py-2 text-center text-secondary-foreground hover:bg-accent transition-colors"
          >
            Edit Location
          </Link>
        </div>
      </div>
    );
  }

  if (selectedEdge) {
    const data = (selectedEdge.data ?? {}) as TrackEdgeData;

    const sourceNode = nodes.find((n) => n.id === selectedEdge.source);
    const targetNode = nodes.find((n) => n.id === selectedEdge.target);
    const sourceName = (sourceNode?.data as LocationNodeData)?.name ?? "Unknown";
    const targetName = (targetNode?.data as LocationNodeData)?.name ?? "Unknown";

    return (
      <div className="w-[260px] border-l border-border bg-card p-4 font-mono text-xs overflow-y-auto">
        <div className="text-foreground font-bold mb-3">Properties</div>

        <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">SELECTED TRACK</div>
        <div className="text-foreground font-bold mb-3">
          {sourceName} → {targetName}
        </div>

        <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">TYPE</div>
        <div className="text-foreground/80 mb-3">{data.trackType ?? "mainline"}</div>

        {data.label && (
          <>
            <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">LABEL</div>
            <div className="text-foreground/80 mb-3">{data.label}</div>
          </>
        )}
      </div>
    );
  }

  return null;
}
