import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, Users } from "lucide-react";

interface RevenueByLineItemProps {
  basePro: { mrr: number; subscriptionCount: number };
  seatAddOn: { mrr: number; totalSeats: number };
  error?: string;
}

export function RevenueByLineItem({ basePro, seatAddOn, error }: RevenueByLineItemProps) {
  if (error) {
    return (
      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Revenue by Line Item</CardTitle>
          <CardDescription className="text-amber-700">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Revenue by Line Item</CardTitle>
        <CardDescription>Breakdown of active subscriptions by price</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-md border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              Pro Base
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums">${basePro.mrr.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">
              {basePro.subscriptionCount} subscription{basePro.subscriptionCount === 1 ? "" : "s"} &middot; MRR
            </p>
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Users className="h-3 w-3" />
              Seat Add-ons
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums">${seatAddOn.mrr.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">
              {seatAddOn.totalSeats} seat{seatAddOn.totalSeats === 1 ? "" : "s"} purchased &middot; MRR
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
