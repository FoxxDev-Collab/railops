import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayout } from "@/app/actions/layouts";
import { WaybillForm } from "@/components/waybills/waybill-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Waybill",
};

export default async function NewWaybillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id } = await params;
  const layout = await getLayout(id);

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

  return (
    <div className="p-6">
      <WaybillForm
        layoutId={id}
        backUrl={backUrl}
        freightCars={freightCars}
        locations={locations}
      />
    </div>
  );
}
