"use client";

import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, ArrowRight } from "lucide-react";
import { TrainClass, TrainServiceType } from "@prisma/client";
import Link from "next/link";
import { DeleteButton } from "@/components/shared/delete-button";
import { deleteTrain } from "@/app/actions/trains";

interface Location {
  id: string;
  name: string;
  code: string;
}

interface Train {
  id: string;
  trainNumber: string;
  trainName: string | null;
  trainClass: TrainClass;
  serviceType: TrainServiceType;
  departureTime: string | null;
  symbol: string | null;
  description: string | null;
  originId: string | null;
  origin: Location | null;
  destinationId: string | null;
  destination: Location | null;
  isActive: boolean;
}

const classLabels: Record<TrainClass, string> = {
  MANIFEST: "Manifest",
  UNIT: "Unit",
  INTERMODAL: "Intermodal",
  LOCAL: "Local",
  PASSENGER: "Passenger",
  WORK: "Work",
  LIGHT_ENGINE: "Light Engine",
};

interface TrainCardListProps {
  trains: Train[];
  layoutId: string;
}

export function TrainCardList({ trains, layoutId }: TrainCardListProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {trains.map((train, i) => (
        <motion.div
          key={train.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, duration: 0.25, ease: "easeOut" }}
        >
          <Link href={`/dashboard/railroad/${layoutId}/trains/${train.id}`}>
          <Card
            className={`group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/20 cursor-pointer ${
              !train.isActive ? "opacity-60" : ""
            }`}
          >
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="font-mono tracking-wide">
                      {train.trainNumber}
                    </span>
                    {train.trainName && (
                      <span className="font-normal text-sm text-muted-foreground">
                        {train.trainName}
                      </span>
                    )}
                  </CardTitle>
                  {train.symbol && (
                    <p className="text-[11px] font-mono tracking-widest text-muted-foreground mt-0.5">
                      {train.symbol}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    asChild
                  >
                    <Link
                      href={`/dashboard/railroad/${layoutId}/trains/${train.id}/edit`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <DeleteButton
                    itemName={`Train ${train.trainNumber}`}
                    itemType="train"
                    onDelete={() => deleteTrain(train.id)}
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
                  {classLabels[train.trainClass]}
                </Badge>
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-4 font-normal"
                >
                  {train.serviceType}
                </Badge>
                {train.departureTime && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0 h-4 font-mono"
                  >
                    {train.departureTime}
                  </Badge>
                )}
                {!train.isActive && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4 font-normal text-muted-foreground"
                  >
                    Inactive
                  </Badge>
                )}
              </div>

              {/* Origin to Destination */}
              {(train.origin || train.destination) && (
                <div className="flex items-center gap-2 text-xs pt-1 border-t border-border/30">
                  {train.origin ? (
                    <span className="flex items-center gap-1">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {train.origin.code}
                      </span>
                      <span>{train.origin.name}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                  <ArrowRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                  {train.destination ? (
                    <span className="flex items-center gap-1">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {train.destination.code}
                      </span>
                      <span>{train.destination.name}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
