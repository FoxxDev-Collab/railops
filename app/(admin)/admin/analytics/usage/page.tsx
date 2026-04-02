import { adminAuth } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import {
  getFeatureUsageStats,
  getEngagementDistribution,
  getResourceCounts,
} from "@/app/actions/admin/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EngagementChart } from "@/components/admin/analytics/engagement-chart";

export default async function UsagePage() {
  const session = await adminAuth();
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const [features, engagement, resources] = await Promise.all([
    getFeatureUsageStats(),
    getEngagementDistribution(),
    getResourceCounts(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Feature Usage</h1>
        <p className="text-sm text-muted-foreground">
          Activity patterns, engagement levels, and resource utilization
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <EngagementChart data={engagement} />

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Resource Counts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {resources.map((r) => (
                <div key={r.resource} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{r.resource}</span>
                  <span className="font-mono tabular-nums font-medium">{r.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Top Actions</CardTitle>
        </CardHeader>
        <CardContent>
          {features.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No activity data yet. Actions will appear as users interact with the platform.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium text-muted-foreground">Action</th>
                    <th className="text-right p-2 font-medium text-muted-foreground">Total Events</th>
                    <th className="text-right p-2 font-medium text-muted-foreground">Unique Users</th>
                    <th className="text-right p-2 font-medium text-muted-foreground">Last 7d</th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((f) => (
                    <tr key={f.action} className="border-b border-border/50">
                      <td className="p-2">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {f.action}
                        </Badge>
                      </td>
                      <td className="p-2 text-right tabular-nums">{f.totalEvents.toLocaleString()}</td>
                      <td className="p-2 text-right tabular-nums">{f.uniqueUsers}</td>
                      <td className="p-2 text-right tabular-nums">{f.recentEvents}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
