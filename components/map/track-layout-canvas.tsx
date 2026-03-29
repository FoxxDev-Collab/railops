"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type WheelEvent,
} from "react";
import { TrackPath, type Point } from "./svg/track-path";
import { LOCATION_SIZES } from "./svg/topo-colors";
import { useMapStore } from "./use-map-store";
import { createCanvasEdge } from "@/app/actions/canvas";
import { toast } from "sonner";

// ── Types ──

interface CanvasNode {
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
}

interface CanvasEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  trackType: string;
  label: string | null;
  pathData: { waypoints?: { x: number; y: number }[] } & Record<string, unknown>;
}

interface TrackLayoutCanvasProps {
  canvasId: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  gridSize: number;
}

// ── Constants ──

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 5;
const GRID_DOT_RADIUS = 0.8;
const WAYPOINT_RADIUS = 3;
const TRACK_HIT_TOLERANCE = 8;

// ── Component ──

export function TrackLayoutCanvas({
  canvasId,
  nodes,
  edges: initialEdges,
  gridSize,
}: TrackLayoutCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Zustand state
  const tool = useMapStore((s) => s.tool);
  const selectedEdgeId = useMapStore((s) => s.selectedEdgeId);
  const selectedNodeId = useMapStore((s) => s.selectedNodeId);
  const selectEdge = useMapStore((s) => s.selectEdge);
  const selectNode = useMapStore((s) => s.selectNode);
  const clearSelection = useMapStore((s) => s.clearSelection);
  const drawSourceNodeId = useMapStore((s) => s.drawSourceNodeId);
  const setDrawSource = useMapStore((s) => s.setDrawSource);
  const pushUndo = useMapStore((s) => s.pushUndo);
  const setTool = useMapStore((s) => s.setTool);

  // Local state
  const [localEdges, setLocalEdges] = useState<CanvasEdge[]>(initialEdges);
  const [drawingWaypoints, setDrawingWaypoints] = useState<Point[]>([]);
  const [mousePos, setMousePos] = useState<Point | null>(null);

  // Viewport: pan/zoom via viewBox
  const [viewBox, setViewBox] = useState({ x: -200, y: -200, w: 1200, h: 800 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);

  // Sync edges from props
  useEffect(() => {
    setLocalEdges(initialEdges);
  }, [initialEdges]);

  // Node lookup map
  const nodeMap = useMemo(() => {
    const map = new Map<string, CanvasNode>();
    for (const n of nodes) map.set(n.id, n);
    return map;
  }, [nodes]);

  // ── Coordinate conversion ──

  const svgToCanvas = useCallback(
    (clientX: number, clientY: number): Point => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      const scaleX = viewBox.w / rect.width;
      const scaleY = viewBox.h / rect.height;
      return {
        x: viewBox.x + (clientX - rect.left) * scaleX,
        y: viewBox.y + (clientY - rect.top) * scaleY,
      };
    },
    [viewBox],
  );

  const snapToGrid = useCallback(
    (p: Point): Point => ({
      x: Math.round(p.x / gridSize) * gridSize,
      y: Math.round(p.y / gridSize) * gridSize,
    }),
    [gridSize],
  );

  // ── Pan/Zoom handlers ──

  const handleWheel = useCallback(
    (e: WheelEvent<SVGSVGElement>) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      const pt = svgToCanvas(e.clientX, e.clientY);

      setViewBox((vb) => {
        const newW = Math.max(vb.w * factor, 100);
        const newH = Math.max(vb.h * factor, 100);
        const zoom = vb.w / newW;
        if (newW / 1200 < MIN_ZOOM || newW / 1200 > 1 / MIN_ZOOM) return vb;
        return {
          x: pt.x - (pt.x - vb.x) / zoom * (newW / vb.w) * zoom,
          y: pt.y - (pt.y - vb.y) / zoom * (newH / vb.h) * zoom,
          w: newW,
          h: newH,
        };
      });
    },
    [svgToCanvas],
  );

  const handleMouseDown = useCallback(
    (e: MouseEvent<SVGSVGElement>) => {
      if (tool === "pan" || e.button === 1) {
        setIsPanning(true);
        panStart.current = { x: e.clientX, y: e.clientY, vx: viewBox.x, vy: viewBox.y };
        return;
      }
    },
    [tool, viewBox],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent<SVGSVGElement>) => {
      const pt = svgToCanvas(e.clientX, e.clientY);
      setMousePos(snapToGrid(pt));

      if (isPanning && panStart.current) {
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const scaleX = viewBox.w / rect.width;
        const scaleY = viewBox.h / rect.height;
        setViewBox((vb) => ({
          ...vb,
          x: panStart.current!.vx - (e.clientX - panStart.current!.x) * scaleX,
          y: panStart.current!.vy - (e.clientY - panStart.current!.y) * scaleY,
        }));
      }
    },
    [isPanning, svgToCanvas, snapToGrid, viewBox],
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    panStart.current = null;
  }, []);

  // ── Click handling ──

  const findNodeAtPoint = useCallback(
    (pt: Point): CanvasNode | null => {
      for (const node of nodes) {
        const r = LOCATION_SIZES[node.location.locationType] ?? 5;
        const dx = pt.x - node.x;
        const dy = pt.y - node.y;
        if (dx * dx + dy * dy <= (r + 4) * (r + 4)) return node;
      }
      return null;
    },
    [nodes],
  );

  const findEdgeAtPoint = useCallback(
    (pt: Point): CanvasEdge | null => {
      for (const edge of localEdges) {
        const source = nodeMap.get(edge.sourceNodeId);
        const target = nodeMap.get(edge.targetNodeId);
        if (!source || !target) continue;

        const waypoints = edge.pathData?.waypoints ?? [];
        const points: Point[] = [
          { x: source.x, y: source.y },
          ...waypoints,
          { x: target.x, y: target.y },
        ];

        for (let i = 1; i < points.length; i++) {
          const dist = distToSegment(pt, points[i - 1], points[i]);
          if (dist < TRACK_HIT_TOLERANCE) return edge;
        }
      }
      return null;
    },
    [localEdges, nodeMap],
  );

  const handleSvgClick = useCallback(
    async (e: MouseEvent<SVGSVGElement>) => {
      if (isPanning) return;
      const pt = svgToCanvas(e.clientX, e.clientY);
      const snapped = snapToGrid(pt);

      if (tool === "draw-track") {
        const clickedNode = findNodeAtPoint(pt);

        if (!drawSourceNodeId) {
          // Start drawing from a location
          if (clickedNode) {
            setDrawSource(clickedNode.id);
            setDrawingWaypoints([]);
          }
          return;
        }

        // If clicking a different location node, finish the edge
        if (clickedNode && clickedNode.id !== drawSourceNodeId) {
          const result = await createCanvasEdge({
            canvasId,
            sourceNodeId: drawSourceNodeId,
            targetNodeId: clickedNode.id,
            trackType: "mainline",
            pathData: drawingWaypoints.length > 0 ? { waypoints: drawingWaypoints } : undefined,
          });

          if (result.error) {
            toast.error(result.error);
          } else if (result.edge) {
            const newEdge: CanvasEdge = {
              ...result.edge,
              pathData: drawingWaypoints.length > 0
                ? { waypoints: drawingWaypoints }
                : {},
            };
            setLocalEdges((prev) => [...prev, newEdge]);
            pushUndo({ type: "add-edge", data: { edgeId: result.edge.id } });
            toast.success("Track section created");
          }

          setDrawSource(null);
          setDrawingWaypoints([]);
          return;
        }

        // Otherwise, add a waypoint
        setDrawingWaypoints((prev) => [...prev, snapped]);
        return;
      }

      if (tool === "select") {
        const clickedNode = findNodeAtPoint(pt);
        if (clickedNode) {
          selectNode(clickedNode.id);
          return;
        }

        const clickedEdge = findEdgeAtPoint(pt);
        if (clickedEdge) {
          selectEdge(clickedEdge.id);
          return;
        }

        clearSelection();
      }
    },
    [
      tool, isPanning, svgToCanvas, snapToGrid, drawSourceNodeId,
      findNodeAtPoint, findEdgeAtPoint, canvasId, drawingWaypoints,
      setDrawSource, selectNode, selectEdge, clearSelection, pushUndo,
    ],
  );

  // Escape cancels drawing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drawSourceNodeId) {
        setDrawSource(null);
        setDrawingWaypoints([]);
        setTool("select");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawSourceNodeId, setDrawSource, setTool]);

  // ── Build track sections ──

  const trackSections = useMemo(() => {
    return localEdges.map((edge) => {
      const source = nodeMap.get(edge.sourceNodeId);
      const target = nodeMap.get(edge.targetNodeId);
      if (!source || !target) return null;

      const waypoints = edge.pathData?.waypoints ?? [];
      const points: Point[] = [
        { x: source.x, y: source.y },
        ...waypoints,
        { x: target.x, y: target.y },
      ];

      return { edge, points, source, target };
    }).filter(Boolean) as Array<{
      edge: CanvasEdge;
      points: Point[];
      source: CanvasNode;
      target: CanvasNode;
    }>;
  }, [localEdges, nodeMap]);

  // ── Drawing preview ──

  const drawPreviewPoints = useMemo((): Point[] | null => {
    if (!drawSourceNodeId || !mousePos) return null;
    const source = nodeMap.get(drawSourceNodeId);
    if (!source) return null;
    return [
      { x: source.x, y: source.y },
      ...drawingWaypoints,
      mousePos,
    ];
  }, [drawSourceNodeId, mousePos, drawingWaypoints, nodeMap]);

  // ── Grid pattern bounds ──

  const gridStart = useMemo(
    () => ({
      x: Math.floor(viewBox.x / gridSize) * gridSize,
      y: Math.floor(viewBox.y / gridSize) * gridSize,
    }),
    [viewBox, gridSize],
  );

  const gridDots = useMemo(() => {
    const dots: Point[] = [];
    const cols = Math.ceil(viewBox.w / gridSize) + 2;
    const rows = Math.ceil(viewBox.h / gridSize) + 2;
    // Limit to prevent rendering too many dots
    if (cols * rows > 5000) return dots;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        dots.push({
          x: gridStart.x + c * gridSize,
          y: gridStart.y + r * gridSize,
        });
      }
    }
    return dots;
  }, [gridStart, viewBox, gridSize]);

  // ── Tool hint ──

  const toolHint = useMemo(() => {
    if (tool === "draw-track") {
      if (!drawSourceNodeId) return "Click a location to start drawing a track";
      return "Click to add waypoints, click a location to finish (Esc to cancel)";
    }
    if (tool === "select") return "Click to select tracks or locations";
    if (tool === "pan") return "Drag to pan the canvas";
    return null;
  }, [tool, drawSourceNodeId]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      <svg
        ref={svgRef}
        className="h-full w-full"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleSvgClick}
        style={{ cursor: tool === "pan" || isPanning ? "grab" : tool === "draw-track" ? "crosshair" : "default" }}
      >
        {/* Grid dots */}
        {gridDots.map((dot, i) => (
          <circle
            key={i}
            cx={dot.x}
            cy={dot.y}
            r={GRID_DOT_RADIUS}
            className="fill-muted-foreground/20"
          />
        ))}

        {/* Track sections */}
        {trackSections.map(({ edge, points }) => (
          <g
            key={edge.id}
            onClick={(e) => {
              if (tool === "select") {
                e.stopPropagation();
                selectEdge(edge.id);
              }
            }}
            style={{ cursor: tool === "select" ? "pointer" : undefined }}
          >
            <TrackPath
              points={points}
              trackType={edge.trackType as "mainline" | "branch" | "spur"}
              color="currentColor"
              selected={selectedEdgeId === edge.id}
            />

            {/* Waypoints visible when selected */}
            {selectedEdgeId === edge.id &&
              (edge.pathData?.waypoints ?? []).map((wp, i) => (
                <circle
                  key={i}
                  cx={wp.x}
                  cy={wp.y}
                  r={WAYPOINT_RADIUS}
                  className="fill-primary stroke-primary-foreground"
                  strokeWidth={1}
                />
              ))}
          </g>
        ))}

        {/* Drawing preview */}
        {drawPreviewPoints && (
          <TrackPath
            points={drawPreviewPoints}
            trackType="mainline"
            color="currentColor"
            opacity={0.4}
          />
        )}

        {/* Drawing waypoints */}
        {drawingWaypoints.map((wp, i) => (
          <circle
            key={i}
            cx={wp.x}
            cy={wp.y}
            r={WAYPOINT_RADIUS}
            className="fill-primary/60 stroke-foreground"
            strokeWidth={0.5}
          />
        ))}

        {/* Location circles */}
        {nodes.map((node) => {
          const r = LOCATION_SIZES[node.location.locationType] ?? 5;
          const isSelected = selectedNodeId === node.id;
          const isDrawSource = drawSourceNodeId === node.id;

          return (
            <g
              key={node.id}
              onClick={(e) => {
                e.stopPropagation();
                if (tool === "select") {
                  selectNode(node.id);
                }
                // draw-track clicks are handled in handleSvgClick via findNodeAtPoint
              }}
              style={{ cursor: tool === "select" || tool === "draw-track" ? "pointer" : undefined }}
            >
              {/* Selection / draw-source highlight */}
              {(isSelected || isDrawSource) && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={r + 4}
                  className="fill-none stroke-primary"
                  strokeWidth={2}
                  opacity={0.5}
                />
              )}

              {/* Open circle */}
              <circle
                cx={node.x}
                cy={node.y}
                r={r}
                className="fill-background stroke-foreground"
                strokeWidth={1.5}
              />

              {/* Label */}
              <text
                x={node.x}
                y={node.y - r - 4}
                textAnchor="middle"
                className="fill-foreground"
                fontSize={10}
                style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}
              >
                {node.location.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tool hint */}
      {toolHint && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 rounded-md bg-primary px-3 py-1.5 font-mono text-xs text-primary-foreground shadow-lg">
          {toolHint}
        </div>
      )}
    </div>
  );
}

// ── Geometry helper ──

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const px = a.x + t * dx;
  const py = a.y + t * dy;
  return Math.sqrt((p.x - px) ** 2 + (p.y - py) ** 2);
}
