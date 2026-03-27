import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayout } from "@/app/actions/layouts";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, PlayCircle, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { SessionCardList } from "@/components/sessions/session-card-list";

export default async function SessionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id } = await params;
  const layout = await getLayout(id);

  const sessions = await db.operatingSession.findMany({
    where: { layoutId: id, userId: session.user.id },
    include: {
      sessionTrains: {
        include: { train: true },
      },
    },
    orderBy: { date: "desc" },
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
            <h1 className="text-3xl font-bold tracking-tight">
              Operating Sessions
            </h1>
            <p className="text-sm text-muted-foreground tracking-wide">
              {layout.name} — {sessions.length} session
              {sessions.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button className="transition-all duration-150 hover:shadow-md" asChild>
          <Link href={`/dashboard/railroad/${id}/sessions/new`}>
            <Plus className="mr-2 h-4 w-4" />
            New Session
          </Link>
        </Button>
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted/60">
            <PlayCircle className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-lg font-semibold">No sessions yet</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Schedule your first operating session to run trains on{" "}
              {layout.name}. Assign trains and track session progress.
            </p>
          </div>
          <Button variant="outline" className="mt-2" asChild>
            <Link href={`/dashboard/railroad/${id}/sessions/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Schedule First Session
            </Link>
          </Button>
        </div>
      ) : (
        <SessionCardList sessions={sessions} layoutId={id} />
      )}
    </div>
  );
}
