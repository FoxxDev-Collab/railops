"use client";

import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Cpu, Volume2 } from "lucide-react";
import { LocomotiveType, LocomotiveService, RollingStockStatus } from "@prisma/client";
import Link from "next/link";
import { DeleteButton } from "@/components/shared/delete-button";
import { deleteLocomotive } from "@/app/actions/locomotives";

interface Locomotive {
  id: string;
  road: string;
  number: string;
  model: string;
  locomotiveType: LocomotiveType;
  serviceType: LocomotiveService;
  horsepower: number | null;
  status: RollingStockStatus;
  dccAddress: number | null;
  decoderManufacturer: string | null;
  decoderModel: string | null;
  hasSound: boolean;
  length: number | null;
  fuelType: string | null;
  canPull: number | null;
  currentLocationId: string | null;
}

const typeLabels: Record<LocomotiveType, string> = {
  STEAM: "Steam",
  DIESEL_ROAD: "Diesel Road",
  DIESEL_SWITCHER: "Switcher",
  DIESEL_CAB: "Cab Unit",
  ELECTRIC: "Electric",
};

const statusColors: Record<RollingStockStatus, string> = {
  SERVICEABLE: "default",
  BAD_ORDER: "destructive",
  STORED: "secondary",
  RETIRED: "outline",
};

interface LocomotiveCardListProps {
  locomotives: Locomotive[];
  layoutId: string;
}

export function LocomotiveCardList({
  locomotives,
  layoutId,
}: LocomotiveCardListProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {locomotives.map((loco, i) => (
        <motion.div
          key={loco.id}
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
                    {loco.road} #{loco.number}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {loco.model}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    asChild
                  >
                    <Link href={`/dashboard/railroad/${layoutId}/locomotives/${loco.id}/edit`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <DeleteButton
                    itemName={`${loco.road} #${loco.number}`}
                    itemType="locomotive"
                    onDelete={() => deleteLocomotive(loco.id)}
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                  {typeLabels[loco.locomotiveType]}
                </Badge>
                <Badge
                  variant={statusColors[loco.status] as "default" | "destructive" | "secondary" | "outline"}
                  className="text-[10px] px-1.5 py-0 h-4 font-normal"
                >
                  {loco.status.replace("_", " ")}
                </Badge>
                {loco.horsepower && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                    {loco.horsepower} HP
                  </Badge>
                )}
              </div>

              {/* DCC info */}
              {(loco.dccAddress || loco.hasSound) && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t border-border/30">
                  {loco.dccAddress && (
                    <span className="flex items-center gap-1">
                      <Cpu className="h-3 w-3" />
                      <span className="font-mono">DCC {loco.dccAddress}</span>
                    </span>
                  )}
                  {loco.hasSound && (
                    <span className="flex items-center gap-1">
                      <Volume2 className="h-3 w-3" />
                      Sound
                    </span>
                  )}
                  {loco.decoderManufacturer && (
                    <span className="text-muted-foreground/50">
                      {loco.decoderManufacturer}
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
