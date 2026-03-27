import { useCallback, useRef } from "react";
import { saveCanvasState } from "@/app/actions/canvas";
import { useMapStore } from "./use-map-store";

interface SavePayload {
  canvasId: string;
  viewport?: { x: number; y: number; zoom: number };
  nodePositions?: { id: string; x: number; y: number }[];
}

export function useAutoSave(canvasId: string) {
  const setSaveStatus = useMapStore((s) => s.setSaveStatus);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Partial<SavePayload>>({});

  const flush = useCallback(async () => {
    const payload = pendingRef.current;
    pendingRef.current = {};

    if (!payload.viewport && !payload.nodePositions) return;

    setSaveStatus("saving");
    try {
      await saveCanvasState({
        canvasId,
        viewport: payload.viewport,
        nodePositions: payload.nodePositions,
      });
      setSaveStatus("saved");
    } catch {
      setSaveStatus("unsaved");
    }
  }, [canvasId, setSaveStatus]);

  const queueSave = useCallback(
    (partial: Partial<SavePayload>) => {
      if (partial.viewport) {
        pendingRef.current.viewport = partial.viewport;
      }
      if (partial.nodePositions) {
        const existing = pendingRef.current.nodePositions ?? [];
        const map = new Map(existing.map((n) => [n.id, n]));
        for (const pos of partial.nodePositions) {
          map.set(pos.id, pos);
        }
        pendingRef.current.nodePositions = Array.from(map.values());
      }

      setSaveStatus("unsaved");

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, 1000);
    },
    [flush, setSaveStatus]
  );

  return { queueSave, flush };
}
