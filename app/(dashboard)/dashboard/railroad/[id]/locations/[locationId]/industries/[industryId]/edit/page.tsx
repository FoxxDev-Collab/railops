import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { IndustryForm } from "@/components/locations/industry-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Industry",
};

export default async function EditIndustryPage({
  params,
}: {
  params: Promise<{ id: string; locationId: string; industryId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id, locationId, industryId } = await params;

  const industry = await db.industry.findFirst({
    where: {
      id: industryId,
      location: {
        id: locationId,
        userId: session.user.id,
      },
    },
    include: {
      location: { select: { name: true } },
    },
  });

  if (!industry) redirect(`/dashboard/railroad/${id}/locations`);

  const backUrl = `/dashboard/railroad/${id}/locations`;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <IndustryForm
        locationId={locationId}
        locationName={industry.location.name}
        layoutId={id}
        initialData={{
          id: industry.id,
          name: industry.name,
          type: industry.type,
          capacity: industry.capacity,
          spotCount: industry.spotCount,
          trackLength: industry.trackLength,
          description: industry.description,
          commoditiesIn: industry.commoditiesIn,
          commoditiesOut: industry.commoditiesOut,
        }}
        backUrl={backUrl}
      />
    </div>
  );
}
