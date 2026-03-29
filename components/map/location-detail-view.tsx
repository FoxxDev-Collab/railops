"use client";

import { useCallback } from "react";
import { useMapStore } from "./use-map-store";
import { ChevronLeft } from "lucide-react";

interface YardTrack {
  id: string;
  name: string;
  trackType: string;
  capacity?: number;
}

interface Industry {
  id: string;
  name: string;
}

interface LocationDetailViewProps {
  locationId: string;
  locationName: string;
  locationType: string;
  yardTracks: YardTrack[];
  industries: Industry[];
}

const TRACK_TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  ARRIVAL: { bg: "bg-blue-500/15", text: "text-blue-600 dark:text-blue-400", label: "Arrival" },
  CLASSIFICATION: { bg: "bg-amber-500/15", text: "text-amber-600 dark:text-amber-400", label: "Classification" },
  DEPARTURE: { bg: "bg-green-500/15", text: "text-green-600 dark:text-green-400", label: "Departure" },
  LEAD: { bg: "bg-muted", text: "text-muted-foreground", label: "Lead" },
  RIP: { bg: "bg-red-500/15", text: "text-red-600 dark:text-red-400", label: "RIP" },
  ENGINE_SERVICE: { bg: "bg-purple-500/15", text: "text-purple-600 dark:text-purple-400", label: "Engine Service" },
  CABOOSE: { bg: "bg-pink-500/15", text: "text-pink-600 dark:text-pink-400", label: "Caboose" },
  RUNAROUND: { bg: "bg-muted", text: "text-muted-foreground", label: "Runaround" },
  SWITCHER_POCKET: { bg: "bg-muted", text: "text-muted-foreground", label: "Switcher Pocket" },
};

export function LocationDetailView({
  locationId,
  locationName,
  locationType,
  yardTracks,
  industries,
}: LocationDetailViewProps) {
  const handleBack = useCallback(() => {
    useMapStore.getState().setYardDetailLocation(null);
    useMapStore.getState().setActiveTab("locations");
  }, []);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-2.5">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-xs font-mono text-primary hover:opacity-70 transition-opacity"
        >
          <ChevronLeft className="h-3 w-3" />
          Railroad Overview
        </button>
        <span className="text-muted-foreground text-xs">/</span>
        <span className="text-foreground text-xs font-mono font-bold">{locationName}</span>
        <span className="text-muted-foreground text-xs font-mono">
          ({locationType.replace(/_/g, " ")})
        </span>
      </div>

      {/* Track layout */}
      <div className="flex-1 overflow-auto p-6">
        {/* Lead track visualization */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-[3px] flex-1 bg-muted-foreground/40 rounded-full" />
            <span className="text-[10px] font-mono text-muted-foreground tracking-wider">LEAD TRACK</span>
            <div className="h-[3px] flex-1 bg-muted-foreground/40 rounded-full" />
          </div>
        </div>

        {/* Yard tracks */}
        {yardTracks.length > 0 && (
          <div className="mb-8">
            <h3 className="text-[10px] font-mono text-muted-foreground tracking-wider mb-3">YARD TRACKS</h3>
            <div className="space-y-2">
              {yardTracks.map((track) => {
                const style = TRACK_TYPE_COLORS[track.trackType] ?? TRACK_TYPE_COLORS.LEAD;
                return (
                  <div
                    key={track.id}
                    className={`flex items-center gap-3 rounded-md border border-border ${style.bg} px-3 py-2`}
                  >
                    {/* Turnout indicator */}
                    <div className="flex items-center gap-1.5">
                      <div className={`h-[2px] w-4 ${style.text} bg-current rounded-full opacity-50 -rotate-30`} />
                      <div className={`h-[2px] w-16 ${style.text} bg-current rounded-full`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className={`font-mono text-xs font-bold ${style.text}`}>
                        {track.name}
                      </span>
                    </div>

                    <span className="font-mono text-[10px] text-muted-foreground">
                      {style.label}
                    </span>

                    {track.capacity != null && (
                      <span className="font-mono text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
                        Cap: {track.capacity}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Industry spurs */}
        {industries.length > 0 && (
          <div className="mb-8">
            <h3 className="text-[10px] font-mono text-muted-foreground tracking-wider mb-3">INDUSTRY SPURS</h3>
            <div className="space-y-2">
              {industries.map((industry) => (
                <div
                  key={industry.id}
                  className="flex items-center gap-3 rounded-md border border-border bg-green-500/10 px-3 py-2"
                >
                  {/* Spur indicator */}
                  <div className="flex items-center gap-1.5">
                    <div className="h-[2px] w-4 bg-green-600 dark:bg-green-400 rounded-full opacity-50 -rotate-30" />
                    <div className="h-[2px] w-12 bg-green-600 dark:bg-green-400 rounded-full border-dashed" style={{ borderTop: "2px dashed", background: "none" }} />
                  </div>

                  <span className="font-mono text-xs font-bold text-green-600 dark:text-green-400">
                    {industry.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {yardTracks.length === 0 && industries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
              <span className="text-2xl text-muted-foreground">///</span>
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">No tracks or industries</p>
            <p className="text-xs text-muted-foreground max-w-[240px]">
              Add yard tracks and industries to this location to see the track diagram.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
