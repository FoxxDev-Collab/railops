"use server";

import { adminAuth } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { testSmtpConnection, testStripeConnection } from "@/app/actions/admin/settings";

async function requireAdmin() {
  const session = await adminAuth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

type HealthStatus = "healthy" | "degraded" | "down";

interface ServiceHealth {
  name: string;
  status: HealthStatus;
  message: string;
  responseMs?: number;
}

export async function getSystemHealth(): Promise<ServiceHealth[]> {
  await requireAdmin();

  const checks = await Promise.allSettled([
    // Database
    (async (): Promise<ServiceHealth> => {
      const start = Date.now();
      try {
        await db.$queryRaw`SELECT 1`;
        return {
          name: "Database",
          status: "healthy",
          message: "PostgreSQL connected",
          responseMs: Date.now() - start,
        };
      } catch {
        return {
          name: "Database",
          status: "down",
          message: "Connection failed",
          responseMs: Date.now() - start,
        };
      }
    })(),
    // SMTP
    (async (): Promise<ServiceHealth> => {
      const start = Date.now();
      const result = await testSmtpConnection();
      return {
        name: "SMTP",
        status: result.success ? "healthy" : "degraded",
        message: result.message,
        responseMs: Date.now() - start,
      };
    })(),
    // Stripe
    (async (): Promise<ServiceHealth> => {
      const start = Date.now();
      const result = await testStripeConnection();
      return {
        name: "Stripe",
        status: result.success ? "healthy" : "degraded",
        message: result.message,
        responseMs: Date.now() - start,
      };
    })(),
    // Auth (just check session works — if we got here, it works)
    Promise.resolve<ServiceHealth>({
      name: "Auth",
      status: "healthy",
      message: "NextAuth.js operational",
    }),
  ]);

  return checks.map((result) =>
    result.status === "fulfilled"
      ? result.value
      : { name: "Unknown", status: "down" as HealthStatus, message: "Check failed" }
  );
}

export async function getDatabaseStats() {
  await requireAdmin();

  const [
    users, layouts, locations, industries,
    locomotives, freightCars, passengerCars, cabooses,
    mowEquipment, trains, waybills, carCards, sessions,
    auditLogs, userActivities,
  ] = await Promise.all([
    db.user.count(),
    db.layout.count(),
    db.location.count(),
    db.industry.count(),
    db.locomotive.count(),
    db.freightCar.count(),
    db.passengerCar.count(),
    db.caboose.count(),
    db.mOWEquipment.count(),
    db.train.count(),
    db.waybill.count(),
    db.carCard.count(),
    db.operatingSession.count(),
    db.auditLog.count(),
    db.userActivity.count(),
  ]);

  return [
    { table: "User", rows: users },
    { table: "Layout", rows: layouts },
    { table: "Location", rows: locations },
    { table: "Industry", rows: industries },
    { table: "Locomotive", rows: locomotives },
    { table: "FreightCar", rows: freightCars },
    { table: "PassengerCar", rows: passengerCars },
    { table: "Caboose", rows: cabooses },
    { table: "MOWEquipment", rows: mowEquipment },
    { table: "Train", rows: trains },
    { table: "Waybill", rows: waybills },
    { table: "CarCard", rows: carCards },
    { table: "OperatingSession", rows: sessions },
    { table: "AuditLog", rows: auditLogs },
    { table: "UserActivity", rows: userActivities },
  ];
}

export async function getRecentErrors(limit: number = 20) {
  await requireAdmin();

  return db.errorLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getActiveUserCounts() {
  await requireAdmin();

  const now = new Date();
  const fifteenMin = new Date(now.getTime() - 15 * 60 * 1000);
  const oneHour = new Date(now.getTime() - 60 * 60 * 1000);
  const twentyFourHours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [last15m, last1h, last24h] = await Promise.all([
    db.userActivity.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: fifteenMin } },
    }),
    db.userActivity.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: oneHour } },
    }),
    db.userActivity.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: twentyFourHours } },
    }),
  ]);

  return {
    last15m: last15m.length,
    last1h: last1h.length,
    last24h: last24h.length,
  };
}

export async function getErrorLogs({
  page = 1,
  pageSize = 25,
  level,
  source,
  dateFrom,
  dateTo,
}: {
  page?: number;
  pageSize?: number;
  level?: string;
  source?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  await requireAdmin();

  const where: Record<string, unknown> = {};
  if (level) where.level = level;
  if (source) where.source = source;
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    };
  }

  const [logs, total] = await Promise.all([
    db.errorLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.errorLog.count({ where }),
  ]);

  return {
    logs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getErrorFrequency(hours: number = 24) {
  await requireAdmin();

  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const errors = await db.errorLog.findMany({
    where: { createdAt: { gte: since } },
    select: { level: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Group by hour
  const byHour = new Map<string, { error: number; warn: number; fatal: number }>();
  for (const err of errors) {
    const hourKey = err.createdAt.toISOString().slice(0, 13);
    const entry = byHour.get(hourKey) ?? { error: 0, warn: 0, fatal: 0 };
    if (err.level === "error") entry.error++;
    else if (err.level === "warn") entry.warn++;
    else if (err.level === "fatal") entry.fatal++;
    byHour.set(hourKey, entry);
  }

  return Array.from(byHour.entries()).map(([hour, counts]) => ({
    hour: hour + ":00",
    ...counts,
  }));
}
