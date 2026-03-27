import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayout } from "@/app/actions/layouts";
import { PassengerCarForm } from "@/components/passenger-cars/passenger-car-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Add Passenger Car",
};

export default async function NewPassengerCarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id } = await params;
  await getLayout(id);

  const backUrl = `/dashboard/railroad/${id}/passenger-cars`;

  return (
    <div className="p-6">
      <PassengerCarForm layoutId={id} backUrl={backUrl} />
    </div>
  );
}
