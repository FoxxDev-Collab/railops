import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayout } from "@/app/actions/layouts";
import { LocationForm } from "@/components/locations/location-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Location",
};

export default async function NewLocationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id } = await params;
  await getLayout(id);

  return (
    <div className="space-y-6">
      <LocationForm
        layoutId={id}
        backUrl={`/dashboard/railroad/${id}/locations`}
      />
    </div>
  );
}
