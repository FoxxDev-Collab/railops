import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayouts } from "@/app/actions/layouts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const layouts = await getLayouts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session.user.name || session.user.email}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Layouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{layouts.length}</div>
            <p className="text-xs text-muted-foreground">
              Total railroad layouts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Stations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {layouts.reduce((acc, l) => acc + l._count.stations, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all layouts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rolling Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {layouts.reduce((acc, l) => acc + l._count.rollingStock, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Cars in inventory
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
