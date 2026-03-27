import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayout } from "@/app/actions/layouts";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Plus, FileText, Printer } from "lucide-react";
import { db } from "@/lib/db";
import { WaybillCardList } from "@/components/waybills/waybill-card-list";
import { WaybillTable } from "@/components/waybills/waybill-table";
import { CollectionView } from "@/components/shared/collection-view";
import { OperationsHint } from "@/components/operations/operations-hint";

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
      panels: {
        orderBy: { panelNumber: "asc" },
        include: {
          origin: true,
          destination: true,
          shipperIndustry: true,
          consigneeIndustry: true,
        },
      },
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
            <h1 className="text-3xl font-bold tracking-tight">Waybills</h1>
            <p className="text-sm text-muted-foreground tracking-wide">
              {layout.name} — {waybills.length} waybill
              {waybills.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {waybills.length > 0 && (
            <Button variant="outline" asChild>
              <Link href={`/dashboard/railroad/${id}/waybills/print`}>
                <Printer className="mr-2 h-4 w-4" />
                Print All
              </Link>
            </Button>
          )}
          <Button
            className="transition-all duration-150 hover:shadow-md"
            asChild
          >
            <Link href={`/dashboard/railroad/${id}/waybills/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Create Waybill
            </Link>
          </Button>
        </div>
      </div>

      <OperationsHint pageKey="hint-waybills" title="Shipping orders for your cars" railroadId={id} guideSection="#waybills">
        Waybills are shipping orders — they tell the system where each car needs to go. The switch list is generated from these.
      </OperationsHint>

      {waybills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted/60">
            <FileText className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-lg font-semibold">No waybills yet</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Create waybills to route freight cars between locations and
              industries on your railroad. Up to four panels per waybill.
            </p>
          </div>
          <Button variant="outline" className="mt-2" asChild>
            <Link href={`/dashboard/railroad/${id}/waybills/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Waybill
            </Link>
          </Button>
        </div>
      ) : (
        <CollectionView
          cardView={<WaybillCardList waybills={waybills} layoutId={id} />}
          tableView={<WaybillTable waybills={waybills} layoutId={id} />}
        />
      )}
    </div>
  );
}
