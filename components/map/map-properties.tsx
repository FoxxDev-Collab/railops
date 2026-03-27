"use client";

import { useMapStore } from "./use-map-store";
import { useNodes, useEdges } from "@xyflow/react";
import type { LocationNodeData } from "./location-node";
import type { TrackEdgeData } from "./track-edge";
import Link from "next/link";

export function MapProperties({ layoutId }: { layoutId: string }) {
  const selectedNodeId = useMapStore((s) => s.selectedNodeId);
  const selectedEdgeId = useMapStore((s) => s.selectedEdgeId);
  const setDetailLocation = useMapStore((s) => s.setDetailLocation);
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
      <div className="w-[260px] border-l border-slate-700 bg-[#0f172a] p-4 font-mono text-xs">
        <div className="text-slate-200 font-bold mb-3">Properties</div>
        <div className="text-slate-500">Select a location or track to view details.</div>
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
      <div className="w-[260px] border-l border-slate-700 bg-[#0f172a] p-4 font-mono text-xs overflow-y-auto">
        <div className="text-slate-200 font-bold mb-3">Properties</div>

        <div className="text-slate-500 mb-1">SELECTED NODE</div>
        <div className="text-amber-400 font-bold mb-3">{data.name}</div>

        <div className="text-slate-500 mb-1">TYPE</div>
        <div className="text-slate-400 mb-3">{data.locationType}</div>

        {data.yardTracksCount > 0 && (
          <>
            <div className="text-slate-500 mb-1">TRACKS</div>
            <div className="text-slate-400 mb-3">{data.yardTracksCount} tracks</div>
          </>
        )}

        {data.industriesCount > 0 && (
          <>
            <div className="text-slate-500 mb-1">INDUSTRIES</div>
            <div className="text-slate-400 mb-3">{data.industriesCount} industries</div>
          </>
        )}

        {connectedNodes.length > 0 && (
          <>
            <div className="text-slate-500 mb-1">CONNECTIONS</div>
            {connectedNodes.map((cn, i) => (
              <div key={i} className="text-slate-400 mb-0.5">
                → {cn.name} ({cn.trackType})
              </div>
            ))}
          </>
        )}

        <div className="mt-4 pt-4 border-t border-slate-700 space-y-2">
          <button
            onClick={() => setDetailLocation(data.locationId)}
            className="w-full rounded-md bg-purple-600 px-3 py-2 text-center font-bold text-white hover:bg-purple-500 transition-colors"
          >
            View Detail →
          </button>
          <Link
            href={`/dashboard/railroad/${layoutId}/locations/${data.locationId}`}
            className="block w-full rounded-md bg-slate-800 px-3 py-2 text-center text-slate-400 hover:bg-slate-700 transition-colors"
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
      <div className="w-[260px] border-l border-slate-700 bg-[#0f172a] p-4 font-mono text-xs overflow-y-auto">
        <div className="text-slate-200 font-bold mb-3">Properties</div>

        <div className="text-slate-500 mb-1">SELECTED TRACK</div>
        <div className="text-blue-400 font-bold mb-3">
          {sourceName} → {targetName}
        </div>

        <div className="text-slate-500 mb-1">TYPE</div>
        <div className="text-slate-400 mb-3">{data.trackType ?? "mainline"}</div>

        {data.label && (
          <>
            <div className="text-slate-500 mb-1">LABEL</div>
            <div className="text-slate-400 mb-3">{data.label}</div>
          </>
        )}
      </div>
    );
  }

  return null;
}
