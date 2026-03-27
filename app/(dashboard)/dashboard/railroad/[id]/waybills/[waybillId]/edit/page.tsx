import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayout } from "@/app/actions/layouts";
import { db } from "@/lib/db";
import { WaybillForm } from "@/components/waybills/waybill-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Waybill",
};

export default async function EditWaybillPage({
  params,
}: {
  params: Promise<{ id: string; waybillId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const { id, waybillId } = await params;

  const [layout, waybill] = await Promise.all([
    getLayout(id),
    db.waybill.findFirst({
      where: { id: waybillId, userId: session.user.id },
      include: {
        panels: { orderBy: { panelNumber: "asc" } },
        carCard: true,
      },
    }),
  ]);

  if (!waybill) redirect(`/dashboard/railroad/${id}/waybills`);

  const backUrl = `/dashboard/railroad/${id}/waybills`;

  const freightCars = layout.freightCars.map((car) => ({
    id: car.id,
    reportingMarks: car.reportingMarks,
    number: car.number,
  }));

  const locations = layout.locations.map((loc) => ({
    id: loc.id,
    name: loc.name,
    industries: loc.industries.map((ind) => ({ id: ind.id, name: ind.name })),
  }));

  const initialData = {
    id: waybill.id,
    isReturnable: waybill.isReturnable,
    notes: waybill.notes,
    panels: waybill.panels,
    carCard: waybill.carCard ? { freightCarId: waybill.carCard.freightCarId } : null,
  };

  return (
    <div className="p-6">
      <WaybillForm
        layoutId={id}
        initialData={initialData}
        backUrl={backUrl}
        freightCars={freightCars}
        locations={locations}
      />
    </div>
  );
}
