import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { LocationForm } from "@/components/locations/location-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Location",
};

export default async function EditLocationPage({
  params,
}: {
  params: Promise<{ id: string; locationId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id, locationId } = await params;

  const location = await db.location.findFirst({
    where: { id: locationId, userId: session.user.id },
    include: { industries: true, yardTracks: true },
  });

  if (!location) redirect(`/dashboard/railroad/${id}/locations`);

  const backUrl = `/dashboard/railroad/${id}/locations`;

  return (
    <div className="space-y-6">
      <LocationForm
        layoutId={id}
        initialData={{
          ...location,
          typeAttributes: location.typeAttributes as Record<string, unknown> | null,
        }}
        backUrl={backUrl}
      />
    </div>
  );
}
