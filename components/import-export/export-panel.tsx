"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MapPin,
  Building2,
  TrainFront,
  Train,
  Armchair,
  Container,
  Wrench,
  Route,
  Download,
  Loader2,
} from "lucide-react";
import { exportResource } from "@/app/actions/csv-export";
import { triggerDownload, makeFilename } from "./csv-trigger-download";
import {
  type ResourceType,
  resourceTypeLabels,
} from "@/lib/csv/columns";

const resourceIcons: Record<ResourceType, React.ElementType> = {
  locations: MapPin,
  industries: Building2,
  locomotives: TrainFront,
  freightCars: Train,
  passengerCars: Armchair,
  cabooses: Container,
  mowEquipment: Wrench,
  trains: Route,
};

const allTypes: ResourceType[] = [
  "locations",
  "industries",
  "locomotives",
  "freightCars",
  "passengerCars",
  "cabooses",
  "mowEquipment",
  "trains",
];

interface ExportPanelProps {
  layoutId: string;
}

export function ExportPanel({ layoutId }: ExportPanelProps) {
  const [selected, setSelected] = useState<Set<ResourceType>>(new Set());
  const [isPending, startTransition] = useTransition();

  function toggle(type: ResourceType) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function handleExport() {
    startTransition(async () => {
      for (const type of selected) {
        try {
          const csv = await exportResource(layoutId, type);
          triggerDownload(csv, makeFilename(type));
        } catch (e) {
          console.error(`Export failed for ${type}:`, e);
        }
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Export Data</h3>
        <p className="text-sm text-muted-foreground">
          Select which resource types to export as CSV files.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {allTypes.map((type) => {
          const Icon = resourceIcons[type];
          const isChecked = selected.has(type);
          return (
            <label
              key={type}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                isChecked
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <Checkbox
                checked={isChecked}
                onCheckedChange={() => toggle(type)}
              />
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {resourceTypeLabels[type]}
              </span>
            </label>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={handleExport}
          disabled={selected.size === 0 || isPending}
        >
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export {selected.size > 0 ? `(${selected.size})` : ""}
        </Button>
        {selected.size === 0 && (
          <span className="text-xs text-muted-foreground">
            Select at least one resource type
          </span>
        )}
      </div>
    </div>
  );
}
