import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayout } from "@/app/actions/layouts";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Plus, Train } from "lucide-react";
import { FreightCarCardList } from "@/components/freight-cars/freight-car-card-list";
import { FreightCarTable } from "@/components/freight-cars/freight-car-table";
import { CollectionView } from "@/components/shared/collection-view";

export default async function RollingStockPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id } = await params;
  const layout = await getLayout(id);

  const newCarUrl = `/dashboard/railroad/${id}/rolling-stock/new`;

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
            <h1 className="text-3xl font-bold tracking-tight">Freight Cars</h1>
            <p className="text-sm text-muted-foreground tracking-wide">
              {layout.name} — {layout.freightCars.length} car
              {layout.freightCars.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button className="transition-all duration-150 hover:shadow-md" asChild>
          <Link href={newCarUrl}>
            <Plus className="mr-2 h-4 w-4" />
            Add Car
          </Link>
        </Button>
      </div>

      {layout.freightCars.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted/60">
            <Train className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-lg font-semibold">No freight cars yet</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Add boxcars, hoppers, tankers, gondolas, and flats to your car
              inventory. Cars can be assigned commodities for waybill generation.
            </p>
          </div>
          <Button variant="outline" className="mt-2" asChild>
            <Link href={newCarUrl}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Car
            </Link>
          </Button>
        </div>
      ) : (
        <CollectionView
          cardView={<FreightCarCardList freightCars={layout.freightCars} layoutId={id} />}
          tableView={<FreightCarTable freightCars={layout.freightCars} layoutId={id} />}
        />
      )}
    </div>
  );
}
