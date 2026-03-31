"use client";

import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { RollingStockStatus, PassengerCarType, ClassOfService } from "@prisma/client";
import { DeleteButton } from "@/components/shared/delete-button";
import { deletePassengerCar } from "@/app/actions/passenger-cars";
import { SilhouetteImage } from "@/components/ui/silhouette-image";

interface PassengerCar {
  id: string;
  reportingMarks: string;
  number: string;
  carName: string | null;
  carType: PassengerCarType;
  seats: number | null;
  berths: number | null;
  classOfService: ClassOfService;
  length: number | null;
  status: RollingStockStatus;
  silhouette: {
    id: string;
    name: string;
    filePath: string;
    darkPath: string;
  } | null;
}

const statusColors: Record<RollingStockStatus, string> = {
  SERVICEABLE: "default",
  BAD_ORDER: "destructive",
  STORED: "secondary",
  RETIRED: "outline",
};

const carTypeLabels: Record<PassengerCarType, string> = {
  COACH: "Coach",
  SLEEPER: "Sleeper",
  DINER: "Diner",
  LOUNGE: "Lounge",
  BAGGAGE: "Baggage",
  RPO: "RPO",
  COMBINE: "Combine",
  OBSERVATION: "Observation",
};

const classOfServiceLabels: Record<ClassOfService, string> = {
  FIRST: "First Class",
  BUSINESS: "Business",
  COACH: "Coach",
};

interface PassengerCarCardListProps {
  passengerCars: PassengerCar[];
  layoutId: string;
}

export function PassengerCarCardList({
  passengerCars,
  layoutId,
}: PassengerCarCardListProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {passengerCars.map((car, i) => (
        <motion.div
          key={car.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, duration: 0.25, ease: "easeOut" }}
        >
          <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/20">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {car.silhouette && (
              <div className="px-4 pt-4 flex justify-center">
                <SilhouetteImage
                  filePath={car.silhouette.filePath}
                  darkPath={car.silhouette.darkPath}
                  alt={car.silhouette.name}
                  className="h-12 w-auto opacity-80"
                />
              </div>
            )}

            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base font-mono tracking-wide">
                    {car.reportingMarks} {car.number}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {carTypeLabels[car.carType]}
                    {car.carName && ` — ${car.carName}`}
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
                      href={`/dashboard/railroad/${layoutId}/passenger-cars/${car.id}/edit`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <DeleteButton
                    itemName={`${car.reportingMarks} ${car.number}`}
                    itemType="passenger car"
                    onDelete={() => deletePassengerCar(car.id)}
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-4 font-normal"
                >
                  {classOfServiceLabels[car.classOfService]}
                </Badge>
                <Badge
                  variant={statusColors[car.status] as "default" | "destructive" | "secondary" | "outline"}
                  className="text-[10px] px-1.5 py-0 h-4 font-normal"
                >
                  {car.status.replace("_", " ")}
                </Badge>
              </div>

              {/* Specs */}
              {(car.seats || car.berths || car.length) && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {car.seats && <span>{car.seats} seats</span>}
                  {car.berths && <span>{car.berths} berths</span>}
                  {car.length && <span>{car.length}ft</span>}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
