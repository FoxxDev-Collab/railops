"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Pencil, Check, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { updateLocationPins } from "@/app/actions/track-plan";

interface LocationPin {
  id: string;
  name: string;
  code: string;
  pinX: number | null;
  pinY: number | null;
}

interface TrackPlanViewerProps {
  layoutId: string;
  imageUrl: string;
  locations: LocationPin[];
}

export function TrackPlanViewer({
  layoutId,
  imageUrl,
  locations,
}: TrackPlanViewerProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [pins, setPins] = useState<LocationPin[]>(locations);
  const [pendingClick, setPendingClick] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const pinnedLocations = pins.filter((l) => l.pinX !== null && l.pinY !== null);
  const unpinnedLocations = pins.filter((l) => l.pinX === null || l.pinY === null);

  const getRelativeCoords = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  const handleImageClick = (e: React.MouseEvent) => {
    if (!editing || dragging) return;
    const coords = getRelativeCoords(e);
    if (!coords) return;

    if (unpinnedLocations.length === 0) {
      toast.info("All locations are pinned");
      return;
    }

    setPendingClick(coords);
  };

  const assignLocation = (locationId: string) => {
    if (!pendingClick) return;
    setPins((prev) =>
      prev.map((l) =>
        l.id === locationId
          ? { ...l, pinX: pendingClick.x, pinY: pendingClick.y }
          : l
      )
    );
    setPendingClick(null);
  };

  const removePin = (locationId: string) => {
    setPins((prev) =>
      prev.map((l) =>
        l.id === locationId ? { ...l, pinX: null, pinY: null } : l
      )
    );
  };

  const handleDragStart = (locationId: string) => {
    if (!editing) return;
    setDragging(locationId);
  };

  const handleDragMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !editing) return;
      const coords = getRelativeCoords(e);
      if (!coords) return;
      setPins((prev) =>
        prev.map((l) =>
          l.id === dragging ? { ...l, pinX: coords.x, pinY: coords.y } : l
        )
      );
    },
    [dragging, editing]
  );

  const handleDragEnd = () => {
    setDragging(null);
  };

  const handleSave = async () => {
    const pinData = pins.map((l) => ({
      locationId: l.id,
      pinX: l.pinX,
      pinY: l.pinY,
    }));
    const result = await updateLocationPins(layoutId, pinData);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Pins saved");
      setEditing(false);
      router.refresh();
    }
  };

  const handleCancel = () => {
    setPins(locations);
    setPendingClick(null);
    setEditing(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Track Plan
        </h2>
        {editing ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              <X className="h-3.5 w-3.5 mr-1.5" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Save Pins
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Edit Pins
          </Button>
        )}
      </div>

      <div
        ref={containerRef}
        className={`relative rounded-lg border overflow-hidden bg-muted/50 select-none ${
          editing ? "cursor-crosshair" : ""
        }`}
        onClick={handleImageClick}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        <Image
          src={imageUrl}
          alt="Track plan"
          width={1200}
          height={800}
          className="w-full h-auto"
          unoptimized
          draggable={false}
        />

        {pinnedLocations.map((loc) => (
          <div
            key={loc.id}
            className={`absolute -translate-x-1/2 -translate-y-full group ${
              editing ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
            }`}
            style={{
              left: `${(loc.pinX ?? 0) * 100}%`,
              top: `${(loc.pinY ?? 0) * 100}%`,
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              if (editing) handleDragStart(loc.id);
              else router.push(`/dashboard/railroad/${layoutId}/locations`);
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold bg-background/90 backdrop-blur-sm px-1.5 py-0.5 rounded shadow-sm border mb-0.5 whitespace-nowrap">
                {loc.code}
              </span>
              <MapPin className="h-6 w-6 text-primary drop-shadow-md" fill="currentColor" />
              {editing && (
                <button
                  className="absolute -top-1 -right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive text-destructive-foreground rounded-full p-0.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    removePin(loc.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        ))}

        {pendingClick && (
          <div
            className="absolute z-10 -translate-x-1/2"
            style={{
              left: `${pendingClick.x * 100}%`,
              top: `${pendingClick.y * 100}%`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-background border rounded-lg shadow-lg p-2 mt-2 min-w-[180px]">
              <Select onValueChange={assignLocation}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select location..." />
                </SelectTrigger>
                <SelectContent>
                  {unpinnedLocations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.code} — {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-1 h-7 text-xs"
                onClick={() => setPendingClick(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {editing && unpinnedLocations.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Click on the image to place a pin. {unpinnedLocations.length} location{unpinnedLocations.length !== 1 ? "s" : ""} remaining.
        </p>
      )}
    </div>
  );
}
