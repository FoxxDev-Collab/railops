"use server";

import { adminAuth } from "@/lib/admin-auth";
import { db } from "@/lib/db";

async function requireAdmin() {
  const session = await adminAuth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

interface AuditLogFilters {
  action?: string;
  adminId?: string;
  entityType?: string;
  page?: number;
  pageSize?: number;
}

export async function getAuditLogs(filters: AuditLogFilters = {}) {
  await requireAdmin();

  const { action, adminId, entityType, page = 1, pageSize = 50 } = filters;

  const where: Record<string, unknown> = {};
  if (action) where.action = { startsWith: action };
  if (adminId) where.adminId = adminId;
  if (entityType) where.entityType = entityType;

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.auditLog.count({ where }),
  ]);

  return { logs, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getRecentActivity(limit = 10) {
  await requireAdmin();

  return db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getAuditActionTypes() {
  await requireAdmin();

  const actions = await db.auditLog.findMany({
    select: { action: true },
    distinct: ["action"],
    orderBy: { action: "asc" },
  });

  return actions.map((a) => a.action);
}
