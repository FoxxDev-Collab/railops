import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { WaybillPrintView } from "@/components/waybills/waybill-print-view";
import { PrintPageShell } from "@/components/waybills/print-page-shell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Print Waybill",
};

export default async function PrintWaybillPage({
  params,
}: {
  params: Promise<{ id: string; waybillId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const { id, waybillId } = await params;

  const waybill = await db.waybill.findFirst({
    where: { id: waybillId, userId: session.user.id },
    include: {
      panels: {
        orderBy: { panelNumber: "asc" },
        include: {
          origin: { select: { name: true } },
          destination: { select: { name: true } },
          shipperIndustry: { select: { name: true } },
          consigneeIndustry: { select: { name: true } },
        },
      },
      carCard: {
        include: {
          freightCar: {
            select: {
              reportingMarks: true,
              number: true,
              carType: true,
              aarTypeCode: true,
              homeRoad: true,
            },
          },
        },
      },
    },
  });

  if (!waybill) redirect(`/dashboard/railroad/${id}/waybills`);

  return (
    <PrintPageShell
      title="Print Waybill"
      backUrl={`/dashboard/railroad/${id}/waybills`}
    >
      <WaybillPrintView waybill={waybill} />
    </PrintPageShell>
  );
}
