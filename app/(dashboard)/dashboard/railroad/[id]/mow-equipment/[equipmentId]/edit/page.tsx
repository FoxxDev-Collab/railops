import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MOWEquipmentForm } from "@/components/mow-equipment/mow-equipment-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit MOW Equipment",
};

export default async function EditMOWEquipmentPage({
  params,
}: {
  params: Promise<{ id: string; equipmentId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const { id, equipmentId } = await params;

  const equipment = await db.mOWEquipment.findFirst({
    where: { id: equipmentId, userId: session.user.id, layoutId: id },
    include: { silhouette: true },
  });

  if (!equipment) redirect(`/dashboard/railroad/${id}/mow-equipment`);

  const backUrl = `/dashboard/railroad/${id}/mow-equipment`;

  return (
    <div className="p-6">
      <MOWEquipmentForm layoutId={id} initialData={equipment} backUrl={backUrl} />
    </div>
  );
}
