import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayout } from "@/app/actions/layouts";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Plus, MapPin } from "lucide-react";
import { LocationCardList } from "@/components/locations/location-card-list";
import { LocationTable } from "@/components/locations/location-table";
import { CollectionView } from "@/components/shared/collection-view";

export default async function LocationsPage({
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
            <h1 className="text-3xl font-bold tracking-tight">Locations</h1>
            <p className="text-sm text-muted-foreground tracking-wide">
              {layout.name} — {layout.locations.length} location
              {layout.locations.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button className="transition-all duration-150 hover:shadow-md" asChild>
          <Link href={`/dashboard/railroad/${id}/locations/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Add Location
          </Link>
        </Button>
      </div>

      {layout.locations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted/60">
            <MapPin className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-lg font-semibold">No locations yet</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Locations are the backbone of your railroad — stations, yards,
              interchanges, and sidings where trains stop and cars are spotted.
            </p>
          </div>
          <Button variant="outline" className="mt-2" asChild>
            <Link href={`/dashboard/railroad/${id}/locations/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Location
            </Link>
          </Button>
        </div>
      ) : (
        <CollectionView
          cardView={<LocationCardList locations={layout.locations} layoutId={id} />}
          tableView={<LocationTable locations={layout.locations} layoutId={id} />}
        />
      )}
    </div>
  );
}
