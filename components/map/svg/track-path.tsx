"use client";

import { memo, useMemo } from "react";
import { TOPO_TRACK_STYLES } from "./topo-colors";

export interface Point {
  x: number;
  y: number;
}

interface TrackPathProps {
  points: Point[];
  trackType: "mainline" | "branch" | "spur";
  color: string;
  selected?: boolean;
  selectedColor?: string;
  opacity?: number;
}

/** Total polyline length across all segments. */
export function getPathLength(points: Point[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    length += Math.sqrt(dx * dx + dy * dy);
  }
  return length;
}

/** Linear interpolation along polyline at parameter t (0–1). */
export function getPointOnPath(points: Point[], t: number): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1 || t <= 0) return { ...points[0] };
  if (t >= 1) return { ...points[points.length - 1] };

  const total = getPathLength(points);
  if (total === 0) return { ...points[0] };

  const target = t * total;
  let accumulated = 0;

  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const segLen = Math.sqrt(dx * dx + dy * dy);

    if (accumulated + segLen >= target) {
      const frac = segLen === 0 ? 0 : (target - accumulated) / segLen;
      return {
        x: points[i - 1].x + dx * frac,
        y: points[i - 1].y + dy * frac,
      };
    }
    accumulated += segLen;
  }

  return { ...points[points.length - 1] };
}

/** Unit normal perpendicular to path direction at parameter t. */
export function getNormalAtPoint(
  points: Point[],
  t: number,
): { nx: number; ny: number } {
  if (points.length < 2) return { nx: 0, ny: -1 };

  const total = getPathLength(points);
  if (total === 0) return { nx: 0, ny: -1 };

  const target = t * total;
  let accumulated = 0;

  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const segLen = Math.sqrt(dx * dx + dy * dy);

    if (accumulated + segLen >= target || i === points.length - 1) {
      if (segLen === 0) continue;
      // Normal is perpendicular to tangent (dx, dy) → (-dy, dx) normalized
      return { nx: -dy / segLen, ny: dx / segLen };
    }
    accumulated += segLen;
  }

  return { nx: 0, ny: -1 };
}

/**
 * SVG path d-string with quadratic curves through midpoints.
 * 2 points → straight line. 3+ → smooth Q-curves using actual points
 * as control points and midpoints as on-curve points.
 */
export function buildSmoothPath(points: Point[]): string {
  if (points.length < 2) return "";

  if (points.length === 2) {
    return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;
  }

  let d = `M${points[0].x},${points[0].y}`;

  // First segment: quadratic to midpoint between p0 and p1
  const mid0x = (points[0].x + points[1].x) / 2;
  const mid0y = (points[0].y + points[1].y) / 2;
  d += ` L${mid0x},${mid0y}`;

  // Middle segments: Q command with point[i] as control, midpoint as end
  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    d += ` Q${points[i].x},${points[i].y} ${midX},${midY}`;
  }

  // Last segment: line to final point
  d += ` L${points[points.length - 1].x},${points[points.length - 1].y}`;

  return d;
}

function generateTicks(
  points: Point[],
  tickSpacing: number,
  tickLength: number,
): string[] {
  if (tickSpacing <= 0 || tickLength <= 0 || points.length < 2) return [];

  const total = getPathLength(points);
  if (total === 0) return [];

  const lines: string[] = [];
  const halfTick = tickLength / 2;
  let dist = tickSpacing;

  while (dist < total) {
    const t = dist / total;
    const pt = getPointOnPath(points, t);
    const { nx, ny } = getNormalAtPoint(points, t);

    lines.push(
      `M${pt.x + nx * halfTick},${pt.y + ny * halfTick} L${pt.x - nx * halfTick},${pt.y - ny * halfTick}`,
    );
    dist += tickSpacing;
  }

  return lines;
}

export const TrackPath = memo(function TrackPath({
  points,
  trackType,
  color,
  selected = false,
  selectedColor = "#3b82f6",
  opacity = 1,
}: TrackPathProps) {
  const style = TOPO_TRACK_STYLES[trackType];

  const pathD = useMemo(() => buildSmoothPath(points), [points]);

  const ticks = useMemo(
    () => generateTicks(points, style.tickSpacing, style.tickLength),
    [points, style.tickSpacing, style.tickLength],
  );

  if (points.length < 2 || !pathD) return null;

  return (
    <g opacity={opacity}>
      {/* Selection highlight */}
      {selected && (
        <path
          d={pathD}
          fill="none"
          stroke={selectedColor}
          strokeWidth={style.strokeWidth + 6}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.3}
        />
      )}

      {/* Main track path */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={style.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={style.dash}
      />

      {/* Perpendicular ticks */}
      {ticks.map((tickD, i) => (
        <path
          key={i}
          d={tickD}
          fill="none"
          stroke={color}
          strokeWidth={Math.max(1, style.strokeWidth * 0.6)}
          strokeLinecap="round"
        />
      ))}
    </g>
  );
});

TrackPath.displayName = "TrackPath";
