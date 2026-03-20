import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayouts } from "@/app/actions/layouts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Train, MapPin, Route, TrainTrack } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const layouts = await getLayouts();

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8">
      <div className="text-center space-y-2">
        <TrainTrack className="h-12 w-12 mx-auto text-muted-foreground" />
        <h1 className="text-4xl font-bold tracking-tight">
          Select or Create Your Railroad
        </h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          {layouts.length === 0
            ? "Welcome aboard! Create your first railroad to start managing operations."
            : "Choose a railroad to enter its operations center."}
        </p>
      </div>

      {layouts.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 w-full max-w-4xl">
          {layouts.map((layout) => (
            <Link
              key={layout.id}
              href={`/dashboard/railroad/${layout.id}`}
              className="group"
            >
              <Card className="h-full transition-colors hover:border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{layout.name}</span>
                    {layout.scale && (
                      <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded">
                        {layout.scale}
                      </span>
                    )}
                  </CardTitle>
                  {layout.description && (
                    <CardDescription className="line-clamp-2">
                      {layout.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {layout._count.locations} locations
                    </span>
                    <span className="flex items-center gap-1">
                      <Train className="h-3.5 w-3.5" />
                      {layout._count.freightCars + layout._count.locomotives} stock
                    </span>
                    <span className="flex items-center gap-1">
                      <Route className="h-3.5 w-3.5" />
                      {layout._count.trains} trains
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Button asChild size="lg">
        <Link href="/dashboard/railroad/new">
          <Plus className="mr-2 h-5 w-5" />
          Create New Railroad
        </Link>
      </Button>
    </div>
  );
}
