import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getLayout } from "@/app/actions/layouts";
import { WaybillPrintView } from "@/components/waybills/waybill-print-view";
import { PrintPageShell } from "@/components/waybills/print-page-shell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Print All Waybills",
};

export default async function BatchPrintWaybillsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const { id } = await params;
  const layout = await getLayout(id);

  const waybills = await db.waybill.findMany({
    where: { userId: session.user.id },
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
    orderBy: { createdAt: "asc" },
  });

  return (
    <PrintPageShell
      title={`Print All Waybills (${waybills.length})`}
      backUrl={`/dashboard/railroad/${id}/waybills`}
    >
      {waybills.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground print:hidden">
          No waybills to print.
        </p>
      ) : (
        <div className="space-y-8 print:space-y-0">
          {waybills.map((waybill) => (
            <div key={waybill.id} className="break-after-page">
              <WaybillPrintView waybill={waybill} />
            </div>
          ))}
        </div>
      )}
    </PrintPageShell>
  );
}
