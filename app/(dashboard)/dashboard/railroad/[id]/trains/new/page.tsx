import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayout } from "@/app/actions/layouts";
import { TrainForm } from "@/components/trains/train-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Train",
};

export default async function NewTrainPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id } = await params;
  const layout = await getLayout(id);

  const locationOptions = layout.locations.map((l) => ({
    id: l.id,
    name: l.name,
    code: l.code,
  }));

  const backUrl = `/dashboard/railroad/${id}/trains`;

  return (
    <TrainForm
      layoutId={id}
      locations={locationOptions}
      backUrl={backUrl}
    />
  );
}
