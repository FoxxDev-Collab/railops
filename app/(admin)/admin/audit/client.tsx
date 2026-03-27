"use client";

import { useRouter } from "next/navigation";
import { AuditLogTable } from "@/components/admin/audit-log-table";

interface AuditEntry {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  adminId: string;
  adminEmail: string;
  metadata: unknown;
  ipAddress: string | null;
  createdAt: Date;
}

interface AuditLogClientProps {
  initialLogs: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  actionTypes: string[];
}

export function AuditLogClient({
  initialLogs,
  total,
  page,
  pageSize,
  totalPages,
  actionTypes,
}: AuditLogClientProps) {
  const router = useRouter();

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams(window.location.search);
    params.set("page", String(newPage));
    router.push(`/admin/audit?${params.toString()}`);
  }

  function handleFilterChange(filters: { action?: string }) {
    const params = new URLSearchParams();
    if (filters.action) params.set("action", filters.action);
    params.set("page", "1");
    router.push(`/admin/audit?${params.toString()}`);
  }

  return (
    <AuditLogTable
      logs={initialLogs}
      total={total}
      page={page}
      pageSize={pageSize}
      totalPages={totalPages}
      actionTypes={actionTypes}
      onPageChange={handlePageChange}
      onFilterChange={handleFilterChange}
    />
  );
}
