"use client";

import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { MOWEquipmentType, RollingStockStatus } from "@prisma/client";
import { DeleteButton } from "@/components/shared/delete-button";
import { deleteMOWEquipment } from "@/app/actions/mow-equipment";
import { SilhouetteImage } from "@/components/ui/silhouette-image";

interface MOWEquipment {
  id: string;
  reportingMarks: string;
  number: string;
  equipmentType: MOWEquipmentType;
  description: string | null;
  length: number | null;
  status: RollingStockStatus;
  silhouette: {
    id: string;
    name: string;
    filePath: string;
    darkPath: string;
  } | null;
}

const equipmentTypeLabels: Record<MOWEquipmentType, string> = {
  BALLAST_CAR: "Ballast Car",
  CRANE: "Crane",
  TOOL_CAR: "Tool Car",
  TAMPER: "Tamper",
  SPREADER: "Spreader",
  FLAT_WITH_RAILS: "Flat with Rails",
  WEED_SPRAYER: "Weed Sprayer",
  SCALE_TEST: "Scale Test",
  OTHER: "Other",
};

const statusColors: Record<RollingStockStatus, string> = {
  SERVICEABLE: "default",
  BAD_ORDER: "destructive",
  STORED: "secondary",
  RETIRED: "outline",
};

interface MOWEquipmentCardListProps {
  mowEquipment: MOWEquipment[];
  layoutId: string;
}

export function MOWEquipmentCardList({
  mowEquipment,
  layoutId,
}: MOWEquipmentCardListProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {mowEquipment.map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, duration: 0.25, ease: "easeOut" }}
        >
          <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/20">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {item.silhouette && (
              <div className="px-4 pt-4 flex justify-center">
                <SilhouetteImage
                  filePath={item.silhouette.filePath}
                  darkPath={item.silhouette.darkPath}
                  alt={item.silhouette.name}
                  className="h-12 w-auto opacity-80"
                />
              </div>
            )}

            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base font-mono tracking-wide">
                    {item.reportingMarks} {item.number}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {equipmentTypeLabels[item.equipmentType]}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    asChild
                  >
                    <Link href={`/dashboard/railroad/${layoutId}/mow-equipment/${item.id}/edit`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <DeleteButton
                    itemName={`${item.reportingMarks} ${item.number}`}
                    itemType="MOW equipment"
                    onDelete={() => deleteMOWEquipment(item.id)}
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                <Badge
                  variant={statusColors[item.status] as "default" | "destructive" | "secondary" | "outline"}
                  className="text-[10px] px-1.5 py-0 h-4 font-normal"
                >
                  {item.status.replace("_", " ")}
                </Badge>
              </div>

              {/* Specs */}
              {item.length && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{item.length}ft</span>
                </div>
              )}

              {/* Description */}
              {item.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 pt-1 border-t border-border/30">
                  {item.description}
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
