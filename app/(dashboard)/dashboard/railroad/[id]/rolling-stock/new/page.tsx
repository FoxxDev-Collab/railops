import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayout } from "@/app/actions/layouts";
import { FreightCarForm } from "@/components/freight-cars/freight-car-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Add Freight Car",
};

export default async function NewFreightCarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id } = await params;
  await getLayout(id);

  const backUrl = `/dashboard/railroad/${id}/rolling-stock`;

  return (
    <div className="px-1 py-2">
      <FreightCarForm layoutId={id} backUrl={backUrl} />
    </div>
  );
}
