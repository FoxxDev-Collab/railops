import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayout } from "@/app/actions/layouts";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Plus, TrainTrack } from "lucide-react";
import { CabooseCardList } from "@/components/cabooses/caboose-card-list";
import { CabooseTable } from "@/components/cabooses/caboose-table";
import { CollectionView } from "@/components/shared/collection-view";

export default async function CaboosesPage({
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
            <h1 className="text-3xl font-bold tracking-tight">Cabooses</h1>
            <p className="text-sm text-muted-foreground tracking-wide">
              {layout.name} — {layout.cabooses.length} caboose
              {layout.cabooses.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button className="transition-all duration-150 hover:shadow-md" asChild>
          <Link href={`/dashboard/railroad/${id}/cabooses/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Add Caboose
          </Link>
        </Button>
      </div>

      {layout.cabooses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted/60">
            <TrainTrack className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-lg font-semibold">No cabooses yet</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Add standard, bay window, extended vision, transfer, and bobber
              cabooses to your car inventory.
            </p>
          </div>
          <Button variant="outline" className="mt-2" asChild>
            <Link href={`/dashboard/railroad/${id}/cabooses/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Caboose
            </Link>
          </Button>
        </div>
      ) : (
        <CollectionView
          cardView={<CabooseCardList cabooses={layout.cabooses} layoutId={id} />}
          tableView={<CabooseTable cabooses={layout.cabooses} layoutId={id} />}
        />
      )}
    </div>
  );
}
