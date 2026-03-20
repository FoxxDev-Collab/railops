import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayout } from "@/app/actions/layouts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";

export default async function TrainsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id } = await params;
  const layout = await getLayout(id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/railroad/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Trains</h1>
            <p className="text-muted-foreground">{layout.name}</p>
          </div>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Train
        </Button>
      </div>

      {layout.trains.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No trains yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Create your first train to define consists, schedules, and stops.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {layout.trains.map((train) => (
            <Card key={train.id}>
              <CardHeader>
                <CardTitle>
                  {train.trainName || `Train ${train.trainNumber}`}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  #{train.trainNumber}
                  {train.departureTime && ` — Departs ${train.departureTime}`}
                </p>
                <div className="flex gap-2">
                  <Badge variant="outline">{train.trainClass}</Badge>
                  <Badge
                    variant={train.isActive ? "default" : "secondary"}
                  >
                    {train.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
