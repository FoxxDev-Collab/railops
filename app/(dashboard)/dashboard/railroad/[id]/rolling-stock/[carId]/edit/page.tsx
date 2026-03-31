import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { FreightCarForm } from "@/components/freight-cars/freight-car-form";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; carId: string }>;
}): Promise<Metadata> {
  const { carId } = await params;
  const car = await db.freightCar.findUnique({
    where: { id: carId },
    select: { reportingMarks: true, number: true },
  });
  if (!car) return { title: "Edit Freight Car" };
  return { title: `Edit ${car.reportingMarks} ${car.number}` };
}

export default async function EditFreightCarPage({
  params,
}: {
  params: Promise<{ id: string; carId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id, carId } = await params;

  const car = await db.freightCar.findFirst({
    where: {
      id: carId,
      layoutId: id,
      userId: session.user.id,
    },
    include: { silhouette: true },
  });

  if (!car) notFound();

  const backUrl = `/dashboard/railroad/${id}/rolling-stock`;

  return (
    <div className="px-1 py-2">
      <FreightCarForm
        layoutId={id}
        initialData={{
          id: car.id,
          reportingMarks: car.reportingMarks,
          number: car.number,
          carType: car.carType,
          aarTypeCode: car.aarTypeCode,
          subtype: car.subtype,
          length: car.length,
          capacity: car.capacity,
          homeRoad: car.homeRoad,
          status: car.status,
          commodities: car.commodities,
          currentLocationId: car.currentLocationId,
          silhouetteId: car.silhouetteId,
        }}
        backUrl={backUrl}
      />
    </div>
  );
}
