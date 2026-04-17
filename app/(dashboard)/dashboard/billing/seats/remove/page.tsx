import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getBillingOverview, removeSeat } from "@/app/actions/billing";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export default async function RemoveSeatPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const overview = await getBillingOverview();

  if (overview.plan !== "PRO") redirect("/dashboard/billing");
  if (overview.purchasedSeats <= 0) redirect("/dashboard/billing");

  const newTotal = overview.totalSeats - 1;
  const wouldOverflow = overview.seatsUsed > newTotal;

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/billing">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Remove a Crew Seat</h1>
      </div>

      {wouldOverflow ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <CardTitle>Can&rsquo;t remove seat right now</CardTitle>
                <CardDescription>
                  You currently have {overview.seatsUsed} crew members occupying {overview.totalSeats} seats. Remove a crew member first, then come back to remove the seat.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard/billing">Back to billing</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Confirm</CardTitle>
            <CardDescription>
              You&rsquo;re about to remove 1 crew seat.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li>
                The seat will be removed immediately. You&rsquo;ll have{" "}
                <span className="font-medium">{newTotal} seats</span> (1 included + {overview.purchasedSeats - 1} purchased).
              </li>
              <li>
                A credit for the unused portion of this billing period will be applied to your next invoice.
              </li>
            </ul>

            <form action={removeSeat} className="flex gap-2 pt-2">
              <Button type="submit" variant="destructive">
                Confirm — Remove Seat
              </Button>
              <Button asChild variant="ghost">
                <Link href="/dashboard/billing">Cancel</Link>
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
