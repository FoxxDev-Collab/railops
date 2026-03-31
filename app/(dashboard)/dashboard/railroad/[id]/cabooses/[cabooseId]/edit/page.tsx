import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { CabooseForm } from "@/components/cabooses/caboose-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Caboose",
};

export default async function EditCaboosePage({
  params,
}: {
  params: Promise<{ id: string; cabooseId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const { id, cabooseId } = await params;

  const caboose = await db.caboose.findFirst({
    where: { id: cabooseId, userId: session.user.id, layoutId: id },
    include: { silhouette: true },
  });

  if (!caboose) redirect(`/dashboard/railroad/${id}/cabooses`);

  const backUrl = `/dashboard/railroad/${id}/cabooses`;

  return (
    <div className="p-6">
      <CabooseForm layoutId={id} initialData={caboose} backUrl={backUrl} />
    </div>
  );
}
