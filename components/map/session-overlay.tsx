"use client";

import { useCallback, useEffect, useState } from "react";

interface SessionTrain {
  id: string;
  trainId: string;
  trainName: string;
  status: string;
  locationId: string | null;
}

interface SessionState {
  timestamp: number;
  sessionName: string;
  trains: SessionTrain[];
}

interface SessionOverlayProps {
  sessionId: string;
  isDispatcher: boolean;
}

export function SessionOverlay({ sessionId, isDispatcher }: SessionOverlayProps) {
  const [state, setState] = useState<SessionState | null>(null);
  const [pollInterval] = useState(5000);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/session/${sessionId}/state`);
      if (res.ok) {
        const data = await res.json();
        setState(data);
      }
    } catch {
      // Silently retry on next poll
    }
  }, [sessionId]);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, pollInterval);
    return () => clearInterval(interval);
  }, [fetchState, pollInterval]);

  if (!state) return null;

  return (
    <>
      {/* Session banner */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between bg-destructive/90 backdrop-blur-sm px-4 py-1.5 border-b border-destructive">
        <div className="flex items-center gap-2 font-mono text-xs font-bold text-destructive-foreground">
          <span className="inline-block h-2 w-2 rounded-full bg-destructive-foreground animate-pulse" />
          LIVE SESSION — {state.sessionName}
        </div>
        <div className="font-mono text-[11px] text-destructive-foreground/80">
          {state.trains.length} train{state.trains.length !== 1 ? "s" : ""} ·{" "}
          {isDispatcher ? "Dispatcher" : "Crew"} · {pollInterval / 1000}s
        </div>
      </div>

      {/* Train list overlay (bottom-left) */}
      <div className="absolute bottom-4 left-16 z-20 rounded-lg border border-border bg-card/95 p-3 font-mono text-xs backdrop-blur-sm shadow-lg">
        <div className="text-muted-foreground font-bold mb-2 tracking-wider text-[10px]">ACTIVE TRAINS</div>
        {state.trains.map((train) => (
          <div
            key={train.id}
            className="flex items-center gap-2 py-1 text-foreground"
          >
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                train.status === "EN_ROUTE"
                  ? "bg-green-500"
                  : train.status === "HOLD"
                    ? "bg-amber-500"
                    : "bg-muted-foreground"
              }`}
            />
            <span className="font-bold">{train.trainName}</span>
            <span className="text-muted-foreground">{train.status}</span>
          </div>
        ))}
        {state.trains.length === 0 && (
          <div className="text-muted-foreground">No trains assigned</div>
        )}
      </div>
    </>
  );
}
