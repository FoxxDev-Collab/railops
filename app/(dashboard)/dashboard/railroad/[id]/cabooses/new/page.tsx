import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLayout } from "@/app/actions/layouts";
import { CabooseForm } from "@/components/cabooses/caboose-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Add Caboose",
};

export default async function NewCaboosePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id } = await params;
  await getLayout(id);

  const backUrl = `/dashboard/railroad/${id}/cabooses`;

  return (
    <div className="p-6">
      <CabooseForm layoutId={id} backUrl={backUrl} />
    </div>
  );
}
