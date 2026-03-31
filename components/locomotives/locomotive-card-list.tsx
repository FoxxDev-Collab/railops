"use client";

import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Cpu, Volume2 } from "lucide-react";
import { LocomotiveType, LocomotiveService, RollingStockStatus } from "@prisma/client";
import Link from "next/link";
import { DeleteButton } from "@/components/shared/delete-button";
import { deleteLocomotive } from "@/app/actions/locomotives";
import { SilhouetteImage } from "@/components/ui/silhouette-image";

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
  silhouette: {
    id: string;
    name: string;
    filePath: string;
    darkPath: string;
  } | null;
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

            <div className="flex">
              {loco.silhouette && (
                <div className="flex w-28 shrink-0 items-center justify-center border-r border-border/30 p-3">
                  <SilhouetteImage
                    filePath={loco.silhouette.filePath}
                    alt={loco.silhouette.name}
                    className="h-12 w-full opacity-80"
                  />
                </div>
              )}

              <div className="flex-1 min-w-0 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-mono font-medium tracking-wide truncate">
                      {loco.road} #{loco.number}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {loco.model}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
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

                <div className="flex flex-wrap gap-1 mt-2">
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

                {(loco.dccAddress || loco.hasSound) && (
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 pt-2 border-t border-border/30">
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
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
