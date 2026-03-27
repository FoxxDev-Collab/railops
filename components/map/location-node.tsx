"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useMapStore } from "./use-map-store";

const TYPE_CONFIG: Record<
  string,
  { color: string; icon: string; borderColor: string }
> = {
  YARD: { color: "#78350f", icon: "🏗️", borderColor: "#f59e0b" },
  PASSENGER_STATION: { color: "#312e81", icon: "🚉", borderColor: "#8b5cf6" },
  INTERCHANGE: { color: "#064e3b", icon: "↔", borderColor: "#10b981" },
  JUNCTION: { color: "#831843", icon: "⑂", borderColor: "#ec4899" },
  STAGING: { color: "#1e3a5f", icon: "🔀", borderColor: "#3b82f6" },
  TEAM_TRACK: { color: "#3f3f46", icon: "📦", borderColor: "#a1a1aa" },
  SIDING: { color: "#365314", icon: "🏭", borderColor: "#22c55e" },
};

export interface LocationNodeData {
  locationId: string;
  name: string;
  locationType: string;
  industriesCount: number;
  yardTracksCount: number;
  [key: string]: unknown;
}

function LocationNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as LocationNodeData;
  const config = TYPE_CONFIG[nodeData.locationType] ?? TYPE_CONFIG.SIDING;
  const tool = useMapStore((s) => s.tool);
  const drawSourceNodeId = useMapStore((s) => s.drawSourceNodeId);
  const setDrawSource = useMapStore((s) => s.setDrawSource);
  const selectNode = useMapStore((s) => s.selectNode);

  const isDrawSource = drawSourceNodeId === id;

  const handleClick = () => {
    if (tool === "draw-track") {
      if (!drawSourceNodeId) {
        setDrawSource(id);
      }
    } else {
      selectNode(id);
    }
  };

  const stats: string[] = [];
  if (nodeData.yardTracksCount > 0) stats.push(`${nodeData.yardTracksCount} tracks`);
  if (nodeData.industriesCount > 0) stats.push(`${nodeData.industriesCount} industries`);

  return (
    <div
      onClick={handleClick}
      className="rounded-lg border-2 px-3 py-2 font-mono text-xs cursor-pointer transition-shadow"
      style={{
        backgroundColor: "#1e293b",
        borderColor: selected || isDrawSource ? "#ffffff" : config.borderColor,
        boxShadow: isDrawSource ? `0 0 12px ${config.borderColor}` : undefined,
        minWidth: 140,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-500 !w-2 !h-2" />
      <Handle type="target" position={Position.Left} className="!bg-slate-500 !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} className="!bg-slate-500 !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-slate-500 !w-2 !h-2" />

      <div className="font-bold text-slate-100 flex items-center gap-1.5">
        <span>{config.icon}</span>
        <span>{nodeData.name}</span>
      </div>
      <div className="text-slate-500 text-[10px] mt-0.5">
        {nodeData.locationType}
        {stats.length > 0 && ` • ${stats.join(", ")}`}
      </div>
    </div>
  );
}

export const LocationNode = memo(LocationNodeComponent);
