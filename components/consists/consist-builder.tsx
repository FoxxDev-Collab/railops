"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  TrainFront,
  Train,
  Armchair,
  Container,
  Wrench,
  X,
  Plus,
  ArrowLeftRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { addPosition, removePosition } from "@/app/actions/consists";

// ─── Types ────────────────────────────────────────────────────────────────────

type StockType =
  | "LOCOMOTIVE"
  | "FREIGHT_CAR"
  | "PASSENGER_CAR"
  | "CABOOSE"
  | "MOW_EQUIPMENT";

interface LocomotiveStock {
  id: string;
  road: string;
  number: string;
}

interface GenericStock {
  id: string;
  reportingMarks: string;
  number: string;
}

interface ConsistPosition {
  id: string;
  position: number;
  facing: string | null;
  locomotive: LocomotiveStock | null;
  freightCar: GenericStock | null;
  passengerCar: GenericStock | null;
  mowEquipment: GenericStock | null;
  caboose: GenericStock | null;
}

interface ConsistBuilderProps {
  trainId: string;
  layoutId: string;
  consist: {
    id: string;
    positions: ConsistPosition[];
  };
  availableStock: {
    locomotives: LocomotiveStock[];
    freightCars: GenericStock[];
    passengerCars: GenericStock[];
    cabooses: GenericStock[];
    mowEquipment: GenericStock[];
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<StockType, string> = {
  LOCOMOTIVE: "Locomotive",
  FREIGHT_CAR: "Freight Car",
  PASSENGER_CAR: "Passenger Car",
  CABOOSE: "Caboose",
  MOW_EQUIPMENT: "MOW Equipment",
};

function TypeIcon({
  type,
  className,
}: {
  type: StockType;
  className?: string;
}) {
  const props = { className: className ?? "h-3.5 w-3.5" };
  switch (type) {
    case "LOCOMOTIVE":
      return <TrainFront {...props} />;
    case "FREIGHT_CAR":
      return <Train {...props} />;
    case "PASSENGER_CAR":
      return <Armchair {...props} />;
    case "CABOOSE":
      return <Container {...props} />;
    case "MOW_EQUIPMENT":
      return <Wrench {...props} />;
  }
}

function getPositionType(pos: ConsistPosition): StockType | null {
  if (pos.locomotive) return "LOCOMOTIVE";
  if (pos.freightCar) return "FREIGHT_CAR";
  if (pos.passengerCar) return "PASSENGER_CAR";
  if (pos.caboose) return "CABOOSE";
  if (pos.mowEquipment) return "MOW_EQUIPMENT";
  return null;
}

function getPositionLabel(pos: ConsistPosition): string {
  if (pos.locomotive) return `${pos.locomotive.road} ${pos.locomotive.number}`;
  if (pos.freightCar)
    return `${pos.freightCar.reportingMarks} ${pos.freightCar.number}`;
  if (pos.passengerCar)
    return `${pos.passengerCar.reportingMarks} ${pos.passengerCar.number}`;
  if (pos.caboose)
    return `${pos.caboose.reportingMarks} ${pos.caboose.number}`;
  if (pos.mowEquipment)
    return `${pos.mowEquipment.reportingMarks} ${pos.mowEquipment.number}`;
  return "Unknown";
}

function getAlreadyInConsist(
  positions: ConsistPosition[],
  type: StockType
): Set<string> {
  const ids = new Set<string>();
  for (const pos of positions) {
    switch (type) {
      case "LOCOMOTIVE":
        if (pos.locomotive) ids.add(pos.locomotive.id);
        break;
      case "FREIGHT_CAR":
        if (pos.freightCar) ids.add(pos.freightCar.id);
        break;
      case "PASSENGER_CAR":
        if (pos.passengerCar) ids.add(pos.passengerCar.id);
        break;
      case "CABOOSE":
        if (pos.caboose) ids.add(pos.caboose.id);
        break;
      case "MOW_EQUIPMENT":
        if (pos.mowEquipment) ids.add(pos.mowEquipment.id);
        break;
    }
  }
  return ids;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ConsistBuilder({
  consist,
  availableStock,
}: ConsistBuilderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedType, setSelectedType] = useState<StockType>("LOCOMOTIVE");
  const [selectedStockId, setSelectedStockId] = useState<string>("");
  const [facing, setFacing] = useState<"F" | "R">("F");

  const inConsistIds = getAlreadyInConsist(consist.positions, selectedType);

  const availableForType: { id: string; label: string }[] = (() => {
    switch (selectedType) {
      case "LOCOMOTIVE":
        return availableStock.locomotives
          .filter((l) => !inConsistIds.has(l.id))
          .map((l) => ({ id: l.id, label: `${l.road} ${l.number}` }));
      case "FREIGHT_CAR":
        return availableStock.freightCars
          .filter((c) => !inConsistIds.has(c.id))
          .map((c) => ({
            id: c.id,
            label: `${c.reportingMarks} ${c.number}`,
          }));
      case "PASSENGER_CAR":
        return availableStock.passengerCars
          .filter((c) => !inConsistIds.has(c.id))
          .map((c) => ({
            id: c.id,
            label: `${c.reportingMarks} ${c.number}`,
          }));
      case "CABOOSE":
        return availableStock.cabooses
          .filter((c) => !inConsistIds.has(c.id))
          .map((c) => ({
            id: c.id,
            label: `${c.reportingMarks} ${c.number}`,
          }));
      case "MOW_EQUIPMENT":
        return availableStock.mowEquipment
          .filter((c) => !inConsistIds.has(c.id))
          .map((c) => ({
            id: c.id,
            label: `${c.reportingMarks} ${c.number}`,
          }));
    }
  })();

  function handleTypeChange(value: string) {
    setSelectedType(value as StockType);
    setSelectedStockId("");
  }

  function handleAdd() {
    if (!selectedStockId) return;

    startTransition(async () => {
      const result = await addPosition(consist.id, {
        type: selectedType,
        rollingStockId: selectedStockId,
        facing,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Equipment added to consist");
        setSelectedStockId("");
        router.refresh();
      }
    });
  }

  function handleRemove(positionId: string, label: string) {
    startTransition(async () => {
      const result = await removePosition(positionId);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${label} removed from consist`);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Consist Table */}
      {consist.positions.length > 0 ? (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="w-10 px-3 py-2.5 text-left text-xs font-medium text-muted-foreground tracking-wider">
                  #
                </th>
                <th className="w-28 px-3 py-2.5 text-left text-xs font-medium text-muted-foreground tracking-wider">
                  Type
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground tracking-wider">
                  Equipment
                </th>
                <th className="w-16 px-3 py-2.5 text-center text-xs font-medium text-muted-foreground tracking-wider">
                  Facing
                </th>
                <th className="w-12 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {consist.positions.map((pos) => {
                const type = getPositionType(pos);
                const label = getPositionLabel(pos);
                return (
                  <tr
                    key={pos.id}
                    className="group bg-background hover:bg-muted/30 transition-colors duration-100"
                  >
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground tabular-nums">
                      {pos.position}
                    </td>
                    <td className="px-3 py-2.5">
                      {type && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <TypeIcon type={type} />
                          <span>{TYPE_LABELS[type]}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono font-medium tracking-wide">
                      {label}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <Badge
                        variant={
                          pos.facing === "R" ? "secondary" : "outline"
                        }
                        className="text-[10px] px-1.5 py-0 h-4 font-mono"
                      >
                        {pos.facing ?? "F"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={isPending}
                        onClick={() => handleRemove(pos.id, label)}
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all duration-150"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 rounded-lg border border-dashed border-border bg-muted/20 space-y-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted/60">
            <Train className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            No rolling stock in consist. Add equipment below.
          </p>
        </div>
      )}

      {/* Add Equipment */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Equipment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Type selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground tracking-wide">
                Type
              </label>
              <Select value={selectedType} onValueChange={handleTypeChange}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_LABELS) as StockType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      <div className="flex items-center gap-2">
                        <TypeIcon type={t} />
                        <span>{TYPE_LABELS[t]}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Equipment selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground tracking-wide">
                Equipment
              </label>
              <Select
                value={selectedStockId}
                onValueChange={setSelectedStockId}
                disabled={availableForType.length === 0}
              >
                <SelectTrigger className="h-9">
                  <SelectValue
                    placeholder={
                      availableForType.length === 0
                        ? "None available"
                        : "Select equipment"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableForType.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      <span className="font-mono">{item.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Facing toggle */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground tracking-wide">
                Facing
              </label>
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  variant={facing === "F" ? "default" : "outline"}
                  size="sm"
                  className="flex-1 h-9 font-mono"
                  onClick={() => setFacing("F")}
                >
                  F
                </Button>
                <Button
                  type="button"
                  variant={facing === "R" ? "default" : "outline"}
                  size="sm"
                  className="flex-1 h-9 font-mono"
                  onClick={() => setFacing("R")}
                >
                  <ArrowLeftRight className="h-3.5 w-3.5 mr-1" />R
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          <Button
            onClick={handleAdd}
            disabled={!selectedStockId || isPending}
            className="w-full sm:w-auto transition-all duration-150 hover:shadow-md"
          >
            <Plus className="mr-2 h-4 w-4" />
            {isPending ? "Adding..." : "Add to Consist"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
