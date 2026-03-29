"use client";

import { memo } from "react";
import {
  BaseEdge,
  getBezierPath,
  EdgeLabelRenderer,
  type EdgeProps,
} from "@xyflow/react";

const TRACK_STYLES: Record<string, { strokeWidth: number; strokeDasharray?: string }> = {
  mainline: { strokeWidth: 3 },
  branch: { strokeWidth: 2, strokeDasharray: "6,4" },
  spur: { strokeWidth: 1.5, strokeDasharray: "3,3" },
};

export interface TrackEdgeData {
  trackType: string;
  label?: string;
  [key: string]: unknown;
}

function TrackEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps) {
  const edgeData = (data ?? {}) as TrackEdgeData;
  const trackStyle = TRACK_STYLES[edgeData.trackType] ?? TRACK_STYLES.mainline;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? "var(--ring)" : "var(--muted-foreground)",
          strokeWidth: trackStyle.strokeWidth,
          strokeDasharray: trackStyle.strokeDasharray,
          strokeLinecap: "round",
          opacity: selected ? 1 : 0.6,
        }}
      />
      {edgeData.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="bg-card/90 text-muted-foreground text-[10px] font-mono px-1.5 py-0.5 rounded border border-border"
          >
            {edgeData.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const TrackEdge = memo(TrackEdgeComponent);
