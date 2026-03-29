"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { TrackPath, type Point } from "./svg/track-path";
import { YARD_TRACK_COLORS } from "./svg/topo-colors";
import { useMapStore } from "./use-map-store";
import {
  useYardStore,
  type TrackElement,
  type TurnoutElement,
  type IndustryElement,
} from "./use-yard-store";
import {
  getYardCanvasData,
  createYardTrackElement,
  createIndustryElement,
  createTurnoutElement,
  deleteYardElement,
} from "@/app/actions/yard-canvas";
import { createId } from "@paralleldrive/cuid2";
import { toast } from "sonner";

const GRID_SNAP = 20;
const GRID_DOT_SPACING = 20;

function snap(v: number): number {
  return Math.round(v / GRID_SNAP) * GRID_SNAP;
}

function svgPoint(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
  viewBox: ViewBox,
): Point {
  const rect = svg.getBoundingClientRect();
  const scaleX = viewBox.width / rect.width;
  const scaleY = viewBox.height / rect.height;
  return {
    x: snap(viewBox.x + (clientX - rect.left) * scaleX),
    y: snap(viewBox.y + (clientY - rect.top) * scaleY),
  };
}

interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface YardDetailCanvasProps {
  locationId: string;
}

export function YardDetailCanvas({ locationId }: YardDetailCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState<ViewBox>({
    x: -50,
    y: -50,
    width: 800,
    height: 600,
  });
  const [loading, setLoading] = useState(true);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);

  const tool = useMapStore((s) => s.tool);
  const setTool = useMapStore((s) => s.setTool);

  const elements = useYardStore((s) => s.elements);
  const setElements = useYardStore((s) => s.setElements);
  const addElement = useYardStore((s) => s.addElement);
  const removeElement = useYardStore((s) => s.removeElement);
  const selectedElementId = useYardStore((s) => s.selectedElementId);
  const selectElement = useYardStore((s) => s.selectElement);
  const canvasId = useYardStore((s) => s.canvasId);
  const setCanvasId = useYardStore((s) => s.setCanvasId);
  const drawingPoints = useYardStore((s) => s.drawingPoints);
  const addDrawingPoint = useYardStore((s) => s.addDrawingPoint);
  const clearDrawing = useYardStore((s) => s.clearDrawing);
  const setSaveStatus = useYardStore((s) => s.setSaveStatus);

  const isDark =
    typeof window !== "undefined" &&
    document.documentElement.classList.contains("dark");

  // Load yard data
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getYardCanvasData(locationId)
      .then((data) => {
        if (cancelled) return;
        setCanvasId(data.canvas.id);
        useYardStore.getState().setLocationId(locationId);

        const stored = (data.canvas.trackElements ?? []) as unknown as (
          | TrackElement
          | TurnoutElement
          | IndustryElement
        )[];
        setElements(stored);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load yard data:", err);
        toast.error("Failed to load yard data");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [locationId, setCanvasId, setElements]);

  // Keyboard: Escape cancels drawing, Delete removes selected
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      if (e.key === "Escape") {
        clearDrawing();
        setTool("select");
      }

      if ((e.key === "Delete" || e.key === "Backspace") && selectedElementId && canvasId) {
        e.preventDefault();
        handleDeleteElement(selectedElementId);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedElementId, canvasId, clearDrawing, setTool]);

  const handleDeleteElement = useCallback(
    async (elementId: string) => {
      if (!canvasId) return;
      setSaveStatus("saving");
      try {
        const result = await deleteYardElement({
          locationId,
          canvasId,
          elementId,
        });
        if (result.success) {
          removeElement(elementId);
          selectElement(null);
          toast.success("Element deleted");
        }
      } catch {
        toast.error("Failed to delete element");
      } finally {
        setSaveStatus("saved");
      }
    },
    [canvasId, locationId, removeElement, selectElement, setSaveStatus],
  );

  // ── Mouse handlers ──────────────────────────────

  const handleMouseDown = useCallback(
    (e: ReactMouseEvent<SVGSVGElement>) => {
      if (!svgRef.current) return;

      if (tool === "pan" || e.button === 1) {
        setIsPanning(true);
        panStart.current = {
          x: e.clientX,
          y: e.clientY,
          vx: viewBox.x,
          vy: viewBox.y,
        };
        e.preventDefault();
        return;
      }
    },
    [tool, viewBox],
  );

  const handleMouseMove = useCallback(
    (e: ReactMouseEvent<SVGSVGElement>) => {
      if (!isPanning || !panStart.current || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const scaleX = viewBox.width / rect.width;
      const scaleY = viewBox.height / rect.height;
      setViewBox((vb) => ({
        ...vb,
        x: panStart.current!.vx - (e.clientX - panStart.current!.x) * scaleX,
        y: panStart.current!.vy - (e.clientY - panStart.current!.y) * scaleY,
      }));
    },
    [isPanning, viewBox.width, viewBox.height],
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    panStart.current = null;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    setViewBox((vb) => {
      const newW = vb.width * factor;
      const newH = vb.height * factor;
      // zoom toward center
      return {
        x: vb.x + (vb.width - newW) / 2,
        y: vb.y + (vb.height - newH) / 2,
        width: newW,
        height: newH,
      };
    });
  }, []);

  const handleClick = useCallback(
    (e: ReactMouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || !canvasId) return;
      const pt = svgPoint(svgRef.current, e.clientX, e.clientY, viewBox);

      if (tool === "select") {
        selectElement(null);
        return;
      }

      if (tool === "draw-track") {
        addDrawingPoint(pt);
        return;
      }

      if (tool === "add-industry") {
        handleAddIndustry(pt);
        return;
      }

      if (tool === "add-turnout") {
        handleAddTurnout(pt);
        return;
      }
    },
    [tool, viewBox, canvasId],
  );

  const handleDoubleClick = useCallback(
    async (e: ReactMouseEvent<SVGSVGElement>) => {
      if (tool !== "draw-track" || drawingPoints.length < 2 || !canvasId) return;
      e.preventDefault();

      const id = createId();
      const element: TrackElement = {
        id,
        type: "track",
        points: drawingPoints,
        trackType: "LEAD",
      };

      addElement(element);
      clearDrawing();
      setSaveStatus("saving");

      try {
        const result = await createYardTrackElement({
          locationId,
          canvasId,
          element,
        });
        if (result.success && result.element) {
          // Update with DB-assigned yardTrackId
          useYardStore.getState().updateElement(id, {
            yardTrackId: result.element.yardTrackId,
          } as Partial<TrackElement>);
        }
        toast.success("Track created");
      } catch {
        toast.error("Failed to save track");
        removeElement(id);
      } finally {
        setSaveStatus("saved");
      }
    },
    [tool, drawingPoints, canvasId, locationId, addElement, clearDrawing, removeElement, setSaveStatus],
  );

  const handleAddIndustry = useCallback(
    async (pt: Point) => {
      if (!canvasId) return;
      const id = createId();
      const element: IndustryElement = {
        id,
        type: "industry",
        position: pt,
        width: 120,
        height: 40,
        name: "New Industry",
        spotCount: 2,
      };

      addElement(element);
      setSaveStatus("saving");

      try {
        const result = await createIndustryElement({
          locationId,
          canvasId,
          element,
        });
        if (result.success && result.element) {
          useYardStore.getState().updateElement(id, {
            industryId: result.element.industryId,
          } as Partial<IndustryElement>);
        }
        toast.success("Industry placed");
      } catch {
        toast.error("Failed to save industry");
        removeElement(id);
      } finally {
        setSaveStatus("saved");
      }
    },
    [canvasId, locationId, addElement, removeElement, setSaveStatus],
  );

  const handleAddTurnout = useCallback(
    async (pt: Point) => {
      if (!canvasId) return;

      // Find nearest track
      const tracks = elements.filter((el): el is TrackElement => el.type === "track");
      let nearestTrackId: string | null = null;
      let minDist = Infinity;

      for (const track of tracks) {
        for (const tp of track.points) {
          const d = Math.hypot(tp.x - pt.x, tp.y - pt.y);
          if (d < minDist) {
            minDist = d;
            nearestTrackId = track.id;
          }
        }
      }

      if (!nearestTrackId || minDist > 60) {
        toast.error("Place turnout near a track");
        return;
      }

      const id = createId();
      const element: TurnoutElement = {
        id,
        type: "turnout",
        parentTrackId: nearestTrackId,
        position: pt,
      };

      addElement(element);
      setSaveStatus("saving");

      try {
        await createTurnoutElement({ locationId, canvasId, element });
        toast.success("Turnout placed");
      } catch {
        toast.error("Failed to save turnout");
        removeElement(id);
      } finally {
        setSaveStatus("saved");
      }
    },
    [canvasId, locationId, elements, addElement, removeElement, setSaveStatus],
  );

  const handleElementClick = useCallback(
    (e: ReactMouseEvent, id: string) => {
      e.stopPropagation();
      if (tool === "select") {
        selectElement(id);
      }
    },
    [tool, selectElement],
  );

  // ── Grid dots ──────────────────────────────────

  const gridDots = useMemo(() => {
    const dots: string[] = [];
    const startX = Math.floor(viewBox.x / GRID_DOT_SPACING) * GRID_DOT_SPACING;
    const startY = Math.floor(viewBox.y / GRID_DOT_SPACING) * GRID_DOT_SPACING;
    const endX = viewBox.x + viewBox.width;
    const endY = viewBox.y + viewBox.height;

    for (let x = startX; x <= endX; x += GRID_DOT_SPACING) {
      for (let y = startY; y <= endY; y += GRID_DOT_SPACING) {
        dots.push(`${x},${y}`);
      }
    }
    return dots;
  }, [viewBox]);

  // ── Render helpers ────────────────────────────

  const trackColor = useCallback(
    (trackType: string) => {
      const c = YARD_TRACK_COLORS[trackType] ?? YARD_TRACK_COLORS.LEAD;
      return isDark ? c.dark : c.light;
    },
    [isDark],
  );

  // ── Tool hints ────────────────────────────────

  const toolHint = useMemo(() => {
    switch (tool) {
      case "draw-track":
        return drawingPoints.length === 0
          ? "Click to start drawing track, double-click to finish"
          : "Click to add waypoints, double-click to finish";
      case "add-industry":
        return "Click to place an industry building";
      case "add-turnout":
        return "Click near a track to place a turnout";
      case "select":
        return "Click an element to select, Delete to remove";
      default:
        return null;
    }
  }, [tool, drawingPoints.length]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="font-mono text-sm text-muted-foreground animate-pulse">
          Loading yard data...
        </p>
      </div>
    );
  }

  const vbStr = `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;
  const dotRadius = Math.max(0.5, viewBox.width / 800);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={vbStr}
        className="h-full w-full cursor-crosshair"
        style={{ touchAction: "none" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        {/* Grid dots */}
        {gridDots.map((coord) => {
          const [cx, cy] = coord.split(",").map(Number);
          return (
            <circle
              key={coord}
              cx={cx}
              cy={cy}
              r={dotRadius}
              className="fill-muted-foreground/20"
            />
          );
        })}

        {/* Track elements */}
        {elements
          .filter((el): el is TrackElement => el.type === "track")
          .map((track) => (
            <g
              key={track.id}
              onClick={(e) => handleElementClick(e, track.id)}
              className="cursor-pointer"
            >
              <TrackPath
                points={track.points}
                trackType="spur"
                color={trackColor(track.trackType)}
                selected={selectedElementId === track.id}
              />
              {/* Track label */}
              {track.name && track.points.length >= 2 && (
                <text
                  x={track.points[0].x}
                  y={track.points[0].y - 8}
                  fontSize={Math.max(8, viewBox.width / 100)}
                  className="fill-foreground"
                  fontFamily="monospace"
                  textAnchor="start"
                >
                  {track.name}
                </text>
              )}
            </g>
          ))}

        {/* Turnout elements */}
        {elements
          .filter((el): el is TurnoutElement => el.type === "turnout")
          .map((turnout) => {
            const r = Math.max(4, viewBox.width / 160);
            return (
              <g
                key={turnout.id}
                onClick={(e) => handleElementClick(e, turnout.id)}
                className="cursor-pointer"
              >
                {/* Selection ring */}
                {selectedElementId === turnout.id && (
                  <circle
                    cx={turnout.position.x}
                    cy={turnout.position.y}
                    r={r + 3}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    opacity={0.5}
                  />
                )}
                {/* Turnout circle */}
                <circle
                  cx={turnout.position.x}
                  cy={turnout.position.y}
                  r={r}
                  className="fill-background stroke-foreground"
                  strokeWidth={1.5}
                />
                {/* Horizontal line through center */}
                <line
                  x1={turnout.position.x - r}
                  y1={turnout.position.y}
                  x2={turnout.position.x + r}
                  y2={turnout.position.y}
                  className="stroke-foreground"
                  strokeWidth={1.5}
                />
              </g>
            );
          })}

        {/* Industry elements */}
        {elements
          .filter((el): el is IndustryElement => el.type === "industry")
          .map((ind) => {
            const fontSize = Math.max(9, viewBox.width / 90);
            return (
              <g
                key={ind.id}
                onClick={(e) => handleElementClick(e, ind.id)}
                className="cursor-pointer"
              >
                {/* Selection highlight */}
                {selectedElementId === ind.id && (
                  <rect
                    x={ind.position.x - 3}
                    y={ind.position.y - 3}
                    width={ind.width + 6}
                    height={ind.height + 6}
                    rx={8}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    opacity={0.5}
                  />
                )}
                {/* Building rectangle */}
                <rect
                  x={ind.position.x}
                  y={ind.position.y}
                  width={ind.width}
                  height={ind.height}
                  rx={5}
                  className="fill-muted stroke-foreground"
                  strokeWidth={1}
                />
                {/* Name label */}
                <text
                  x={ind.position.x + ind.width / 2}
                  y={ind.position.y + ind.height / 2 - 2}
                  fontSize={fontSize}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-foreground"
                  fontFamily="Georgia, serif"
                  fontStyle="italic"
                >
                  {ind.name || "Industry"}
                </text>
                {/* Spot count */}
                {ind.spotCount != null && (
                  <text
                    x={ind.position.x + ind.width / 2}
                    y={ind.position.y + ind.height / 2 + fontSize * 0.8}
                    fontSize={fontSize * 0.7}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-muted-foreground"
                    fontFamily="monospace"
                  >
                    {ind.spotCount} spot{ind.spotCount !== 1 ? "s" : ""}
                  </text>
                )}
              </g>
            );
          })}

        {/* Drawing-in-progress preview */}
        {drawingPoints.length >= 1 && (
          <g opacity={0.6}>
            <TrackPath
              points={drawingPoints}
              trackType="spur"
              color={trackColor("LEAD")}
            />
            {drawingPoints.map((pt, i) => (
              <circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r={Math.max(3, viewBox.width / 200)}
                className="fill-primary"
              />
            ))}
          </g>
        )}
      </svg>

      {/* Tool hint overlay */}
      {toolHint && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 rounded-md bg-primary px-3 py-1.5 font-mono text-xs text-primary-foreground shadow-lg">
          {toolHint}
        </div>
      )}
    </div>
  );
}
