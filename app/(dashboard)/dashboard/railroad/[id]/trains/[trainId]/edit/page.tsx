import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getLayout } from "@/app/actions/layouts";
import { TrainForm } from "@/components/trains/train-form";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; trainId: string }>;
}): Promise<Metadata> {
  const { trainId } = await params;
  const train = await db.train.findUnique({
    where: { id: trainId },
    select: { trainNumber: true, trainName: true },
  });
  return {
    title: train
      ? `Edit Train ${train.trainNumber}`
      : "Edit Train",
  };
}

export default async function EditTrainPage({
  params,
}: {
  params: Promise<{ id: string; trainId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id, trainId } = await params;

  const [train, layout] = await Promise.all([
    db.train.findFirst({
      where: { id: trainId, userId: session.user.id },
      select: {
        id: true,
        trainNumber: true,
        trainName: true,
        trainClass: true,
        serviceType: true,
        departureTime: true,
        symbol: true,
        description: true,
        originId: true,
        destinationId: true,
        isActive: true,
      },
    }),
    getLayout(id),
  ]);

  if (!train) notFound();

  const locationOptions = layout.locations.map((l) => ({
    id: l.id,
    name: l.name,
    code: l.code,
  }));

  const backUrl = `/dashboard/railroad/${id}/trains`;

  return (
    <TrainForm
      layoutId={id}
      locations={locationOptions}
      backUrl={backUrl}
      initialData={train}
    />
  );
}
