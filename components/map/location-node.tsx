"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useMapStore } from "./use-map-store";

const TYPE_CONFIG: Record<
  string,
  { icon: string; accent: string }
> = {
  YARD: { icon: "Y", accent: "oklch(0.7991 0.1411 70.3123)" },
  PASSENGER_STATION: { icon: "P", accent: "oklch(0.6261 0.1859 259.5957)" },
  INTERCHANGE: { icon: "X", accent: "oklch(0.8314 0.1385 192.9377)" },
  JUNCTION: { icon: "J", accent: "oklch(0.6406 0.1996 307.0231)" },
  STAGING: { icon: "S", accent: "oklch(0.6261 0.1859 259.5957)" },
  TEAM_TRACK: { icon: "T", accent: "oklch(0.7119 0.0129 286.0684)" },
  SIDING: { icon: "D", accent: "oklch(0.8314 0.1385 192.9377)" },
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
  if (nodeData.yardTracksCount > 0) stats.push(`${nodeData.yardTracksCount}T`);
  if (nodeData.industriesCount > 0) stats.push(`${nodeData.industriesCount}I`);

  return (
    <div
      onClick={handleClick}
      className="rounded-lg border-2 px-3 py-2 font-mono text-xs cursor-pointer transition-all bg-card text-card-foreground"
      style={{
        borderColor: selected || isDrawSource ? "var(--ring)" : config.accent,
        boxShadow: isDrawSource
          ? `0 0 16px ${config.accent}`
          : selected
            ? "0 0 0 2px var(--ring)"
            : "none",
        minWidth: 140,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-2 !h-2" />
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground !w-2 !h-2" />

      <div className="font-bold text-foreground flex items-center gap-1.5">
        <span
          className="inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold"
          style={{ backgroundColor: config.accent, color: "#fff" }}
        >
          {config.icon}
        </span>
        <span>{nodeData.name}</span>
      </div>
      <div className="text-muted-foreground text-[10px] mt-0.5">
        {nodeData.locationType.replace(/_/g, " ")}
        {stats.length > 0 && ` / ${stats.join(" ")}`}
      </div>
    </div>
  );
}

export const LocationNode = memo(LocationNodeComponent);
