import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayout } from "@/app/actions/layouts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    where: { userId: session.user.id },
    include: {
      panels: { orderBy: { panelNumber: "asc" } },
      carCard: { include: { freightCar: true } },
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
          Create Waybill
        </Button>
      </div>

      {waybills.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No waybills yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Create waybills to route freight cars between locations and
              industries on your railroad.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {waybills.map((waybill) => {
            const activePanel = waybill.panels.find(
              (p) => p.panelNumber === waybill.currentPanel
            );
            return (
              <Card key={waybill.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>
                      {waybill.carCard?.freightCar
                        ? `${waybill.carCard.freightCar.reportingMarks} ${waybill.carCard.freightCar.number}`
                        : "Unassigned"}
                    </span>
                    <Badge variant="outline">{waybill.status}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {activePanel && (
                    <>
                      <p>
                        <span className="text-muted-foreground">Panel:</span>{" "}
                        {activePanel.panelNumber} of {waybill.panels.length}
                      </p>
                      {activePanel.commodity && (
                        <p>
                          <span className="text-muted-foreground">
                            Commodity:
                          </span>{" "}
                          {activePanel.commodity}
                        </p>
                      )}
                      <Badge variant="secondary">{activePanel.loadStatus}</Badge>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
