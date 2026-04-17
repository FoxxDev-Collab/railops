import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  try {
    const { getStripeClient } = await import("@/lib/stripe");
    const stripe = await getStripeClient();
    const webhookSecret = await getSetting("stripe.webhookSecret");

    if (!webhookSecret) {
      console.error("[STRIPE WEBHOOK] Webhook secret not configured");
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.client_reference_id ?? session.metadata?.userId;
        if (!userId) break;

        // Retrieve the subscription with items to capture initial seat quantity (should be 0)
        let purchasedSeats = 0;
        if (session.subscription) {
          const stripeClient = await getStripeClient();
          const sub = await stripeClient.subscriptions.retrieve(
            session.subscription as string,
            { expand: ["items.data"] }
          );
          const seatPriceId = await getSetting("stripe.seatPriceId");
          const seatItem = sub.items.data.find((i) => i.price.id === seatPriceId);
          purchasedSeats = seatItem?.quantity ?? 0;
        }

        await db.user.update({
          where: { id: userId },
          data: {
            plan: "PRO",
            stripeCustomerId: session.customer as string,
            stripeSubId: session.subscription as string,
            purchasedSeats,
          },
        });

        await logAudit({
          action: "billing.checkout.completed",
          adminId: "system",
          adminEmail: "stripe-webhook",
          entityType: "User",
          entityId: userId,
          metadata: { plan: "PRO", subscriptionId: session.subscription, purchasedSeats },
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const user = await db.user.findFirst({
          where: { stripeSubId: subscription.id },
        });
        if (!user) break;

        const periodEnd = subscription.items?.data?.[0]?.current_period_end;
        const seatPriceId = await getSetting("stripe.seatPriceId");
        const seatItem = subscription.items.data.find(
          (i) => i.price.id === seatPriceId
        );
        const purchasedSeats = seatItem?.quantity ?? 0;

        if (subscription.status === "active") {
          await db.user.update({
            where: { id: user.id },
            data: {
              plan: "PRO",
              planExpiresAt: periodEnd ? new Date(periodEnd * 1000) : null,
              purchasedSeats,
            },
          });
        } else if (subscription.status === "canceled" || subscription.status === "past_due") {
          await db.user.update({
            where: { id: user.id },
            data: {
              plan: "FREE",
              stripeSubId: null,
              planExpiresAt: null,
              purchasedSeats: 0,
            },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const user = await db.user.findFirst({
          where: { stripeSubId: subscription.id },
        });
        if (!user) break;

        await db.user.update({
          where: { id: user.id },
          data: {
            plan: "FREE",
            stripeSubId: null,
            planExpiresAt: null,
            purchasedSeats: 0,
          },
        });

        await logAudit({
          action: "billing.subscription.canceled",
          adminId: "system",
          adminEmail: "stripe-webhook",
          entityType: "User",
          entityId: user.id,
          metadata: { subscriptionId: subscription.id },
        });
        break;
      }

      case "invoice.payment_succeeded": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = event.data.object as any;
        const subId = (invoice.subscription ?? invoice.parent?.subscription_details?.subscription ?? null) as string | null;
        if (!subId) break;

        const user = await db.user.findFirst({ where: { stripeSubId: subId } });
        if (!user) break;

        // Update period end from subscription
        const stripe2 = await getStripeClient();
        const sub = await stripe2.subscriptions.retrieve(subId, {
          expand: ["items.data"],
        });
        const subPeriodEnd = sub.items?.data?.[0]?.current_period_end;
        if (subPeriodEnd) {
          await db.user.update({
            where: { id: user.id },
            data: { planExpiresAt: new Date(subPeriodEnd * 1000) },
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = event.data.object as any;
        const subId = (invoice.subscription ?? invoice.parent?.subscription_details?.subscription ?? null) as string | null;
        if (!subId) break;

        const user = await db.user.findFirst({ where: { stripeSubId: subId } });
        if (user) {
          await logAudit({
            action: "billing.payment.failed",
            adminId: "system",
            adminEmail: "stripe-webhook",
            entityType: "User",
            entityId: user.id,
            metadata: { invoiceId: invoice.id },
          });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[STRIPE WEBHOOK] Error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 400 }
    );
  }
}
