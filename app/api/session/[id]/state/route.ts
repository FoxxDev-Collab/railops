import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sessionId } = await params;

  const operatingSession = await db.operatingSession.findFirst({
    where: {
      id: sessionId,
      status: "IN_PROGRESS",
      layout: {
        OR: [
          { userId: session.user.id },
          { crewMembers: { some: { userId: session.user.id, acceptedAt: { not: null }, removedAt: null } } },
        ],
      },
    },
    include: {
      sessionTrains: {
        include: {
          train: {
            select: {
              id: true,
              trainNumber: true,
              trainName: true,
              originId: true,
              destinationId: true,
            },
          },
        },
      },
    },
  });

  if (!operatingSession) {
    return NextResponse.json({ error: "Session not found or not active" }, { status: 404 });
  }

  const trains = operatingSession.sessionTrains.map((st) => ({
    id: st.id,
    trainId: st.trainId,
    trainName: st.train.trainName ?? st.train.trainNumber,
    status: st.status ?? "IDLE",
    locationId: st.train.originId,
  }));

  return NextResponse.json({
    timestamp: Date.now(),
    sessionName: operatingSession.name,
    trains,
  });
}
