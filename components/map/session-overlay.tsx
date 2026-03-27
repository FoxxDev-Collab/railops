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
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between bg-gradient-to-r from-red-900 via-red-800 to-red-900 px-4 py-1.5">
        <div className="flex items-center gap-2 font-mono text-xs font-bold text-red-300">
          <span className="inline-block h-2 w-2 rounded-full bg-red-400 animate-pulse" />
          LIVE SESSION — {state.sessionName}
        </div>
        <div className="font-mono text-[11px] text-red-300">
          {state.trains.length} train{state.trains.length !== 1 ? "s" : ""} •{" "}
          {isDispatcher ? "Dispatcher" : "Crew"} • Poll: {pollInterval / 1000}s
        </div>
      </div>

      {/* Train list overlay (bottom-left) */}
      <div className="absolute bottom-4 left-16 z-20 rounded-lg border border-slate-700 bg-[#0f172a]/90 p-3 font-mono text-xs backdrop-blur-sm">
        <div className="text-slate-400 font-bold mb-2">Active Trains</div>
        {state.trains.map((train) => (
          <div
            key={train.id}
            className="flex items-center gap-2 py-1 text-slate-300"
          >
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                train.status === "EN_ROUTE"
                  ? "bg-green-400"
                  : train.status === "HOLD"
                    ? "bg-amber-400"
                    : "bg-slate-500"
              }`}
            />
            <span className="font-bold">{train.trainName}</span>
            <span className="text-slate-500">{train.status}</span>
          </div>
        ))}
        {state.trains.length === 0 && (
          <div className="text-slate-500">No trains assigned</div>
        )}
      </div>
    </>
  );
}
