import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayout } from "@/app/actions/layouts";
import { SessionForm } from "@/components/sessions/session-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Operating Session",
};

export default async function NewSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id } = await params;
  const layout = await getLayout(id);

  const trains = layout.trains.map((t) => ({
    id: t.id,
    trainNumber: t.trainNumber,
    trainName: t.trainName,
  }));

  const backUrl = `/dashboard/railroad/${id}/sessions`;

  return (
    <SessionForm layoutId={id} trains={trains} backUrl={backUrl} />
  );
}
