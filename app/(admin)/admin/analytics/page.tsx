import { adminAuth } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import {
  getGrowthMetrics,
  getSignupTrend,
  getConversionFunnel,
} from "@/app/actions/admin/analytics";
import { MetricCard } from "@/components/admin/analytics/metric-card";
import { SignupChart } from "@/components/admin/analytics/signup-chart";
import { FunnelChart } from "@/components/admin/analytics/funnel-chart";
import { Users, DollarSign, TrendingUp, BarChart3, UserPlus } from "lucide-react";

export default async function AnalyticsPage() {
  const session = await adminAuth();
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const [metrics, signupData, funnelData] = await Promise.all([
    getGrowthMetrics("30d"),
    getSignupTrend("30d"),
    getConversionFunnel(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Growth Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Signup trends, revenue metrics, and conversion data
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="Total Users"
          value={metrics.totalUsers}
          change={metrics.signupChange}
          subtitle="vs prior period"
          icon={Users}
        />
        <MetricCard
          title="MRR"
          value={`$${metrics.mrr}`}
          subtitle={`${metrics.proUsers} Pro subscribers`}
          icon={DollarSign}
        />
        <MetricCard
          title="Conversion Rate"
          value={`${metrics.conversionRate}%`}
          subtitle="Free → Pro"
          icon={TrendingUp}
        />
        <MetricCard
          title="ARPU"
          value={`$${metrics.arpu}`}
          subtitle="avg revenue per user"
          icon={BarChart3}
        />
        <MetricCard
          title="Signups"
          value={metrics.signups}
          change={metrics.signupChange}
          subtitle="this period"
          icon={UserPlus}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SignupChart initialData={signupData} />
        <FunnelChart data={funnelData} />
      </div>
    </div>
  );
}
