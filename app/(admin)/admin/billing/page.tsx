import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getRevenueStats } from "@/app/actions/admin/billing";
import { getPricingConfig } from "@/app/actions/admin/pricing";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Users, TrendingUp, UserPlus } from "lucide-react";
import { PricingManager } from "./pricing-manager";

export default async function AdminBillingPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const [stats, pricingConfig] = await Promise.all([
    getRevenueStats(),
    getPricingConfig(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Pricing</h1>
        <p className="text-sm text-muted-foreground">
          Subscription metrics, revenue tracking, and pricing configuration
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              ${stats.mrr}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.operatorUsers} operator subscription
              {stats.operatorUsers !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {stats.totalUsers}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.freeUsers} free, {stats.operatorUsers} operator
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Conversion Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {stats.totalUsers > 0
                ? ((stats.operatorUsers / stats.totalUsers) * 100).toFixed(1)
                : "0"}
              %
            </div>
            <p className="text-xs text-muted-foreground">Free → Operator</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Recent Signups
            </CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {stats.recentSignups.length}
            </div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Management */}
      <div>
        <h2 className="mb-1 text-2xl font-bold tracking-tight">
          Pricing Tiers
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Edit tier names, prices, descriptions, and feature lists. Changes
          update the marketing page immediately.
        </p>
        <PricingManager initialConfig={pricingConfig} />
      </div>

      {/* Recent signups */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Signups</CardTitle>
          <CardDescription>
            Users who joined in the last 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentSignups.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No recent signups
            </p>
          ) : (
            <div className="space-y-2">
              {stats.recentSignups.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between border-b border-border/30 py-2 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <Badge
                    variant={
                      user.plan === "OPERATOR" ? "default" : "secondary"
                    }
                    className="text-[10px] font-normal"
                  >
                    {user.plan}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
