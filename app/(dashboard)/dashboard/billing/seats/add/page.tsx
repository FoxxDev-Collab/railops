import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getBillingOverview, purchaseSeat } from "@/app/actions/billing";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export default async function AddSeatPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const overview = await getBillingOverview();

  if (overview.plan !== "PRO") redirect("/dashboard/billing");

  const renewalLabel = overview.renewalDate
    ? new Date(overview.renewalDate).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "the next billing date";

  const newTotal = overview.totalSeats + 1;

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/billing">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Add a Crew Seat</h1>
      </div>

      {!overview.canAddSeat ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <CardTitle>Maximum seats reached</CardTitle>
                <CardDescription>
                  You have {overview.totalSeats} seats, which is the current cap. Contact support if you need more.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
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
              You&rsquo;re about to add 1 crew seat for $5.00/month.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li>
                You&rsquo;ll be charged a prorated amount today for the remaining days in your current billing period.
              </li>
              <li>
                Your next invoice on <span className="font-medium">{renewalLabel}</span> will include this seat at $5.00.
              </li>
              <li>
                You&rsquo;ll have <span className="font-medium">{newTotal} seats</span> (1 included + {overview.purchasedSeats + 1} purchased).
              </li>
            </ul>

            <form action={purchaseSeat} className="flex gap-2 pt-2">
              <Button type="submit">Confirm — Add Seat</Button>
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
