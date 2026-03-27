import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { LocomotiveForm } from "@/components/locomotives/locomotive-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Locomotive",
};

export default async function EditLocomotivePage({
  params,
}: {
  params: Promise<{ id: string; locomotiveId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const { id, locomotiveId } = await params;

  const locomotive = await db.locomotive.findFirst({
    where: { id: locomotiveId, userId: session.user.id, layoutId: id },
  });

  if (!locomotive) redirect(`/dashboard/railroad/${id}/locomotives`);

  const backUrl = `/dashboard/railroad/${id}/locomotives`;

  return (
    <div className="p-6">
      <LocomotiveForm layoutId={id} initialData={locomotive} backUrl={backUrl} />
    </div>
  );
}
