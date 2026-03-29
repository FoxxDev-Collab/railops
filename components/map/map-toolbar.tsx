"use client";

import { useMapStore, type Tool } from "./use-map-store";
import { MousePointer2, Plus, Slash, Hand, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { useReactFlow } from "@xyflow/react";

const tools: { id: Tool; icon: typeof MousePointer2; label: string; shortcut: string }[] = [
  { id: "select", icon: MousePointer2, label: "Select", shortcut: "V" },
  { id: "add-location", icon: Plus, label: "Add Location", shortcut: "L" },
  { id: "draw-track", icon: Slash, label: "Draw Track", shortcut: "T" },
  { id: "pan", icon: Hand, label: "Pan", shortcut: "H" },
];

export function MapToolbar() {
  const tool = useMapStore((s) => s.tool);
  const setTool = useMapStore((s) => s.setTool);
  const isFullscreen = useMapStore((s) => s.isFullscreen);
  const toggleFullscreen = useMapStore((s) => s.toggleFullscreen);
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="flex w-14 flex-col items-center border-r border-border bg-card py-3 gap-2">
      {tools.map((t) => (
        <button
          key={t.id}
          onClick={() => setTool(t.id)}
          title={`${t.label} (${t.shortcut})`}
          className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
            tool === t.id
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          }`}
        >
          <t.icon className="h-4 w-4" />
        </button>
      ))}

      <div className="flex-1" />

      <button
        onClick={() => fitView({ padding: 0.2 })}
        title="Fit to content (Ctrl+0)"
        className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        <Maximize className="h-4 w-4" />
      </button>
      <button
        onClick={() => zoomIn()}
        title="Zoom in (+)"
        className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        <ZoomIn className="h-4 w-4" />
      </button>
      <button
        onClick={() => zoomOut()}
        title="Zoom out (-)"
        className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        <ZoomOut className="h-4 w-4" />
      </button>
      <button
        onClick={toggleFullscreen}
        title="Toggle fullscreen"
        className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
          isFullscreen
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        }`}
      >
        <Maximize className="h-4 w-4" />
      </button>
    </div>
  );
}
