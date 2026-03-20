"use client";

import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { RollingStockStatus } from "@prisma/client";
import { FreightCarFormDialog } from "./freight-car-form-dialog";
import { DeleteButton } from "@/components/shared/delete-button";
import { deleteFreightCar } from "@/app/actions/freight-cars";

interface FreightCar {
  id: string;
  reportingMarks: string;
  number: string;
  carType: string;
  aarTypeCode: string | null;
  subtype: string | null;
  length: number | null;
  capacity: number | null;
  homeRoad: string | null;
  status: RollingStockStatus;
  commodities: string[];
  currentLocationId: string | null;
}

const statusColors: Record<RollingStockStatus, string> = {
  SERVICEABLE: "default",
  BAD_ORDER: "destructive",
  STORED: "secondary",
  RETIRED: "outline",
};

interface FreightCarCardListProps {
  freightCars: FreightCar[];
  layoutId: string;
}

export function FreightCarCardList({
  freightCars,
  layoutId,
}: FreightCarCardListProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {freightCars.map((car, i) => (
        <motion.div
          key={car.id}
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
                    {car.reportingMarks} {car.number}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {car.carType}
                    {car.subtype && ` — ${car.subtype}`}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <FreightCarFormDialog
                    layoutId={layoutId}
                    initialData={car}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    }
                  />
                  <DeleteButton
                    itemName={`${car.reportingMarks} ${car.number}`}
                    itemType="freight car"
                    onDelete={() => deleteFreightCar(car.id)}
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {car.aarTypeCode && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4 font-mono tracking-wider"
                  >
                    {car.aarTypeCode}
                  </Badge>
                )}
                <Badge
                  variant={statusColors[car.status] as "default" | "destructive" | "secondary" | "outline"}
                  className="text-[10px] px-1.5 py-0 h-4 font-normal"
                >
                  {car.status.replace("_", " ")}
                </Badge>
                {car.homeRoad && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0 h-4 font-normal"
                  >
                    Home: {car.homeRoad}
                  </Badge>
                )}
              </div>

              {/* Specs */}
              {(car.length || car.capacity) && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {car.length && <span>{car.length}ft</span>}
                  {car.capacity && <span>{car.capacity}T cap</span>}
                </div>
              )}

              {/* Commodities */}
              {car.commodities.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1 border-t border-border/30">
                  {car.commodities.map((commodity) => (
                    <Badge
                      key={commodity}
                      variant="secondary"
                      className="text-[9px] px-1.5 py-0 h-3.5 font-normal"
                    >
                      {commodity}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
