import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayout } from "@/app/actions/layouts";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Plus, TrainFront } from "lucide-react";
import { LocomotiveCardList } from "@/components/locomotives/locomotive-card-list";
import { LocomotiveTable } from "@/components/locomotives/locomotive-table";
import { CollectionView } from "@/components/shared/collection-view";
import { OperationsHint } from "@/components/operations/operations-hint";

export default async function LocomotivesPage({
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
            <h1 className="text-3xl font-bold tracking-tight">Locomotives</h1>
            <p className="text-sm text-muted-foreground tracking-wide">
              {layout.name} — {layout.locomotives.length} unit
              {layout.locomotives.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button className="transition-all duration-150 hover:shadow-md" asChild>
          <Link href={`/dashboard/railroad/${id}/locomotives/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Add Locomotive
          </Link>
        </Button>
      </div>

      <OperationsHint pageKey="hint-locomotives" title="Motive power for your trains" railroadId={id} guideSection="#rolling-stock">
        Locomotives provide motive power for your trains. Add them to a consist when you&apos;re ready to build a train.
      </OperationsHint>

      {layout.locomotives.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted/60">
            <TrainFront className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-lg font-semibold">No locomotives yet</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Add your first locomotive to build your roster. Include DCC
              addressing and decoder details for operations.
            </p>
          </div>
          <Button variant="outline" className="mt-2" asChild>
            <Link href={`/dashboard/railroad/${id}/locomotives/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Locomotive
            </Link>
          </Button>
        </div>
      ) : (
        <CollectionView
          cardView={<LocomotiveCardList locomotives={layout.locomotives} layoutId={id} />}
          tableView={<LocomotiveTable locomotives={layout.locomotives} layoutId={id} />}
        />
      )}
    </div>
  );
}
