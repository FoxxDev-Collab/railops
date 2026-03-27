"use client";

import { useState } from "react";
import { useMapStore } from "./use-map-store";
import { createCanvasNode } from "@/app/actions/canvas";
import { toast } from "sonner";

const LOCATION_TYPES = [
  { value: "YARD", label: "Yard" },
  { value: "PASSENGER_STATION", label: "Passenger Station" },
  { value: "INTERCHANGE", label: "Interchange" },
  { value: "JUNCTION", label: "Junction" },
  { value: "STAGING", label: "Staging" },
  { value: "TEAM_TRACK", label: "Team Track" },
  { value: "SIDING", label: "Siding" },
] as const;

interface AddLocationFormProps {
  layoutId: string;
  position: { x: number; y: number };
  onCreated: (node: {
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
  }) => void;
  onCancel: () => void;
}

export function AddLocationForm({ layoutId, position, onCreated, onCancel }: AddLocationFormProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [locationType, setLocationType] = useState<string>("SIDING");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const setTool = useMapStore((s) => s.setTool);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    setIsSubmitting(true);
    try {
      const result = await createCanvasNode({
        layoutId,
        locationName: name.trim(),
        locationCode: code.trim(),
        locationType: locationType as "YARD" | "PASSENGER_STATION" | "INTERCHANGE" | "JUNCTION" | "STAGING" | "TEAM_TRACK" | "SIDING",
        x: position.x,
        y: position.y,
      });

      if (result.error) {
        toast.error(result.error);
      } else if (result.node) {
        toast.success(`${name} added to map`);
        onCreated(result.node);
        setTool("select");
      }
    } catch {
      toast.error("Failed to create location");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-[260px] border-l border-slate-700 bg-[#0f172a] p-4 font-mono text-xs">
      <div className="text-slate-200 font-bold mb-3">New Location</div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-slate-500 block mb-1">NAME</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Cedar Valley Yard"
            autoFocus
            className="w-full rounded-md border border-slate-600 bg-slate-800 px-2 py-1.5 text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-slate-500 block mb-1">CODE</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="CVY"
            className="w-full rounded-md border border-slate-600 bg-slate-800 px-2 py-1.5 text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-slate-500 block mb-1">TYPE</label>
          <select
            value={locationType}
            onChange={(e) => setLocationType(e.target.value)}
            className="w-full rounded-md border border-slate-600 bg-slate-800 px-2 py-1.5 text-slate-200 focus:border-blue-500 focus:outline-none"
          >
            {LOCATION_TYPES.map((lt) => (
              <option key={lt.value} value={lt.value}>
                {lt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={isSubmitting || !name.trim() || !code.trim()}
            className="flex-1 rounded-md bg-blue-600 px-3 py-2 font-bold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? "Adding..." : "Add"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-md bg-slate-800 px-3 py-2 text-slate-400 hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
