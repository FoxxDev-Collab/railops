import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { PassengerCarForm } from "@/components/passenger-cars/passenger-car-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Passenger Car",
};

export default async function EditPassengerCarPage({
  params,
}: {
  params: Promise<{ id: string; carId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const { id, carId } = await params;

  const car = await db.passengerCar.findFirst({
    where: { id: carId, userId: session.user.id, layoutId: id },
    include: { silhouette: true },
  });

  if (!car) redirect(`/dashboard/railroad/${id}/passenger-cars`);

  const backUrl = `/dashboard/railroad/${id}/passenger-cars`;

  return (
    <div className="p-6">
      <PassengerCarForm layoutId={id} initialData={car} backUrl={backUrl} />
    </div>
  );
}
