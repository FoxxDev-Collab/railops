import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayout } from "@/app/actions/layouts";
import { LocomotiveForm } from "@/components/locomotives/locomotive-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Add Locomotive",
};

export default async function NewLocomotivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id } = await params;
  await getLayout(id);

  const backUrl = `/dashboard/railroad/${id}/locomotives`;

  return (
    <div className="p-6">
      <LocomotiveForm layoutId={id} backUrl={backUrl} />
    </div>
  );
}
