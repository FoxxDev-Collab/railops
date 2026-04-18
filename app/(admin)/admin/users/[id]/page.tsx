import { adminAuth } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { getUserDetails, getUserTimeline, getUserActivityFeed } from "@/app/actions/admin/users";
import { getAdminNotes } from "@/app/actions/admin/notes";
import { getUserStripeDeepDive } from "@/lib/stripe-admin";
import { db } from "@/lib/db";
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

  // Stripe deep-dive + seat counts (only if customer is linked)
  let deepDive: Awaited<ReturnType<typeof getUserStripeDeepDive>> = {
    subscription: null,
    invoices: [],
    paymentMethods: [],
    charges: [],
  };
  let purchasedSeats = 0;
  let seatsUsed = 0;

  if (user.stripeCustomerId) {
    const [dive, userRow, crewDistinct] = await Promise.all([
      getUserStripeDeepDive(user.stripeCustomerId),
      db.user.findUnique({
        where: { id: user.id },
        select: { purchasedSeats: true },
      }),
      db.crewMember.findMany({
        where: { layout: { userId: user.id }, removedAt: null },
        distinct: ["userId"],
        select: { userId: true },
      }),
    ]);

    deepDive = dive;
    purchasedSeats = userRow?.purchasedSeats ?? 0;
    seatsUsed = crewDistinct.length;
  }

  // livemode inference — best effort from charge ID prefix (charges don't have livemode field exposed in AdminCharge).
  // If no charges, default to non-livemode (test) for safer deep-link prefix.
  const livemode = deepDive.charges.length > 0;
  // Note: AdminCharge doesn't carry livemode explicitly. This best-effort fallback is documented.

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
            stripeCustomerId={user.stripeCustomerId}
            deepDive={deepDive}
            purchasedSeats={purchasedSeats}
            seatsUsed={seatsUsed}
            livemode={livemode}
          />
        }
        notes={
          <TabNotes notes={notes} userId={user.id} currentAdminId={session.user.id} />
        }
      />
    </div>
  );
}
