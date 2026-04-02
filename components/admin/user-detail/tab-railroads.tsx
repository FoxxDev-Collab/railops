"use client";

import { useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, MapPin, TrainFront, Train, Route } from "lucide-react";
import { startImpersonation } from "@/app/actions/admin/impersonate";

interface LayoutDetail {
  id: string;
  name: string;
  description: string | null;
  scale?: string | null;
  era?: string | null;
  _count: {
    locations: number;
    freightCars: number;
    locomotives: number;
    trains: number;
  };
}

interface TabRailroadsProps {
  layouts: LayoutDetail[];
  userId: string;
  isCurrentUser: boolean;
}

export function TabRailroads({ layouts, userId, isCurrentUser }: TabRailroadsProps) {
  const [isPending, startTransition] = useTransition();

  function handleImpersonate() {
    startTransition(async () => {
      await startImpersonation(userId);
    });
  }

  return (
    <div className="space-y-4">
      {layouts.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground text-center">No railroads created</p>
          </CardContent>
        </Card>
      ) : (
        layouts.map((layout) => (
          <Card key={layout.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">{layout.name}</CardTitle>
                {(layout.scale || layout.era) && (
                  <p className="text-xs text-muted-foreground">
                    {[layout.scale && `${layout.scale} Scale`, layout.era].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              {!isCurrentUser && (
                <Button variant="outline" size="sm" onClick={handleImpersonate} disabled={isPending}>
                  <Eye className="h-3.5 w-3.5 mr-1.5" /> Impersonate & View
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { icon: MapPin, label: "Locations", count: layout._count.locations },
                  { icon: TrainFront, label: "Locomotives", count: layout._count.locomotives },
                  { icon: Train, label: "Freight Cars", count: layout._count.freightCars },
                  { icon: Route, label: "Trains", count: layout._count.trains },
                ].map(({ icon: Icon, label, count }) => (
                  <div key={label} className="text-center p-3 rounded-lg border">
                    <Icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-lg font-bold tabular-nums">{count}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
