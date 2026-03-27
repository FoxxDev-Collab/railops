import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayout } from "@/app/actions/layouts";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Plus, Route } from "lucide-react";
import { TrainCardList } from "@/components/trains/train-card-list";

export default async function TrainsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id } = await params;
  const layout = await getLayout(id);

  const locationOptions = layout.locations.map((l) => ({
    id: l.id,
    name: l.name,
    code: l.code,
  }));

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
            <h1 className="text-3xl font-bold tracking-tight">Trains</h1>
            <p className="text-sm text-muted-foreground tracking-wide">
              {layout.name} — {layout.trains.length} train
              {layout.trains.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button className="transition-all duration-150 hover:shadow-md" asChild>
          <Link href={`/dashboard/railroad/${id}/trains/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Create Train
          </Link>
        </Button>
      </div>

      {layout.trains.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted/60">
            <Route className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-lg font-semibold">No trains yet</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Define train services with numbers, classes, origin/destination,
              and schedules. Trains are assigned consists during operating
              sessions.
            </p>
          </div>
          <Button variant="outline" className="mt-2" asChild>
            <Link href={`/dashboard/railroad/${id}/trains/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Train
            </Link>
          </Button>
        </div>
      ) : (
        <TrainCardList
          trains={layout.trains}
          layoutId={id}
        />
      )}
    </div>
  );
}
