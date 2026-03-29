"use client";

import { useState, useCallback, useEffect } from "react";
import { useMapStore } from "./use-map-store";
import { updateCanvasEdge } from "@/app/actions/canvas";
import { toast } from "sonner";

interface TrackSection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  trackType: string;
  label: string | null;
  pathData: { waypoints?: { x: number; y: number }[] };
}

interface LocationInfo {
  id: string;
  name: string;
  locationType: string;
}

interface TrackLayoutPropertiesProps {
  edges: TrackSection[];
  nodeMap: Map<string, LocationInfo>;
}

const TRACK_TYPES = ["mainline", "branch", "spur"] as const;

export function TrackLayoutProperties({ edges, nodeMap }: TrackLayoutPropertiesProps) {
  const selectedNodeId = useMapStore((s) => s.selectedNodeId);
  const selectedEdgeId = useMapStore((s) => s.selectedEdgeId);

  const selectedEdge = selectedEdgeId
    ? edges.find((e) => e.id === selectedEdgeId)
    : null;

  const selectedLocation = selectedNodeId
    ? nodeMap.get(selectedNodeId)
    : null;

  if (!selectedEdge && !selectedLocation) {
    return (
      <div className="w-[260px] border-l border-border bg-card p-4 font-mono text-xs">
        <div className="text-foreground font-bold mb-3">Properties</div>
        <div className="text-muted-foreground">
          Select a track section or location to view details.
        </div>
      </div>
    );
  }

  if (selectedLocation) {
    return (
      <div className="w-[260px] border-l border-border bg-card p-4 font-mono text-xs overflow-y-auto">
        <div className="text-foreground font-bold mb-3">Properties</div>

        <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">SELECTED LOCATION</div>
        <div className="text-foreground font-bold mb-3 font-serif italic">
          {selectedLocation.name}
        </div>

        <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">TYPE</div>
        <div className="text-foreground/80 mb-3">{selectedLocation.locationType}</div>
      </div>
    );
  }

  if (selectedEdge) {
    return (
      <TrackSectionEditor
        edge={selectedEdge}
        nodeMap={nodeMap}
      />
    );
  }

  return null;
}

function TrackSectionEditor({
  edge,
  nodeMap,
}: {
  edge: TrackSection;
  nodeMap: Map<string, LocationInfo>;
}) {
  const [trackType, setTrackType] = useState(edge.trackType);
  const [label, setLabel] = useState(edge.label ?? "");
  const [saving, setSaving] = useState(false);

  // Reset local state when selection changes
  useEffect(() => {
    setTrackType(edge.trackType);
    setLabel(edge.label ?? "");
  }, [edge.id, edge.trackType, edge.label]);

  const sourceName = nodeMap.get(edge.sourceNodeId)?.name ?? "Unknown";
  const targetName = nodeMap.get(edge.targetNodeId)?.name ?? "Unknown";
  const waypointCount = edge.pathData.waypoints?.length ?? 0;

  const handleTypeChange = useCallback(
    async (newType: string) => {
      setTrackType(newType);
      setSaving(true);
      const result = await updateCanvasEdge({
        id: edge.id,
        trackType: newType as "mainline" | "branch" | "spur",
      });
      setSaving(false);
      if (result?.error) {
        toast.error(result.error);
        setTrackType(edge.trackType);
      }
    },
    [edge.id, edge.trackType]
  );

  const handleLabelBlur = useCallback(async () => {
    const newLabel = label.trim() || null;
    if (newLabel === (edge.label ?? null)) return;

    setSaving(true);
    const result = await updateCanvasEdge({
      id: edge.id,
      label: newLabel,
    });
    setSaving(false);
    if (result?.error) {
      toast.error(result.error);
      setLabel(edge.label ?? "");
    }
  }, [edge.id, edge.label, label]);

  return (
    <div className="w-[260px] border-l border-border bg-card p-4 font-mono text-xs overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="text-foreground font-bold">Properties</div>
        {saving && (
          <span className="text-muted-foreground text-[10px] tracking-wider">
            saving...
          </span>
        )}
      </div>

      <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">SELECTED TRACK</div>
      <div className="text-foreground font-bold mb-3">
        {sourceName} &rarr; {targetName}
      </div>

      <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">TRACK TYPE</div>
      <div className="flex gap-1 mb-3">
        {TRACK_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => handleTypeChange(type)}
            className={`px-2 py-1 rounded border text-[10px] tracking-wider uppercase transition-colors ${
              trackType === type
                ? "bg-foreground text-background border-foreground"
                : "bg-background text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">ORIGIN</div>
      <div className="text-foreground/80 mb-3">{sourceName}</div>

      <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">DESTINATION</div>
      <div className="text-foreground/80 mb-3">{targetName}</div>

      <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">WAYPOINTS</div>
      <div className="text-foreground/80 mb-3">{waypointCount}</div>

      <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">LABEL</div>
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={handleLabelBlur}
        placeholder="Add label..."
        className="w-full rounded border border-border bg-background px-2 py-1 text-foreground text-xs font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground/20"
      />
    </div>
  );
}
