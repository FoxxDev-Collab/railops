"use client";

import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, ArrowRight } from "lucide-react";
import { WaybillStatus, LoadStatus } from "@prisma/client";
import Link from "next/link";
import { DeleteButton } from "@/components/shared/delete-button";
import { deleteWaybill } from "@/app/actions/waybills";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WaybillPanel {
  panelNumber: number;
  loadStatus: LoadStatus;
  commodity: string | null;
  weight: number | null;
  specialInstructions: string | null;
  routeVia: string | null;
  originId: string | null;
  shipperIndustryId: string | null;
  destinationId: string | null;
  consigneeIndustryId: string | null;
  origin?: { id: string; name: string } | null;
  destination?: { id: string; name: string } | null;
  shipperIndustry?: { id: string; name: string } | null;
  consigneeIndustry?: { id: string; name: string } | null;
}

interface Waybill {
  id: string;
  status: WaybillStatus;
  isReturnable: boolean;
  notes: string | null;
  currentPanel: number;
  panels: WaybillPanel[];
  carCard: {
    freightCarId: string;
    freightCar: {
      id: string;
      reportingMarks: string;
      number: string;
    };
  } | null;
}

interface WaybillCardListProps {
  waybills: Waybill[];
  layoutId: string;
}

// ─── Badge variant mappings ───────────────────────────────────────────────────

const statusVariant: Record<WaybillStatus, "default" | "secondary" | "outline" | "destructive"> = {
  PENDING: "secondary",
  IN_TRANSIT: "default",
  DELIVERED: "outline",
  RETURNED_EMPTY: "secondary",
};

const statusLabel: Record<WaybillStatus, string> = {
  PENDING: "Pending",
  IN_TRANSIT: "In Transit",
  DELIVERED: "Delivered",
  RETURNED_EMPTY: "Returned Empty",
};

const loadBadgeVariant: Record<LoadStatus, "default" | "secondary"> = {
  LOADED: "default",
  EMPTY: "secondary",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function WaybillCardList({ waybills, layoutId }: WaybillCardListProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {waybills.map((waybill, i) => {
        const activePanel =
          waybill.panels.find((p) => p.panelNumber === waybill.currentPanel) ??
          waybill.panels[0];

        const car = waybill.carCard?.freightCar;
        const carLabel = car
          ? `${car.reportingMarks} ${car.number}`
          : "Unassigned";

        return (
          <motion.div
            key={waybill.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.25, ease: "easeOut" }}
          >
            <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/20">
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-mono tracking-wide">
                      {carLabel}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Panel {activePanel?.panelNumber ?? 1} of {waybill.panels.length}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      asChild
                    >
                      <Link
                        href={`/dashboard/railroad/${layoutId}/waybills/${waybill.id}/edit`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <DeleteButton
                      itemName={`waybill for ${carLabel}`}
                      itemType="waybill"
                      onDelete={() => deleteWaybill(waybill.id, layoutId)}
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0 space-y-3">
                {/* Status + load status badges */}
                <div className="flex flex-wrap gap-1.5">
                  <Badge
                    variant={statusVariant[waybill.status]}
                    className="text-[10px] px-1.5 py-0 h-4 font-normal"
                  >
                    {statusLabel[waybill.status]}
                  </Badge>
                  {activePanel && (
                    <Badge
                      variant={loadBadgeVariant[activePanel.loadStatus]}
                      className="text-[10px] px-1.5 py-0 h-4 font-normal"
                    >
                      {activePanel.loadStatus === "LOADED" ? "Loaded" : "Empty"}
                    </Badge>
                  )}
                  {waybill.isReturnable && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-4 font-normal"
                    >
                      Returnable
                    </Badge>
                  )}
                </div>

                {/* Commodity */}
                {activePanel?.commodity && (
                  <p className="text-sm font-medium truncate">
                    {activePanel.commodity}
                  </p>
                )}

                {/* Origin → Destination */}
                {(activePanel?.origin || activePanel?.destination) && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {activePanel.origin && (
                      <span className="truncate max-w-[100px]">
                        {activePanel.origin.name}
                      </span>
                    )}
                    {activePanel.origin && activePanel.destination && (
                      <ArrowRight className="h-3 w-3 shrink-0" />
                    )}
                    {activePanel.destination && (
                      <span className="truncate max-w-[100px]">
                        {activePanel.destination.name}
                      </span>
                    )}
                  </div>
                )}

                {/* Shipper → Consignee industries */}
                {(activePanel?.shipperIndustry || activePanel?.consigneeIndustry) && (
                  <div className="flex flex-wrap gap-1 pt-1 border-t border-border/30">
                    {activePanel.shipperIndustry && (
                      <Badge
                        variant="secondary"
                        className="text-[9px] px-1.5 py-0 h-3.5 font-normal"
                      >
                        From: {activePanel.shipperIndustry.name}
                      </Badge>
                    )}
                    {activePanel.consigneeIndustry && (
                      <Badge
                        variant="secondary"
                        className="text-[9px] px-1.5 py-0 h-3.5 font-normal"
                      >
                        To: {activePanel.consigneeIndustry.name}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
