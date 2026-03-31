"use client";

import { useState, useTransition, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  TrainFront,
  Train,
  Armchair,
  Container,
  Wrench,
  X,
  GripVertical,
  ArrowLeftRight,
  Zap,
  Plus,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { RollingStockIcon } from "./rolling-stock-svg";
import {
  addPosition,
  removePosition,
  reorderPositions,
} from "@/app/actions/consists";

// ─── Types ────────────────────────────────────────────────────────────────────

type StockType =
  | "LOCOMOTIVE"
  | "FREIGHT_CAR"
  | "PASSENGER_CAR"
  | "CABOOSE"
  | "MOW_EQUIPMENT";

interface SilhouetteData {
  filePath: string;
  darkPath: string;
  name: string;
}

interface LocomotiveStock {
  id: string;
  road: string;
  number: string;
  silhouette?: SilhouetteData | null;
}

interface GenericStock {
  id: string;
  reportingMarks: string;
  number: string;
  silhouette?: SilhouetteData | null;
}

interface ConsistPositionData {
  id: string;
  position: number;
  facing: string | null;
  locomotive: LocomotiveStock | null;
  freightCar: GenericStock | null;
  passengerCar: GenericStock | null;
  mowEquipment: GenericStock | null;
  caboose: GenericStock | null;
}

interface TrainBuilderProps {
  trainId: string;
  layoutId: string;
  consist: {
    id: string;
    positions: ConsistPositionData[];
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

const TYPE_META: Record<
  StockType,
  { label: string; icon: typeof TrainFront; shortLabel: string }
> = {
  LOCOMOTIVE: { label: "Locomotives", icon: TrainFront, shortLabel: "LOCO" },
  FREIGHT_CAR: { label: "Freight Cars", icon: Train, shortLabel: "FRT" },
  PASSENGER_CAR: { label: "Passenger Cars", icon: Armchair, shortLabel: "PAX" },
  CABOOSE: { label: "Cabooses", icon: Container, shortLabel: "CAB" },
  MOW_EQUIPMENT: { label: "MOW Equipment", icon: Wrench, shortLabel: "MOW" },
};

function getPositionType(pos: ConsistPositionData): StockType | null {
  if (pos.locomotive) return "LOCOMOTIVE";
  if (pos.freightCar) return "FREIGHT_CAR";
  if (pos.passengerCar) return "PASSENGER_CAR";
  if (pos.caboose) return "CABOOSE";
  if (pos.mowEquipment) return "MOW_EQUIPMENT";
  return null;
}

function getPositionSilhouette(pos: ConsistPositionData): SilhouetteData | null {
  const stock = pos.locomotive ?? pos.freightCar ?? pos.passengerCar ?? pos.caboose ?? pos.mowEquipment;
  return stock?.silhouette ?? null;
}

function getPositionLabel(pos: ConsistPositionData): string {
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
  positions: ConsistPositionData[],
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

// ─── Sortable Track Car ──────────────────────────────────────────────────────

function SortableTrackCar({
  pos,
  onRemove,
  isPending,
}: {
  pos: ConsistPositionData;
  onRemove: (id: string, label: string) => void;
  isPending: boolean;
}) {
  const type = getPositionType(pos);
  const label = getPositionLabel(pos);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pos.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (!type) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex flex-col items-center shrink-0 ${
        isDragging ? "opacity-30 scale-95" : ""
      }`}
    >
      {/* Remove button */}
      <button
        onClick={() => onRemove(pos.id, label)}
        disabled={isPending}
        className="absolute -top-2 -right-1 z-10 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:scale-110"
        aria-label={`Remove ${label}`}
      >
        <X className="h-3 w-3" />
      </button>

      {/* Drag handle + car */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none select-none"
      >
        <div className="flex flex-col items-center gap-0.5">
          {/* Facing indicator */}
          <div className="flex items-center gap-1">
            <GripVertical className="h-3 w-3 text-muted-foreground/40" />
            {pos.facing === "R" && (
              <ArrowLeftRight className="h-3 w-3 text-muted-foreground/60" />
            )}
          </div>

          {/* The car SVG */}
          <RollingStockIcon
            type={type}
            facing={(pos.facing as "F" | "R") ?? "F"}
            label={label}
            silhouette={getPositionSilhouette(pos)}
            className="h-12 w-auto"
          />

          {/* Label */}
          <span className="text-[10px] font-mono text-muted-foreground leading-tight text-center max-w-[72px] truncate">
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Drag Overlay Car (ghost while dragging) ────────────────────────────────

function DragOverlayCar({ pos }: { pos: ConsistPositionData }) {
  const type = getPositionType(pos);
  const label = getPositionLabel(pos);
  if (!type) return null;

  return (
    <div className="flex flex-col items-center opacity-90 scale-105">
      <RollingStockIcon
        type={type}
        facing={(pos.facing as "F" | "R") ?? "F"}
        label={label}
        silhouette={getPositionSilhouette(pos)}
        className="h-12 w-auto drop-shadow-lg"
      />
      <span className="text-[10px] font-mono text-muted-foreground leading-tight">
        {label}
      </span>
    </div>
  );
}

// ─── Inventory Item (click-to-add) ──────────────────────────────────────────

function InventoryItem({
  id,
  label,
  type,
  silhouette,
  onAdd,
  isPending,
}: {
  id: string;
  label: string;
  type: StockType;
  silhouette?: SilhouetteData | null;
  onAdd: (type: StockType, id: string) => void;
  isPending: boolean;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15 }}
      onClick={() => onAdd(type, id)}
      disabled={isPending}
      className="group flex items-center gap-2.5 w-full px-3 py-2 rounded-md
        bg-card hover:bg-accent/60 border border-border/50 hover:border-border
        transition-all duration-150 text-left disabled:opacity-40"
    >
      <RollingStockIcon type={type} silhouette={silhouette} className="h-8 w-auto shrink-0" />
      <span className="font-mono text-xs tracking-wide truncate flex-1">
        {label}
      </span>
      <Plus className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.button>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function TrainBuilder({
  consist,
  availableStock,
}: TrainBuilderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<StockType>("LOCOMOTIVE");
  const [inventoryOpen, setInventoryOpen] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const positions = consist.positions;
  const positionIds = useMemo(() => positions.map((p) => p.id), [positions]);

  const activePosition = activeId
    ? positions.find((p) => p.id === activeId)
    : null;

  // Available stock for the selected type, minus what's already in consist
  const inConsistIds = getAlreadyInConsist(positions, selectedType);

  const availableItems: { id: string; label: string; silhouette?: SilhouetteData | null }[] = useMemo(() => {
    switch (selectedType) {
      case "LOCOMOTIVE":
        return availableStock.locomotives
          .filter((l) => !inConsistIds.has(l.id))
          .map((l) => ({ id: l.id, label: `${l.road} ${l.number}`, silhouette: l.silhouette }));
      case "FREIGHT_CAR":
        return availableStock.freightCars
          .filter((c) => !inConsistIds.has(c.id))
          .map((c) => ({ id: c.id, label: `${c.reportingMarks} ${c.number}`, silhouette: c.silhouette }));
      case "PASSENGER_CAR":
        return availableStock.passengerCars
          .filter((c) => !inConsistIds.has(c.id))
          .map((c) => ({ id: c.id, label: `${c.reportingMarks} ${c.number}`, silhouette: c.silhouette }));
      case "CABOOSE":
        return availableStock.cabooses
          .filter((c) => !inConsistIds.has(c.id))
          .map((c) => ({ id: c.id, label: `${c.reportingMarks} ${c.number}`, silhouette: c.silhouette }));
      case "MOW_EQUIPMENT":
        return availableStock.mowEquipment
          .filter((c) => !inConsistIds.has(c.id))
          .map((c) => ({ id: c.id, label: `${c.reportingMarks} ${c.number}`, silhouette: c.silhouette }));
    }
  }, [selectedType, availableStock, inConsistIds]);

  // Stock counts per type
  const stockCounts = useMemo(() => {
    const counts: Record<StockType, number> = {
      LOCOMOTIVE: 0,
      FREIGHT_CAR: 0,
      PASSENGER_CAR: 0,
      CABOOSE: 0,
      MOW_EQUIPMENT: 0,
    };
    const locoIds = getAlreadyInConsist(positions, "LOCOMOTIVE");
    const frtIds = getAlreadyInConsist(positions, "FREIGHT_CAR");
    const paxIds = getAlreadyInConsist(positions, "PASSENGER_CAR");
    const cabIds = getAlreadyInConsist(positions, "CABOOSE");
    const mowIds = getAlreadyInConsist(positions, "MOW_EQUIPMENT");

    counts.LOCOMOTIVE = availableStock.locomotives.filter((l) => !locoIds.has(l.id)).length;
    counts.FREIGHT_CAR = availableStock.freightCars.filter((c) => !frtIds.has(c.id)).length;
    counts.PASSENGER_CAR = availableStock.passengerCars.filter((c) => !paxIds.has(c.id)).length;
    counts.CABOOSE = availableStock.cabooses.filter((c) => !cabIds.has(c.id)).length;
    counts.MOW_EQUIPMENT = availableStock.mowEquipment.filter((c) => !mowIds.has(c.id)).length;

    return counts;
  }, [positions, availableStock]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = positionIds.indexOf(active.id as string);
      const newIndex = positionIds.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;

      const newOrder = arrayMove(positionIds, oldIndex, newIndex);

      startTransition(async () => {
        const result = await reorderPositions(consist.id, newOrder);
        if (result.error) {
          toast.error(result.error);
        } else {
          router.refresh();
        }
      });
    },
    [positionIds, consist.id, router, startTransition]
  );

  const handleAdd = useCallback(
    (type: StockType, stockId: string) => {
      startTransition(async () => {
        const result = await addPosition(consist.id, {
          type,
          rollingStockId: stockId,
          facing: "F",
        });
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success("Added to consist");
          router.refresh();
        }
      });
    },
    [consist.id, router, startTransition]
  );

  const handleRemove = useCallback(
    (positionId: string, label: string) => {
      startTransition(async () => {
        const result = await removePosition(positionId);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success(`${label} removed`);
          router.refresh();
        }
      });
    },
    [router, startTransition]
  );

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ══════ TRACK AREA ══════ */}
      <div className="relative rounded-xl border border-border bg-card overflow-hidden">
        {/* Track bed background texture */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
            backgroundSize: "8px 8px",
          }}
        />

        {/* Direction arrow */}
        <div className="relative flex items-center justify-between px-4 pt-3 pb-1">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-chart-5" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Head End
            </span>
          </div>
          <div className="flex-1 mx-4 border-t border-dashed border-muted-foreground/20" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Rear
          </span>
        </div>

        {/* The train on rails */}
        <div className="relative px-4 pb-4">
          {positions.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={positionIds}
                strategy={horizontalListSortingStrategy}
              >
                <div className="flex items-end gap-1 overflow-x-auto pb-2 pt-2 scrollbar-thin">
                  {positions.map((pos) => (
                    <SortableTrackCar
                      key={pos.id}
                      pos={pos}
                      onRemove={handleRemove}
                      isPending={isPending}
                    />
                  ))}
                </div>
              </SortableContext>

              <DragOverlay dropAnimation={null}>
                {activePosition && <DragOverlayCar pos={activePosition} />}
              </DragOverlay>
            </DndContext>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="relative">
                {/* Empty track illustration */}
                <svg viewBox="0 0 200 20" className="w-48 h-5 text-muted-foreground/20">
                  {/* Rails */}
                  <line x1="0" y1="6" x2="200" y2="6" stroke="currentColor" strokeWidth="2" />
                  <line x1="0" y1="14" x2="200" y2="14" stroke="currentColor" strokeWidth="2" />
                  {/* Ties */}
                  {Array.from({ length: 15 }, (_, i) => (
                    <rect
                      key={i}
                      x={6 + i * 13}
                      y="2"
                      width="6"
                      height="16"
                      rx="1"
                      fill="currentColor"
                      opacity="0.5"
                    />
                  ))}
                </svg>
              </div>
              <p className="text-sm text-muted-foreground font-mono">
                Empty track — add rolling stock from inventory below
              </p>
            </div>
          )}

          {/* Rail lines at bottom */}
          <div className="relative h-[3px] mt-1">
            <div className="absolute inset-0 bg-muted-foreground/15 rounded-full" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-muted-foreground/25 to-transparent rounded-full" />
          </div>
        </div>

        {/* Consist summary bar */}
        {positions.length > 0 && (
          <div className="border-t border-border/50 bg-muted/30 px-4 py-2 flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
            <span>{positions.length} units</span>
            <span className="text-muted-foreground/30">|</span>
            <span>Drag to reorder</span>
            <span className="text-muted-foreground/30">|</span>
            <span>Hover to remove</span>
          </div>
        )}
      </div>

      {/* ══════ INVENTORY PANEL ══════ */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Inventory header */}
        <button
          onClick={() => setInventoryOpen(!inventoryOpen)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold tracking-tight">
              Rolling Stock Inventory
            </span>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
              inventoryOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        <AnimatePresence initial={false}>
          {inventoryOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              {/* Type tabs */}
              <div className="border-t border-border/50 px-4 py-2 flex gap-1.5 overflow-x-auto">
                {(Object.keys(TYPE_META) as StockType[]).map((type) => {
                  const meta = TYPE_META[type];
                  const Icon = meta.icon;
                  const count = stockCounts[type];
                  const isActive = selectedType === type;

                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150
                        ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{meta.label}</span>
                      <span className="sm:hidden">{meta.shortLabel}</span>
                      {count > 0 && (
                        <Badge
                          variant={isActive ? "secondary" : "outline"}
                          className="h-4 px-1 text-[10px] font-mono ml-0.5"
                        >
                          {count}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Item list */}
              <div className="border-t border-border/30 px-4 py-3">
                {availableItems.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[280px] overflow-y-auto pr-1">
                    <AnimatePresence mode="popLayout">
                      {availableItems.map((item) => (
                        <InventoryItem
                          key={item.id}
                          id={item.id}
                          label={item.label}
                          type={selectedType}
                          silhouette={item.silhouette}
                          onAdd={handleAdd}
                          isPending={isPending}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-6 text-muted-foreground">
                    <Train className="h-6 w-6 mb-2 opacity-40" />
                    <p className="text-xs font-mono">
                      {(() => {
                        const totalForType = (() => {
                          switch (selectedType) {
                            case "LOCOMOTIVE": return availableStock.locomotives.length;
                            case "FREIGHT_CAR": return availableStock.freightCars.length;
                            case "PASSENGER_CAR": return availableStock.passengerCars.length;
                            case "CABOOSE": return availableStock.cabooses.length;
                            case "MOW_EQUIPMENT": return availableStock.mowEquipment.length;
                          }
                        })();
                        return totalForType === 0
                          ? `No ${TYPE_META[selectedType].label.toLowerCase()} in roster`
                          : `All ${TYPE_META[selectedType].label.toLowerCase()} are in the consist`;
                      })()}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
