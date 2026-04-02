import { adminAuth } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import {
  getSystemHealth,
  getDatabaseStats,
  getRecentErrors,
  getActiveUserCounts,
} from "@/app/actions/admin/health";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { CheckCircle, AlertTriangle, XCircle, Users } from "lucide-react";

function StatusIcon({ status }: { status: string }) {
  if (status === "healthy") return <CheckCircle className="h-5 w-5 text-green-500" />;
  if (status === "degraded") return <AlertTriangle className="h-5 w-5 text-amber-500" />;
  return <XCircle className="h-5 w-5 text-red-500" />;
}

function statusVariant(status: string): "default" | "secondary" | "destructive" {
  if (status === "healthy") return "default";
  if (status === "degraded") return "secondary";
  return "destructive";
}

export default async function HealthPage() {
  const session = await adminAuth();
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const [health, dbStats, recentErrors, activeCounts] = await Promise.all([
    getSystemHealth(),
    getDatabaseStats(),
    getRecentErrors(10),
    getActiveUserCounts(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
        <p className="text-sm text-muted-foreground">
          Service status, database metrics, and error tracking
        </p>
      </div>

      {/* Status Board */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {health.map((service) => (
          <Card key={service.name}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <StatusIcon status={service.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{service.name}</p>
                    <Badge variant={statusVariant(service.status)} className="text-[10px] px-1.5 py-0 h-4">
                      {service.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{service.message}</p>
                </div>
                {service.responseMs !== undefined && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {service.responseMs}ms
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Active Users */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last 15 min</span>
              <span className="text-lg font-bold tabular-nums">{activeCounts.last15m}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last hour</span>
              <span className="text-lg font-bold tabular-nums">{activeCounts.last1h}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last 24 hours</span>
              <span className="text-lg font-bold tabular-nums">{activeCounts.last24h}</span>
            </div>
          </CardContent>
        </Card>

        {/* Database Stats */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Database Tables</CardTitle>
            <CardDescription>Row counts across all models</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {dbStats.map((stat) => (
                <div
                  key={stat.table}
                  className="flex items-center justify-between p-2 rounded border text-sm"
                >
                  <span className="text-muted-foreground">{stat.table}</span>
                  <span className="font-mono tabular-nums font-medium">{stat.rows.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Errors */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Recent Errors</CardTitle>
            <CardDescription>Latest system errors</CardDescription>
          </div>
          <Link
            href="/admin/health/errors"
            className="text-xs text-primary hover:underline"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {recentErrors.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No errors recorded
            </p>
          ) : (
            <div className="space-y-2">
              {recentErrors.map((error) => (
                <div
                  key={error.id}
                  className="flex items-start gap-3 p-2 rounded border text-sm"
                >
                  <Badge
                    variant={error.level === "fatal" ? "destructive" : error.level === "error" ? "destructive" : "secondary"}
                    className="text-[10px] px-1.5 py-0 h-4 shrink-0 mt-0.5"
                  >
                    {error.level}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{error.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {error.source && <span>{error.source} · </span>}
                      {new Date(error.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
