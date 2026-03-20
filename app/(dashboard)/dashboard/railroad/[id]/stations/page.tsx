import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayout } from "@/app/actions/layouts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";

export default async function StationsPage({
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
            <h1 className="text-3xl font-bold">Stations & Yards</h1>
            <p className="text-muted-foreground">{layout.name}</p>
          </div>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Station
        </Button>
      </div>

      {layout.stations.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No stations yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Add your first station to start building your railroad network.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {layout.stations.map((station) => (
            <Card key={station.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{station.name}</span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {station.code}
                  </span>
                </CardTitle>
              </CardHeader>
              {station.location && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {station.location}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
