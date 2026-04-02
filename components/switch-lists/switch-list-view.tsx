"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { generateSwitchList } from "@/app/actions/switch-lists";
import {
  RefreshCw,
  Printer,
  ArrowDownToLine,
  ArrowUpFromLine,
  PackageX,
} from "lucide-react";
import type { SwitchListEntry } from "@prisma/client";

interface SwitchListViewProps {
  switchList: {
    id: string;
    generatedAt: Date;
    notes: string | null;
    entries: SwitchListEntry[];
  };
  train: {
    trainNumber: string;
    trainName: string | null;
    origin?: { name: string } | null;
    destination?: { name: string } | null;
  };
  onRegenerate: () => void;
  consistId: string;
  layoutId: string;
}

export function SwitchListView({
  switchList,
  train,
  onRegenerate,
  consistId,
  layoutId,
}: SwitchListViewProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRegenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateSwitchList(consistId, layoutId);
      if ("error" in result && result.error) {
        setError(result.error);
      } else {
        onRegenerate();
      }
    });
  }

  const pickupCount = switchList.entries.filter((e) => e.action === "PICKUP").length;
  const setoutCount = switchList.entries.filter((e) => e.action === "SETOUT").length;

  const generatedAtFormatted = new Date(switchList.generatedAt).toLocaleString(
    undefined,
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );

  const printDateFormatted = new Date(switchList.generatedAt).toLocaleDateString(
    undefined,
    { month: "long", day: "numeric", year: "numeric" }
  );

  return (
    <>
      {/* ── Print-only header ── */}
      <div className="hidden print:block mb-6">
        <div className="border-b-2 border-black pb-3 mb-4">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-gray-500 mb-1">
            Model Rail Ops Operations
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-black">
            Switch List
          </h1>
        </div>
        <div className="flex justify-between items-end text-sm">
          <div>
            <p className="font-bold text-lg">
              Train {train.trainNumber}
              {train.trainName ? ` — ${train.trainName}` : ""}
            </p>
            {(train.origin || train.destination) && (
              <p className="text-gray-600">
                {train.origin?.name ?? "Origin TBD"} →{" "}
                {train.destination?.name ?? "Destination TBD"}
              </p>
            )}
          </div>
          <div className="text-right text-gray-500">
            <p>{printDateFormatted}</p>
            <p>
              {pickupCount} pickup{pickupCount !== 1 ? "s" : ""} ·{" "}
              {setoutCount} setout{setoutCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* ── Screen header ── */}
      <div className="print:hidden space-y-4">
        {/* Train info bar */}
        <div className="rounded-lg border bg-muted/30 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-base">
                Train {train.trainNumber}
              </span>
              {train.trainName && (
                <span className="text-muted-foreground text-sm">
                  {train.trainName}
                </span>
              )}
            </div>
            {(train.origin || train.destination) && (
              <p className="text-xs text-muted-foreground">
                {train.origin?.name ?? "Origin TBD"}
                {" → "}
                {train.destination?.name ?? "Destination TBD"}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right text-xs text-muted-foreground mr-2 hidden sm:block">
              <p>Generated {generatedAtFormatted}</p>
              <p>
                {pickupCount} pickup{pickupCount !== 1 ? "s" : ""} ·{" "}
                {setoutCount} setout{setoutCount !== 1 ? "s" : ""}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={isPending}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 mr-1.5 ${isPending ? "animate-spin" : ""}`}
              />
              Regenerate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              Print
            </Button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
            {error}
          </p>
        )}
      </div>

      {/* ── Summary pills (screen only) ── */}
      <div className="print:hidden flex items-center gap-3 mt-4">
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          <ArrowUpFromLine className="h-3 w-3" />
          {pickupCount} Pickup{pickupCount !== 1 ? "s" : ""}
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
          <ArrowDownToLine className="h-3 w-3" />
          {setoutCount} Setout{setoutCount !== 1 ? "s" : ""}
        </div>
        <Separator orientation="vertical" className="h-4 print:hidden" />
        <span className="text-xs text-muted-foreground">
          {switchList.entries.length} total move{switchList.entries.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Empty state ── */}
      {switchList.entries.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed py-12 flex flex-col items-center gap-3 text-center">
          <PackageX className="h-8 w-8 text-muted-foreground/50" />
          <div className="space-y-1">
            <p className="text-sm font-medium">No switch list entries</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Ensure freight cars in the consist have waybills assigned, then
              regenerate.
            </p>
          </div>
        </div>
      ) : (
        /* ── Entries table ── */
        <div className="mt-4 overflow-x-auto rounded-lg border print:border-0 print:rounded-none">
          <table className="w-full text-sm print:text-xs">
            <thead>
              <tr className="border-b bg-muted/50 print:bg-transparent print:border-b-2 print:border-black">
                <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground print:text-black w-[90px]">
                  Action
                </th>
                <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground print:text-black">
                  Car
                </th>
                <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground print:text-black">
                  Commodity
                </th>
                <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground print:text-black">
                  Destination
                </th>
                <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground print:text-black">
                  Track / Industry
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {switchList.entries.map((entry, idx) => (
                <tr
                  key={entry.id}
                  className={`hover:bg-muted/30 transition-colors print:hover:bg-transparent ${
                    idx % 2 === 0 ? "" : "bg-muted/10 print:bg-transparent"
                  }`}
                >
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {entry.action === "PICKUP" ? (
                      <span className="print:hidden">
                        <Badge
                          variant="outline"
                          className="border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium text-xs gap-1"
                        >
                          <ArrowUpFromLine className="h-2.5 w-2.5" />
                          Pickup
                        </Badge>
                      </span>
                    ) : (
                      <span className="print:hidden">
                        <Badge
                          variant="outline"
                          className="border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium text-xs gap-1"
                        >
                          <ArrowDownToLine className="h-2.5 w-2.5" />
                          Setout
                        </Badge>
                      </span>
                    )}
                    {/* Print version */}
                    <span className="hidden print:inline font-bold">
                      {entry.action === "PICKUP" ? "PICKUP" : "SETOUT"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono font-medium whitespace-nowrap">
                    {entry.carDescription}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground print:text-black">
                    {entry.commodity ?? (
                      <span className="text-muted-foreground/50 print:text-gray-400">
                        —
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground print:text-black">
                    {entry.destinationDesc ?? (
                      <span className="text-muted-foreground/50 print:text-gray-400">
                        —
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground print:text-black">
                    {entry.trackAssignment ?? (
                      <span className="text-muted-foreground/50 print:text-gray-400">
                        —
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Print footer ── */}
      <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-xs text-gray-400 flex justify-between">
        <span>Model Rail Ops · modelrailops.com</span>
        <span>Generated {printDateFormatted}</span>
      </div>
    </>
  );
}
