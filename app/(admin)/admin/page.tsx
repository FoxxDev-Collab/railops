import { adminAuth } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { getSystemStats } from "@/app/actions/admin/users";
import { getRecentActivity } from "@/app/actions/admin/audit";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Users,
  MapPin,
  TrainFront,
  DollarSign,
  Activity,
} from "lucide-react";

export default async function AdminDashboardPage() {
  const session = await adminAuth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const [stats, recentActivity, recentUsers] = await Promise.all([
    getSystemStats(),
    getRecentActivity(8),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, email: true, name: true, plan: true, createdAt: true },
    }),
  ]);

  const mrr = stats.proUsers * 5;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          System overview and management
        </p>
      </div>

      {/* Key metrics */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.adminUsers} admin{stats.adminUsers !== 1 ? "s" : ""}, {stats.regularUsers} user{stats.regularUsers !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">${mrr}</div>
            <p className="text-xs text-muted-foreground">
              {stats.proUsers} Pro subscriber{stats.proUsers !== 1 ? "s" : ""} @ $5/mo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Railroads</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{stats.totalLayouts}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalLocations} location{stats.totalLocations !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rolling Stock</CardTitle>
            <TrainFront className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {stats.totalLocomotives + stats.totalFreightCars}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalLocomotives} loco{stats.totalLocomotives !== 1 ? "s" : ""}, {stats.totalFreightCars} freight car{stats.totalFreightCars !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Plan distribution bar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Plan Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Free</span>
              <span className="font-mono tabular-nums">{stats.freeUsers}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-muted-foreground/30 transition-all duration-500"
                style={{
                  width: stats.totalUsers > 0
                    ? `${(stats.freeUsers / stats.totalUsers) * 100}%`
                    : "0%",
                }}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Operator</span>
              <span className="font-mono tabular-nums">{stats.proUsers}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{
                  width: stats.totalUsers > 0
                    ? `${(stats.proUsers / stats.totalUsers) * 100}%`
                    : "0%",
                }}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Verified</span>
              <span className="font-mono tabular-nums">
                {stats.verifiedUsers} / {stats.totalUsers}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-500"
                style={{
                  width: stats.totalUsers > 0
                    ? `${(stats.verifiedUsers / stats.totalUsers) * 100}%`
                    : "0%",
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent signups */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium">Recent Signups</CardTitle>
              <CardDescription>Newest users</CardDescription>
            </div>
            <Link
              href="/admin/users"
              className="text-xs text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {recentUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No users yet
              </p>
            ) : (
              <div className="space-y-3">
                {recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="text-sm font-medium hover:underline truncate block"
                      >
                        {user.name || user.email}
                      </Link>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <Badge
                        variant={user.plan === "PRO" ? "default" : "outline"}
                        className="text-[10px] px-1.5 py-0 h-4 font-normal"
                      >
                        {user.plan}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              <CardDescription>Admin audit trail</CardDescription>
            </div>
            <Link
              href="/admin/audit"
              className="text-xs text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No activity yet
              </p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-muted shrink-0 mt-0.5">
                      <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal mr-1.5">
                          {entry.action}
                        </Badge>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {entry.adminEmail} —{" "}
                        {new Date(entry.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
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
