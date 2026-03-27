import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getLayout } from "@/app/actions/layouts";
import { db } from "@/lib/db";
import { SessionForm } from "@/components/sessions/session-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Operating Session",
};

export default async function EditSessionPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id, sessionId } = await params;

  const [layout, operatingSession] = await Promise.all([
    getLayout(id),
    db.operatingSession.findFirst({
      where: { id: sessionId, layoutId: id, userId: session.user.id },
      include: {
        sessionTrains: {
          include: { train: true },
        },
      },
    }),
  ]);

  if (!operatingSession) notFound();

  const trains = layout.trains.map((t) => ({
    id: t.id,
    trainNumber: t.trainNumber,
    trainName: t.trainName,
  }));

  const backUrl = `/dashboard/railroad/${id}/sessions`;

  return (
    <SessionForm
      layoutId={id}
      initialData={operatingSession}
      trains={trains}
      backUrl={backUrl}
    />
  );
}
