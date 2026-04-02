import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, TrainFront, Train } from "lucide-react";

interface TimelineEvent {
  date: Date;
  label: string;
  type: string;
}

interface LayoutInfo {
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

interface TabOverviewProps {
  timeline: TimelineEvent[];
  layouts: LayoutInfo[];
  subscription: {
    plan: string;
    stripeCustomerId: string | null;
    stripeSubId: string | null;
    planExpiresAt: Date | null;
  };
}

export function TabOverview({ timeline, layouts, subscription }: TabOverviewProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Account Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events</p>
          ) : (
            <div className="relative pl-6 space-y-4">
              <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />
              {timeline.map((event, i) => (
                <div key={i} className="relative flex gap-3">
                  <div className="absolute -left-6 top-1.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
                  <div>
                    <p className="text-sm">{event.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-6">
        {/* Subscription */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Plan</span>
              <Badge variant={subscription.plan === "PRO" ? "default" : "outline"}>
                {subscription.plan}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Stripe Customer</span>
              <span className="font-mono text-xs">{subscription.stripeCustomerId ?? "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subscription</span>
              <span className="font-mono text-xs">{subscription.stripeSubId ?? "—"}</span>
            </div>
            {subscription.planExpiresAt && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Expires</span>
                <span>{new Date(subscription.planExpiresAt).toLocaleDateString()}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Railroads summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Railroads ({layouts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {layouts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No railroads</p>
            ) : (
              <div className="space-y-3">
                {layouts.map((layout) => (
                  <div key={layout.id} className="p-3 rounded-lg border">
                    <p className="text-sm font-medium">{layout.name}</p>
                    {(layout.scale || layout.era) && (
                      <p className="text-xs text-muted-foreground">
                        {[layout.scale, layout.era].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {layout._count.locations}</span>
                      <span className="flex items-center gap-1"><TrainFront className="h-3 w-3" /> {layout._count.locomotives}</span>
                      <span className="flex items-center gap-1"><Train className="h-3 w-3" /> {layout._count.freightCars}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
