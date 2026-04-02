import { adminAuth } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { getUserDetails, getUserTimeline, getUserActivityFeed } from "@/app/actions/admin/users";
import { getAdminNotes } from "@/app/actions/admin/notes";
import { UserHeader } from "@/components/admin/user-detail/user-header";
import { UserTabs } from "@/components/admin/user-detail/user-tabs";
import { TabOverview } from "@/components/admin/user-detail/tab-overview";
import { TabActivity } from "@/components/admin/user-detail/tab-activity";
import { TabRailroads } from "@/components/admin/user-detail/tab-railroads";
import { TabActions } from "@/components/admin/user-detail/tab-actions";
import { TabBilling } from "@/components/admin/user-detail/tab-billing";
import { TabNotes } from "@/components/admin/user-detail/tab-notes";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await adminAuth();
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;
  const [user, timeline, activityData, notes] = await Promise.all([
    getUserDetails(id),
    getUserTimeline(id),
    getUserActivityFeed(id),
    getAdminNotes(id),
  ]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">User not found</p>
      </div>
    );
  }

  // Fetch Stripe details if customer is linked
  let stripeDetails = { subscription: null as { status: string; currentPeriodEnd: string } | null, payments: [] as Array<{ id: string; amount: number; currency: string; status: string; created: string }>, error: undefined as string | undefined };

  if (user.stripeCustomerId) {
    try {
      const { getStripeClient } = await import("@/lib/stripe");
      const stripe = await getStripeClient();

      const [subs, charges] = await Promise.all([
        stripe.subscriptions.list({ customer: user.stripeCustomerId, limit: 1 }),
        stripe.charges.list({ customer: user.stripeCustomerId, limit: 10 }),
      ]);

      const sub = subs.data[0];
      const periodEnd = sub?.items?.data?.[0]?.current_period_end;
      stripeDetails = {
        subscription: sub
          ? {
              status: sub.status,
              currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : new Date().toISOString(),
            }
          : null,
        payments: charges.data.map((c) => ({
          id: c.id,
          amount: c.amount,
          currency: c.currency,
          status: c.status,
          created: new Date(c.created * 1000).toISOString(),
        })),
        error: undefined,
      };
    } catch (error) {
      stripeDetails.error = error instanceof Error ? error.message : "Failed to load Stripe data";
    }
  }

  return (
    <div className="space-y-6">
      <UserHeader user={user} />

      <UserTabs
        overview={
          <TabOverview
            timeline={timeline}
            layouts={user.layouts}
            subscription={{
              plan: user.plan,
              stripeCustomerId: user.stripeCustomerId,
              stripeSubId: user.stripeSubId,
              planExpiresAt: user.planExpiresAt,
            }}
          />
        }
        activity={
          <TabActivity userId={user.id} initialData={activityData} />
        }
        railroads={
          <TabRailroads
            layouts={user.layouts}
            userId={user.id}
            isCurrentUser={user.id === session.user.id}
          />
        }
        actions={
          <TabActions user={user} adminId={session.user.id} />
        }
        billing={
          <TabBilling
            stripeDetails={stripeDetails}
            stripeCustomerId={user.stripeCustomerId}
          />
        }
        notes={
          <TabNotes notes={notes} userId={user.id} currentAdminId={session.user.id} />
        }
      />
    </div>
  );
}
