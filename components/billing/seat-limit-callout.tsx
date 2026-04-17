import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, ArrowRight } from "lucide-react";

export interface SeatLimitCalloutProps {
  /** Seats currently used */
  current: number;
  /** Seats available */
  limit: number;
  /** Whether the viewer can add a seat (i.e., is the owner and on Pro). If false, the CTA is hidden. */
  canManage: boolean;
}

export function SeatLimitCallout({ current, limit, canManage }: SeatLimitCalloutProps) {
  if (current < limit) return null;

  return (
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardContent className="flex items-start gap-3 pt-6">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium">
            You&rsquo;re out of crew seats ({current} of {limit} used)
          </p>
          <p className="text-sm text-muted-foreground">
            {canManage
              ? "Add a seat to invite another crew member."
              : "Ask the railroad owner to add a seat before inviting more crew."}
          </p>
        </div>
        {canManage && (
          <Button asChild size="sm">
            <Link href="/dashboard/billing/seats/add">
              Add a seat
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
