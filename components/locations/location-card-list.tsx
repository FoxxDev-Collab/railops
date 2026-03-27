"use client";

import { motion } from "motion/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Factory,
  Plus,
  Pencil,
  Building2,
  Layers,
  ArrowLeftRight,
  GitFork,
  Users,
  Fence,
} from "lucide-react";
import { LocationType } from "@prisma/client";

const typeIcons: Record<LocationType, React.ElementType> = {
  PASSENGER_STATION: Building2,
  YARD: Layers,
  INTERCHANGE: ArrowLeftRight,
  JUNCTION: GitFork,
  STAGING: Layers,
  TEAM_TRACK: Users,
  SIDING: Fence,
};

const typeLabels: Record<LocationType, string> = {
  PASSENGER_STATION: "Station",
  YARD: "Yard",
  INTERCHANGE: "Interchange",
  JUNCTION: "Junction",
  STAGING: "Staging",
  TEAM_TRACK: "Team Track",
  SIDING: "Siding",
};
import { DeleteLocationButton } from "./delete-location-button";

interface Industry {
  id: string;
  name: string;
  type: string;
  capacity: number | null;
  spotCount: number | null;
  trackLength: number | null;
  description: string | null;
  commoditiesIn: string[];
  commoditiesOut: string[];
}

interface Location {
  id: string;
  name: string;
  code: string;
  locationType: LocationType;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  population: number | null;
  sortOrder: number;
  industries: Industry[];
}

interface LocationCardListProps {
  locations: Location[];
  layoutId: string;
}

export function LocationCardList({
  locations,
  layoutId,
}: LocationCardListProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {locations.map((location, i) => {
        const TypeIcon = typeIcons[location.locationType];
        return (
          <motion.div
            key={location.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.25, ease: "easeOut" }}
          >
            <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/20">
              {/* Subtle top accent line */}
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded bg-muted/70 shrink-0">
                      <TypeIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base leading-tight truncate">
                        {location.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-mono tracking-widest text-muted-foreground">
                          {location.code}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-4 font-normal"
                        >
                          {typeLabels[location.locationType]}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {/* Action buttons — visible on hover */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      asChild
                    >
                      <Link href={`/dashboard/railroad/${layoutId}/locations/${location.id}/edit`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <DeleteLocationButton
                      locationId={location.id}
                      locationName={location.name}
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0 space-y-3">
                {location.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {location.description}
                  </p>
                )}

                {/* Industries list */}
                {location.industries.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-medium">
                        Industries
                      </span>
                    </div>
                    <div className="space-y-1">
                      {location.industries.map((industry) => (
                        <Link
                          key={industry.id}
                          href={`/dashboard/railroad/${layoutId}/locations/${location.id}/industries/${industry.id}/edit`}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded border border-transparent
                            hover:border-border/60 hover:bg-muted/30 transition-all duration-150 text-left group/ind"
                        >
                          <Factory className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                          <span className="text-xs truncate flex-1">
                            {industry.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground/50">
                            {industry.type}
                          </span>
                          {industry.spotCount && (
                            <Badge
                              variant="secondary"
                              className="text-[9px] px-1 py-0 h-3.5 font-normal"
                            >
                              {industry.spotCount} spot
                              {industry.spotCount !== 1 ? "s" : ""}
                            </Badge>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add industry button */}
                <Link
                  href={`/dashboard/railroad/${layoutId}/locations/${location.id}/industries/new`}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded border border-dashed
                    border-border/40 text-muted-foreground/50 hover:border-primary/30 hover:text-primary/70
                    hover:bg-primary/[0.02] transition-all duration-150"
                >
                  <Plus className="h-3 w-3" />
                  <span className="text-[11px]">Add industry</span>
                </Link>

                {/* Population if set */}
                {location.population && (
                  <div className="flex items-center justify-end pt-1 border-t border-border/30">
                    <span className="text-[10px] text-muted-foreground/50">
                      Pop. {location.population.toLocaleString()}
                    </span>
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
