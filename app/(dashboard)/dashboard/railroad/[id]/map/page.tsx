import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getCanvasData } from "@/app/actions/canvas";
import { MapEditor } from "@/components/map/map-editor";
import { db } from "@/lib/db";

interface MapPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session?: string; view?: string; location?: string }>;
}

export default async function MapPage({ params, searchParams }: MapPageProps) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id: layoutId } = await params;
  const query = await searchParams;
  const canvasData = await getCanvasData(layoutId);

  // Check for active session
  const activeSession = await db.operatingSession.findFirst({
    where: {
      layoutId,
      status: "IN_PROGRESS",
    },
    select: { id: true, userId: true },
  });

  const isDispatcher = activeSession?.userId === session.user.id;

  return (
    <div className="h-[calc(100vh-theme(spacing.12))] -m-6">
      <MapEditor
        canvasData={JSON.parse(JSON.stringify(canvasData))}
        layoutId={layoutId}
        activeSessionId={activeSession?.id ?? null}
        isDispatcher={isDispatcher}
        initialView={query.view as "overview" | "detail" | undefined}
        initialDetailLocationId={query.location ?? null}
      />
    </div>
  );
}
