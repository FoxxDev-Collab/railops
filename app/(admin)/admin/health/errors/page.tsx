import { adminAuth } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { getErrorLogs, getErrorFrequency } from "@/app/actions/admin/health";
import { ErrorBrowserClient } from "@/components/admin/health/error-browser-client";

export default async function ErrorsPage() {
  const session = await adminAuth();
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const [logsResult, frequency] = await Promise.all([
    getErrorLogs({ page: 1 }),
    getErrorFrequency(24),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Error Browser</h1>
        <p className="text-sm text-muted-foreground">
          Browse, filter, and investigate system errors
        </p>
      </div>

      <ErrorBrowserClient
        initialLogs={logsResult.logs}
        total={logsResult.total}
        page={logsResult.page}
        pageSize={logsResult.pageSize}
        totalPages={logsResult.totalPages}
        frequencyData={frequency}
      />
    </div>
  );
}
