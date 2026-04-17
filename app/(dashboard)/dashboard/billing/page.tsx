import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getBillingOverview, startCheckout, openCustomerPortal } from "@/app/actions/billing";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Info, Plus, Minus, ExternalLink, Crown } from "lucide-react";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string; seat?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const overview = await getBillingOverview();
  const sp = await searchParams;

  const flash = sp.success
    ? { tone: "success" as const, title: "Welcome to Pro!", body: "Your subscription is active." }
    : sp.canceled
    ? { tone: "info" as const, title: "Checkout canceled", body: "No charges were made." }
    : sp.seat === "added"
    ? { tone: "success" as const, title: "Seat added", body: "Your new seat is ready to use. Next invoice will reflect the change." }
    : sp.seat === "removed"
    ? { tone: "success" as const, title: "Seat removed", body: "Credit for unused time will apply to your next invoice." }
    : null;

  const renewal = overview.renewalDate
    ? new Date(overview.renewalDate).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Manage your subscription and crew seats.
        </p>
      </div>

      {flash && (
        <Card
          className={
            flash.tone === "success"
              ? "border-primary/40 bg-primary/5"
              : "border-border"
          }
        >
          <CardContent className="flex items-start gap-3 pt-6">
            {flash.tone === "success" ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            ) : (
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium">{flash.title}</p>
              <p className="text-sm text-muted-foreground">{flash.body}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                Current Plan
                <Badge variant={overview.plan === "PRO" ? "default" : "secondary"}>
                  {overview.plan === "PRO" ? (
                    <>
                      <Crown className="mr-1 h-3 w-3" /> Pro
                    </>
                  ) : (
                    "Free"
                  )}
                </Badge>
              </CardTitle>
              {renewal && overview.plan === "PRO" && (
                <CardDescription>Renews on {renewal}</CardDescription>
              )}
              {overview.plan === "FREE" && (
                <CardDescription>
                  Upgrade to Pro for unlimited items, 5 layouts, and crew members.
                </CardDescription>
              )}
            </div>
            {overview.plan === "PRO" ? (
              <form action={openCustomerPortal}>
                <Button type="submit" variant="outline">
                  Manage Subscription
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </form>
            ) : (
              <form action={startCheckout}>
                <Button type="submit">Upgrade to Pro</Button>
              </form>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Usage card */}
      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
          <CardDescription>
            Your current usage against plan limits.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <UsageRow
            label="Layouts"
            current={overview.usage.layouts.current}
            limit={overview.usage.layouts.limit}
          />
          <UsageRow
            label="Items"
            current={overview.usage.items.current}
            limit={overview.usage.items.limit}
          />
          {overview.plan === "PRO" && (
            <UsageRow
              label="Crew Seats"
              current={overview.seatsUsed}
              limit={overview.totalSeats}
            />
          )}
        </CardContent>
      </Card>

      {/* Seats card (Pro only) */}
      {overview.plan === "PRO" && (
        <Card>
          <CardHeader>
            <CardTitle>Crew Seats</CardTitle>
            <CardDescription>
              1 seat included with Pro. Add extra seats for $5/month each (max 10 total).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-4">
              <div>
                <p className="text-sm font-medium">
                  {overview.totalSeats} total seat{overview.totalSeats === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-muted-foreground">
                  1 included + {overview.purchasedSeats} purchased
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm" disabled={!overview.canAddSeat}>
                  {overview.canAddSeat ? (
                    <Link href="/dashboard/billing/seats/add">
                      <Plus className="mr-1 h-4 w-4" />
                      Add seat
                    </Link>
                  ) : (
                    <span>
                      <Plus className="mr-1 h-4 w-4" />
                      Add seat
                    </span>
                  )}
                </Button>
                <Button asChild variant="outline" size="sm" disabled={!overview.canRemoveSeat}>
                  {overview.canRemoveSeat ? (
                    <Link href="/dashboard/billing/seats/remove">
                      <Minus className="mr-1 h-4 w-4" />
                      Remove seat
                    </Link>
                  ) : (
                    <span>
                      <Minus className="mr-1 h-4 w-4" />
                      Remove seat
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoices link (Pro only) */}
      {overview.plan === "PRO" && (
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="font-medium">Invoices & payment method</p>
              <p className="text-sm text-muted-foreground">
                Managed in the Stripe portal.
              </p>
            </div>
            <form action={openCustomerPortal}>
              <Button type="submit" variant="outline" size="sm">
                Open portal
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function UsageRow({
  label,
  current,
  limit,
}: {
  label: string;
  current: number;
  limit: number;
}) {
  const unlimited = limit === Infinity;
  const pct = unlimited ? 0 : Math.min(100, (current / Math.max(1, limit)) * 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {current} of {unlimited ? "Unlimited" : limit}
        </span>
      </div>
      {!unlimited && <Progress value={pct} className="h-1.5" />}
    </div>
  );
}
