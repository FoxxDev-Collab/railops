import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayout } from "@/app/actions/layouts";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Plus, Armchair } from "lucide-react";
import { PassengerCarCardList } from "@/components/passenger-cars/passenger-car-card-list";
import { PassengerCarTable } from "@/components/passenger-cars/passenger-car-table";
import { CollectionView } from "@/components/shared/collection-view";
import { OperationsHint } from "@/components/operations/operations-hint";

export default async function PassengerCarsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id } = await params;
  const layout = await getLayout(id);

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
            <h1 className="text-3xl font-bold tracking-tight">Passenger Cars</h1>
            <p className="text-sm text-muted-foreground tracking-wide">
              {layout.name} — {layout.passengerCars.length} car
              {layout.passengerCars.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button className="transition-all duration-150 hover:shadow-md" asChild>
          <Link href={`/dashboard/railroad/${id}/passenger-cars/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Add Car
          </Link>
        </Button>
      </div>

      <OperationsHint pageKey="hint-passenger-cars" title="Carry your passengers" railroadId={id} guideSection="#rolling-stock">
        Passenger cars are added to consists for passenger and mixed trains.
      </OperationsHint>

      {layout.passengerCars.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted/60">
            <Armchair className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-lg font-semibold">No passenger cars yet</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Add coaches, sleepers, diners, and other passenger equipment to
              your car inventory for use in passenger train consists.
            </p>
          </div>
          <Button variant="outline" className="mt-2" asChild>
            <Link href={`/dashboard/railroad/${id}/passenger-cars/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Car
            </Link>
          </Button>
        </div>
      ) : (
        <CollectionView
          cardView={<PassengerCarCardList passengerCars={layout.passengerCars} layoutId={id} />}
          tableView={<PassengerCarTable passengerCars={layout.passengerCars} layoutId={id} />}
        />
      )}
    </div>
  );
}
