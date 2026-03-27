import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayout } from "@/app/actions/layouts";
import { MOWEquipmentForm } from "@/components/mow-equipment/mow-equipment-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Add MOW Equipment",
};

export default async function NewMOWEquipmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id } = await params;
  await getLayout(id);

  const backUrl = `/dashboard/railroad/${id}/mow-equipment`;

  return (
    <div className="p-6">
      <MOWEquipmentForm layoutId={id} backUrl={backUrl} />
    </div>
  );
}
