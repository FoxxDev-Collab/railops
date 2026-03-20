import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayout } from "@/app/actions/layouts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { db } from "@/lib/db";

export default async function WaybillsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id } = await params;
  const layout = await getLayout(id);

  const waybills = await db.waybill.findMany({
    where: {
      userId: session.user.id,
      route: { layoutId: id },
    },
    include: {
      car: true,
      origin: true,
      destination: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/railroad/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Waybills</h1>
            <p className="text-muted-foreground">{layout.name}</p>
          </div>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Generate Waybill
        </Button>
      </div>

      {waybills.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No waybills yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Generate your first waybill once you have stations, rolling stock,
              and routes configured.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {waybills.map((waybill) => (
            <Card key={waybill.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {waybill.car.reportingMarks} {waybill.car.number}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Commodity:</span>{" "}
                  {waybill.commodity}
                </p>
                <p>
                  <span className="text-muted-foreground">From:</span>{" "}
                  {waybill.origin.name}
                </p>
                <p>
                  <span className="text-muted-foreground">To:</span>{" "}
                  {waybill.destination.name}
                </p>
                <p>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  {waybill.status}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
