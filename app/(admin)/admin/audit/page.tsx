import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getAuditLogs, getAuditActionTypes } from "@/app/actions/admin/audit";
import { AuditLogClient } from "./client";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const page = parseInt(params.page ?? "1");
  const action = params.action;

  const [result, actionTypes] = await Promise.all([
    getAuditLogs({ page, action }),
    getAuditActionTypes(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Track all administrative actions and system changes
        </p>
      </div>

      <AuditLogClient
        initialLogs={result.logs}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        totalPages={result.totalPages}
        actionTypes={actionTypes}
      />
    </div>
  );
}
