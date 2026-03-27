"use client";

import { useCallback, useEffect, useState } from "react";
import { Stage, Layer, Line, Rect, Text, Group } from "react-konva";
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

const TRACK_TYPE_COLORS: Record<string, string> = {
  ARRIVAL: "#3b82f6",
  CLASSIFICATION: "#f59e0b",
  DEPARTURE: "#22c55e",
  LEAD: "#94a3b8",
  RIP: "#ef4444",
  ENGINE_SERVICE: "#8b5cf6",
  CABOOSE: "#ec4899",
  RUNAROUND: "#64748b",
  SWITCHER_POCKET: "#a1a1aa",
};

export function LocationDetailView({
  locationId,
  locationName,
  locationType,
  yardTracks,
  industries,
}: LocationDetailViewProps) {
  const setDetailLocation = useMapStore((s) => s.setDetailLocation);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  useEffect(() => {
    const updateSize = () => {
      const container = document.getElementById("detail-canvas-container");
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: container.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const handleBack = useCallback(() => {
    setDetailLocation(null);
  }, [setDetailLocation]);

  const trackSpacing = 40;
  const trackStartX = 80;
  const trackStartY = 80;
  const trackLength = dimensions.width - 160;

  return (
    <div className="flex h-full flex-col bg-[#0a0f1a]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 border-b border-slate-700 bg-[#0f172a] px-4 py-2">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-xs font-mono text-blue-400 hover:text-blue-300 transition-colors"
        >
          <ChevronLeft className="h-3 w-3" />
          Railroad Overview
        </button>
        <span className="text-slate-600 text-xs">/</span>
        <span className="text-slate-200 text-xs font-mono font-bold">{locationName}</span>
        <span className="text-slate-500 text-xs font-mono">({locationType})</span>
      </div>

      {/* Konva canvas */}
      <div id="detail-canvas-container" className="flex-1">
        <Stage width={dimensions.width} height={dimensions.height}>
          <Layer>
            {/* Lead track (horizontal line at top) */}
            <Line
              points={[trackStartX, trackStartY - 20, trackStartX + trackLength, trackStartY - 20]}
              stroke="#64748b"
              strokeWidth={3}
              lineCap="round"
            />
            <Text
              x={trackStartX - 10}
              y={trackStartY - 30}
              text="Lead"
              fill="#64748b"
              fontSize={10}
              fontFamily="monospace"
              align="right"
              width={60}
            />

            {/* Yard tracks */}
            {yardTracks.map((track, i) => {
              const y = trackStartY + i * trackSpacing;
              const color = TRACK_TYPE_COLORS[track.trackType] ?? "#475569";

              return (
                <Group key={track.id}>
                  {/* Turnout from lead */}
                  <Line
                    points={[
                      trackStartX + 20 + i * 30,
                      trackStartY - 20,
                      trackStartX + 40 + i * 30,
                      y,
                    ]}
                    stroke={color}
                    strokeWidth={2}
                    lineCap="round"
                    opacity={0.5}
                  />

                  {/* Main track line */}
                  <Line
                    points={[
                      trackStartX + 40 + i * 30,
                      y,
                      trackStartX + trackLength - 40,
                      y,
                    ]}
                    stroke={color}
                    strokeWidth={2}
                    lineCap="round"
                  />

                  {/* Track label */}
                  <Text
                    x={0}
                    y={y - 6}
                    text={track.name}
                    fill={color}
                    fontSize={10}
                    fontFamily="monospace"
                    width={trackStartX + 30 + i * 30}
                    align="right"
                    padding={4}
                  />

                  {/* Capacity indicator */}
                  {track.capacity && (
                    <Text
                      x={trackStartX + trackLength - 35}
                      y={y - 6}
                      text={`cap: ${track.capacity}`}
                      fill="#475569"
                      fontSize={9}
                      fontFamily="monospace"
                    />
                  )}
                </Group>
              );
            })}

            {/* Industry spurs */}
            {industries.map((industry, i) => {
              const baseY = trackStartY + yardTracks.length * trackSpacing + 20;
              const y = baseY + i * trackSpacing;
              const spurStartX = trackStartX + trackLength - 200;

              return (
                <Group key={industry.id}>
                  <Line
                    points={[spurStartX, trackStartY - 20, spurStartX + 40, y]}
                    stroke="#22c55e"
                    strokeWidth={1.5}
                    dash={[4, 3]}
                    lineCap="round"
                  />
                  <Line
                    points={[spurStartX + 40, y, spurStartX + 160, y]}
                    stroke="#22c55e"
                    strokeWidth={1.5}
                    lineCap="round"
                  />
                  <Rect
                    x={spurStartX + 165}
                    y={y - 12}
                    width={120}
                    height={24}
                    fill="#0f2918"
                    stroke="#22c55e"
                    strokeWidth={1}
                    cornerRadius={4}
                  />
                  <Text
                    x={spurStartX + 170}
                    y={y - 6}
                    text={industry.name}
                    fill="#22c55e"
                    fontSize={10}
                    fontFamily="monospace"
                  />
                </Group>
              );
            })}

            {/* Empty state */}
            {yardTracks.length === 0 && industries.length === 0 && (
              <Text
                x={dimensions.width / 2 - 100}
                y={dimensions.height / 2 - 10}
                text="No tracks or industries yet"
                fill="#475569"
                fontSize={14}
                fontFamily="monospace"
                width={200}
                align="center"
              />
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
