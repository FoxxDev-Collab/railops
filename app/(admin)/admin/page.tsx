import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getSystemStats } from "@/app/actions/admin/users";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const stats = await getSystemStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">System overview and management</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.adminUsers} admins, {stats.regularUsers} users
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Layouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLayouts}</div>
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
            <div className="text-2xl font-bold">{stats.totalStations}</div>
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
            <div className="text-2xl font-bold">{stats.totalRollingStock}</div>
            <p className="text-xs text-muted-foreground">
              Total inventory
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
