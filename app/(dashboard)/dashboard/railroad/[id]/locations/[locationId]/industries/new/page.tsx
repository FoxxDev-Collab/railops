import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { IndustryForm } from "@/components/locations/industry-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Add Industry",
};

export default async function NewIndustryPage({
  params,
}: {
  params: Promise<{ id: string; locationId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id, locationId } = await params;

  const location = await db.location.findFirst({
    where: { id: locationId, userId: session.user.id },
    select: { id: true, name: true },
  });

  if (!location) redirect(`/dashboard/railroad/${id}/locations`);

  const backUrl = `/dashboard/railroad/${id}/locations`;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <IndustryForm
        locationId={locationId}
        locationName={location.name}
        layoutId={id}
        backUrl={backUrl}
      />
    </div>
  );
}
