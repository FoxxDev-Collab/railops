"use client";

import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { CabooseType, RollingStockStatus } from "@prisma/client";
import { DeleteButton } from "@/components/shared/delete-button";
import { deleteCaboose } from "@/app/actions/cabooses";
import { SilhouetteImage } from "@/components/ui/silhouette-image";

interface Caboose {
  id: string;
  reportingMarks: string;
  number: string;
  cabooseType: CabooseType;
  road: string | null;
  length: number | null;
  status: RollingStockStatus;
  silhouette: {
    id: string;
    name: string;
    filePath: string;
    darkPath: string;
  } | null;
}

const cabooseTypeLabels: Record<CabooseType, string> = {
  STANDARD: "Standard",
  EXTENDED_VISION: "Extended Vision",
  BAY_WINDOW: "Bay Window",
  TRANSFER: "Transfer",
  BOBBER: "Bobber",
};

const statusColors: Record<RollingStockStatus, string> = {
  SERVICEABLE: "default",
  BAD_ORDER: "destructive",
  STORED: "secondary",
  RETIRED: "outline",
};

interface CabooseCardListProps {
  cabooses: Caboose[];
  layoutId: string;
}

export function CabooseCardList({ cabooses, layoutId }: CabooseCardListProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cabooses.map((caboose, i) => (
        <motion.div
          key={caboose.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, duration: 0.25, ease: "easeOut" }}
        >
          <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/20">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="flex">
              {caboose.silhouette && (
                <div className="flex w-28 shrink-0 items-center justify-center border-r border-border/30 p-3">
                  <SilhouetteImage
                    filePath={caboose.silhouette.filePath}
                    alt={caboose.silhouette.name}
                    className="h-12 w-full opacity-80"
                  />
                </div>
              )}

              <div className="flex-1 min-w-0 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-mono font-medium tracking-wide truncate">
                      {caboose.reportingMarks} {caboose.number}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {cabooseTypeLabels[caboose.cabooseType]}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      asChild
                    >
                      <Link
                        href={`/dashboard/railroad/${layoutId}/cabooses/${caboose.id}/edit`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <DeleteButton
                      itemName={`${caboose.reportingMarks} ${caboose.number}`}
                      itemType="caboose"
                      onDelete={() => deleteCaboose(caboose.id)}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mt-2">
                  <Badge
                    variant={
                      statusColors[caboose.status] as
                        | "default"
                        | "destructive"
                        | "secondary"
                        | "outline"
                    }
                    className="text-[10px] px-1.5 py-0 h-4 font-normal"
                  >
                    {caboose.status.replace("_", " ")}
                  </Badge>
                  {caboose.road && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 h-4 font-normal"
                    >
                      {caboose.road}
                    </Badge>
                  )}
                </div>

                {caboose.length && (
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                    <span>{caboose.length}ft</span>
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
