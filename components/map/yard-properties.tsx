"use client";

import { useYardStore } from "./use-yard-store";
import { updateYardElement, deleteYardElement } from "@/app/actions/yard-canvas";
import { YARD_TRACK_COLORS } from "./svg/topo-colors";
import { useTransition, useState, useEffect } from "react";

import type { TrackElement, TurnoutElement, IndustryElement } from "./use-yard-store";

const TRACK_TYPE_LABELS: Record<string, string> = {
  ARRIVAL: "ARR",
  CLASSIFICATION: "CLS",
  DEPARTURE: "DEP",
  LEAD: "LEAD",
  ENGINE_SERVICE: "ENG",
  RIP: "RIP",
  CABOOSE: "CAB",
  RUNAROUND: "RUN",
  SWITCHER_POCKET: "SWP",
};

function TrackProperties({ element }: { element: TrackElement }) {
  const canvasId = useYardStore((s) => s.canvasId);
  const locationId = useYardStore((s) => s.locationId);
  const updateElement = useYardStore((s) => s.updateElement);
  const removeElement = useYardStore((s) => s.removeElement);
  const selectElement = useYardStore((s) => s.selectElement);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(element.name ?? "");
  const [capacity, setCapacity] = useState(element.capacity ?? 0);

  useEffect(() => {
    setName(element.name ?? "");
    setCapacity(element.capacity ?? 0);
  }, [element.id, element.name, element.capacity]);

  function save(updates: Record<string, unknown>) {
    if (!canvasId) return;
    updateElement(element.id, updates as Partial<TrackElement>);
    startTransition(async () => {
      await updateYardElement({
        locationId: locationId!,
        canvasId: canvasId!,
        elementId: element.id,
        updates,
      });
    });
  }

  function handleDelete() {
    if (!canvasId) return;
    removeElement(element.id);
    selectElement(null);
    startTransition(async () => {
      await deleteYardElement({
        locationId: locationId!,
        canvasId: canvasId!,
        elementId: element.id,
      });
    });
  }

  return (
    <>
      <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">SELECTED TRACK</div>
      <div className="text-foreground font-bold mb-3">{element.name || "Unnamed Track"}</div>

      <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">TRACK TYPE</div>
      <div className="flex flex-wrap gap-1 mb-3">
        {Object.entries(TRACK_TYPE_LABELS).map(([type, label]) => (
          <button
            key={type}
            disabled={isPending}
            onClick={() => save({ trackType: type })}
            className={`rounded border px-1.5 py-0.5 text-[10px] font-bold transition-colors ${
              element.trackType === type
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
            title={YARD_TRACK_COLORS[type]?.label ?? type}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">NAME</div>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          if (name !== (element.name ?? "")) save({ name });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
        className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground mb-3 focus:outline-none focus:ring-1 focus:ring-ring"
        placeholder="Track name"
      />

      <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">CAPACITY</div>
      <input
        type="number"
        min={0}
        value={capacity}
        onChange={(e) => setCapacity(parseInt(e.target.value) || 0)}
        onBlur={() => {
          if (capacity !== (element.capacity ?? 0)) save({ capacity });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
        className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground mb-3 focus:outline-none focus:ring-1 focus:ring-ring"
      />

      <button
        onClick={handleDelete}
        disabled={isPending}
        className="w-full rounded bg-destructive px-3 py-1.5 text-xs font-bold text-destructive-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        Delete Track
      </button>
    </>
  );
}

function TurnoutProperties({ element }: { element: TurnoutElement }) {
  const canvasId = useYardStore((s) => s.canvasId);
  const locationId = useYardStore((s) => s.locationId);
  const elements = useYardStore((s) => s.elements);
  const removeElement = useYardStore((s) => s.removeElement);
  const selectElement = useYardStore((s) => s.selectElement);
  const [isPending, startTransition] = useTransition();

  const parentTrack = elements.find((el) => el.id === element.parentTrackId);
  const parentName = parentTrack?.type === "track" ? (parentTrack.name || "Unnamed Track") : "Unknown";

  function handleDelete() {
    if (!canvasId) return;
    removeElement(element.id);
    selectElement(null);
    startTransition(async () => {
      await deleteYardElement({
        locationId: locationId!,
        canvasId: canvasId!,
        elementId: element.id,
      });
    });
  }

  return (
    <>
      <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">SELECTED TURNOUT</div>
      <div className="text-foreground font-bold mb-3">Turnout</div>

      <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">POSITION</div>
      <div className="text-foreground/80 mb-3">
        {Math.round(element.position.x)}, {Math.round(element.position.y)}
      </div>

      <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">PARENT TRACK</div>
      <div className="text-foreground/80 mb-3">{parentName}</div>

      <button
        onClick={handleDelete}
        disabled={isPending}
        className="w-full rounded bg-destructive px-3 py-1.5 text-xs font-bold text-destructive-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        Delete Turnout
      </button>
    </>
  );
}

function IndustryProperties({ element }: { element: IndustryElement }) {
  const canvasId = useYardStore((s) => s.canvasId);
  const locationId = useYardStore((s) => s.locationId);
  const updateElement = useYardStore((s) => s.updateElement);
  const removeElement = useYardStore((s) => s.removeElement);
  const selectElement = useYardStore((s) => s.selectElement);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(element.name ?? "");
  const [spotCount, setSpotCount] = useState(element.spotCount ?? 1);

  useEffect(() => {
    setName(element.name ?? "");
    setSpotCount(element.spotCount ?? 1);
  }, [element.id, element.name, element.spotCount]);

  function save(updates: Record<string, unknown>) {
    if (!canvasId) return;
    updateElement(element.id, updates as Partial<IndustryElement>);
    startTransition(async () => {
      await updateYardElement({
        locationId: locationId!,
        canvasId: canvasId!,
        elementId: element.id,
        updates,
      });
    });
  }

  function handleDelete() {
    if (!canvasId) return;
    removeElement(element.id);
    selectElement(null);
    startTransition(async () => {
      await deleteYardElement({
        locationId: locationId!,
        canvasId: canvasId!,
        elementId: element.id,
      });
    });
  }

  return (
    <>
      <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">SELECTED INDUSTRY</div>
      <div className="text-foreground font-bold mb-3">{element.name || "Unnamed Industry"}</div>

      <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">NAME</div>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          if (name !== (element.name ?? "")) save({ name });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
        className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground mb-3 focus:outline-none focus:ring-1 focus:ring-ring"
        placeholder="Industry name"
      />

      <div className="text-muted-foreground mb-1 tracking-wider text-[10px]">SPOT COUNT</div>
      <input
        type="number"
        min={1}
        value={spotCount}
        onChange={(e) => setSpotCount(parseInt(e.target.value) || 1)}
        onBlur={() => {
          if (spotCount !== (element.spotCount ?? 1)) save({ spotCount });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
        className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground mb-3 focus:outline-none focus:ring-1 focus:ring-ring"
      />

      <button
        onClick={handleDelete}
        disabled={isPending}
        className="w-full rounded bg-destructive px-3 py-1.5 text-xs font-bold text-destructive-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        Delete Industry
      </button>
    </>
  );
}

export function YardProperties() {
  const selectedElementId = useYardStore((s) => s.selectedElementId);
  const elements = useYardStore((s) => s.elements);

  const selectedElement = selectedElementId
    ? elements.find((el) => el.id === selectedElementId)
    : null;

  return (
    <div className="w-[260px] border-l border-border bg-card p-4 font-mono text-xs overflow-y-auto">
      <div className="text-foreground font-bold mb-3">Properties</div>

      {!selectedElement && (
        <div className="text-muted-foreground">
          Select a track, turnout, or industry to view details.
        </div>
      )}

      {selectedElement?.type === "track" && (
        <TrackProperties element={selectedElement} />
      )}

      {selectedElement?.type === "turnout" && (
        <TurnoutProperties element={selectedElement} />
      )}

      {selectedElement?.type === "industry" && (
        <IndustryProperties element={selectedElement} />
      )}
    </div>
  );
}
