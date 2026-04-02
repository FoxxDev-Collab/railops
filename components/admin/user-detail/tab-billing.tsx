"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StripeDetails {
  subscription: {
    status: string;
    currentPeriodEnd: string;
  } | null;
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    created: string;
  }>;
  error?: string;
}

interface TabBillingProps {
  stripeDetails: StripeDetails;
  plan: string;
  stripeCustomerId: string | null;
}

export function TabBilling({ stripeDetails, plan, stripeCustomerId }: TabBillingProps) {
  if (!stripeCustomerId) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-muted-foreground text-center">
            No Stripe customer linked to this account
          </p>
        </CardContent>
      </Card>
    );
  }

  if (stripeDetails.error) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-amber-600 text-center">
            {stripeDetails.error}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Subscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={stripeDetails.subscription ? "default" : "secondary"}>
              {stripeDetails.subscription?.status ?? "No subscription"}
            </Badge>
          </div>
          {stripeDetails.subscription && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current Period Ends</span>
              <span>{new Date(stripeDetails.subscription.currentPeriodEnd).toLocaleDateString()}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Stripe Customer</span>
            <span className="font-mono text-xs">{stripeCustomerId}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {stripeDetails.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No payments</p>
          ) : (
            <div className="space-y-2">
              {stripeDetails.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm p-2 rounded border">
                  <div>
                    <span className="font-medium tabular-nums">${(p.amount / 100).toFixed(2)}</span>
                    <span className="text-muted-foreground ml-2">{p.currency.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={p.status === "succeeded" ? "default" : "destructive"}
                      className="text-[10px]"
                    >
                      {p.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(p.created).toLocaleDateString()}
                    </span>
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
