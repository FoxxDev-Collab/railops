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

        await db.user.update({
          where: { id: userId },
          data: {
            plan: "OPERATOR",
            stripeCustomerId: session.customer as string,
            stripeSubId: session.subscription as string,
          },
        });

        await logAudit({
          action: "billing.checkout.completed",
          adminId: "system",
          adminEmail: "stripe-webhook",
          entityType: "User",
          entityId: userId,
          metadata: { plan: "OPERATOR", subscriptionId: session.subscription },
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const user = await db.user.findFirst({
          where: { stripeSubId: subscription.id },
        });
        if (!user) break;

        // Get period end from subscription items (new Stripe API structure)
        const periodEnd = subscription.items?.data?.[0]?.current_period_end;

        if (subscription.status === "active") {
          await db.user.update({
            where: { id: user.id },
            data: {
              plan: "OPERATOR",
              planExpiresAt: periodEnd ? new Date(periodEnd * 1000) : null,
            },
          });
        } else if (subscription.status === "canceled" || subscription.status === "past_due") {
          await db.user.update({
            where: { id: user.id },
            data: {
              plan: "FREE",
              stripeSubId: null,
              planExpiresAt: null,
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
      { error: error instanceof Error ? error.message : "Webhook error" },
      { status: 400 }
    );
  }
}
