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

export type TimeRange = "7d" | "30d" | "90d" | "1y" | "all";

function getDateFromRange(range: TimeRange): Date | null {
  const now = new Date();
  switch (range) {
    case "7d": return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d": return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "90d": return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case "1y": return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    case "all": return null;
  }
}

export async function getGrowthMetrics(range: TimeRange = "30d") {
  await requireAdmin();

  const since = getDateFromRange(range);
  const priorSince = since
    ? new Date(since.getTime() - (Date.now() - since.getTime()))
    : null;

  const [totalUsers, proUsers, freeUsers, currentSignups, priorSignups] =
    await Promise.all([
      db.user.count(),
      db.user.count({ where: { plan: "PRO" } }),
      db.user.count({ where: { plan: "FREE" } }),
      db.user.count({
        where: since ? { createdAt: { gte: since } } : undefined,
      }),
      priorSince && since
        ? db.user.count({
            where: { createdAt: { gte: priorSince, lt: since } },
          })
        : Promise.resolve(0),
    ]);

  const mrr = proUsers * 5;
  const conversionRate = totalUsers > 0 ? (proUsers / totalUsers) * 100 : 0;
  const arpu = totalUsers > 0 ? mrr / totalUsers : 0;
  const signupChange =
    priorSignups > 0
      ? ((currentSignups - priorSignups) / priorSignups) * 100
      : 0;

  return {
    totalUsers,
    proUsers,
    freeUsers,
    mrr,
    conversionRate: Math.round(conversionRate * 10) / 10,
    arpu: Math.round(arpu * 100) / 100,
    signups: currentSignups,
    signupChange: Math.round(signupChange * 10) / 10,
  };
}

export async function getSignupTrend(range: TimeRange = "30d") {
  await requireAdmin();

  const since = getDateFromRange(range) ?? new Date("2020-01-01");

  const users = await db.user.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true, plan: true },
    orderBy: { createdAt: "asc" },
  });

  // Group by date
  const byDate = new Map<string, { total: number; pro: number; free: number }>();
  for (const user of users) {
    const dateKey = user.createdAt.toISOString().split("T")[0];
    const entry = byDate.get(dateKey) ?? { total: 0, pro: 0, free: 0 };
    entry.total++;
    if (user.plan === "PRO") entry.pro++;
    else entry.free++;
    byDate.set(dateKey, entry);
  }

  return Array.from(byDate.entries()).map(([date, counts]) => ({
    date,
    ...counts,
  }));
}

export async function getConversionFunnel() {
  await requireAdmin();

  const [
    totalSignups,
    verified,
    createdLayout,
    addedStock,
    ranSession,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { emailVerified: { not: null } } }),
    db.user.count({ where: { layouts: { some: {} } } }),
    db.user.count({
      where: {
        OR: [
          { locomotives: { some: {} } },
          { freightCars: { some: {} } },
        ],
      },
    }),
    db.user.count({ where: { sessions: { some: {} } } }),
  ]);

  return [
    { step: "Signed Up", count: totalSignups },
    { step: "Verified Email", count: verified },
    { step: "Created Railroad", count: createdLayout },
    { step: "Added Rolling Stock", count: addedStock },
    { step: "Ran Session", count: ranSession },
  ];
}

export async function getCohortRetention(months: number = 6) {
  await requireAdmin();

  const since = new Date();
  since.setMonth(since.getMonth() - months);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  // Get all users who signed up since the start date
  const users = await db.user.findMany({
    where: { createdAt: { gte: since } },
    select: { id: true, createdAt: true },
  });

  // Get all login activities for those users
  const userIds = users.map((u) => u.id);
  const activities = await db.userActivity.findMany({
    where: {
      userId: { in: userIds },
      action: "login",
      createdAt: { gte: since },
    },
    select: { userId: true, createdAt: true },
  });

  // Build activity map: userId -> Set of "YYYY-MM" strings
  const activityMap = new Map<string, Set<string>>();
  for (const a of activities) {
    const key = a.userId;
    if (!activityMap.has(key)) activityMap.set(key, new Set());
    activityMap.get(key)!.add(
      `${a.createdAt.getFullYear()}-${String(a.createdAt.getMonth() + 1).padStart(2, "0")}`
    );
  }

  // Build cohorts
  const cohorts: Array<{
    cohort: string;
    size: number;
    retention: number[];
  }> = [];

  const now = new Date();
  for (let m = 0; m < months; m++) {
    const cohortDate = new Date(since);
    cohortDate.setMonth(cohortDate.getMonth() + m);
    const cohortKey = `${cohortDate.getFullYear()}-${String(cohortDate.getMonth() + 1).padStart(2, "0")}`;

    const cohortUsers = users.filter((u) => {
      const uMonth = `${u.createdAt.getFullYear()}-${String(u.createdAt.getMonth() + 1).padStart(2, "0")}`;
      return uMonth === cohortKey;
    });

    const retention: number[] = [];
    const maxMonthsAhead = Math.min(
      months - m,
      (now.getFullYear() - cohortDate.getFullYear()) * 12 +
        now.getMonth() -
        cohortDate.getMonth() +
        1
    );

    for (let offset = 0; offset < maxMonthsAhead; offset++) {
      const checkDate = new Date(cohortDate);
      checkDate.setMonth(checkDate.getMonth() + offset);
      const checkKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}`;

      const activeCount = cohortUsers.filter((u) =>
        activityMap.get(u.id)?.has(checkKey)
      ).length;

      retention.push(
        cohortUsers.length > 0
          ? Math.round((activeCount / cohortUsers.length) * 100)
          : 0
      );
    }

    cohorts.push({ cohort: cohortKey, size: cohortUsers.length, retention });
  }

  return cohorts;
}

export async function getFeatureUsageStats() {
  await requireAdmin();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [allTime, recent] = await Promise.all([
    db.userActivity.groupBy({
      by: ["action"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 20,
    }),
    db.userActivity.groupBy({
      by: ["action"],
      _count: { id: true },
      where: { createdAt: { gte: sevenDaysAgo } },
    }),
  ]);

  const recentMap = new Map(recent.map((r) => [r.action, r._count.id]));

  // Get unique user counts per action
  const uniqueUsers = await db.userActivity.groupBy({
    by: ["action"],
    _count: { userId: true },
    where: { action: { in: allTime.map((a) => a.action) } },
  });
  const uniqueMap = new Map(uniqueUsers.map((u) => [u.action, u._count.userId]));

  return allTime.map((a) => ({
    action: a.action,
    totalEvents: a._count.id,
    uniqueUsers: uniqueMap.get(a.action) ?? 0,
    recentEvents: recentMap.get(a.action) ?? 0,
  }));
}

export async function getEngagementDistribution() {
  await requireAdmin();

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const totalUsers = await db.user.count();

  const [dailyActive, weeklyActive, monthlyActive] = await Promise.all([
    db.userActivity.groupBy({
      by: ["userId"],
      where: { action: "login", createdAt: { gte: dayAgo } },
    }),
    db.userActivity.groupBy({
      by: ["userId"],
      where: { action: "login", createdAt: { gte: weekAgo } },
    }),
    db.userActivity.groupBy({
      by: ["userId"],
      where: { action: "login", createdAt: { gte: monthAgo } },
    }),
  ]);

  const power = dailyActive.length;
  const regular = weeklyActive.length - power;
  const casual = monthlyActive.length - weeklyActive.length;
  const dormant = totalUsers - monthlyActive.length;

  return [
    { bucket: "Power (daily)", count: power },
    { bucket: "Regular (weekly)", count: regular },
    { bucket: "Casual (monthly)", count: casual },
    { bucket: "Dormant (>30d)", count: dormant },
  ];
}

export async function getResourceCounts() {
  await requireAdmin();

  const [
    layouts, locations, locomotives, freightCars,
    passengerCars, cabooses, mowEquipment, trains,
    waybills, sessions,
  ] = await Promise.all([
    db.layout.count(),
    db.location.count(),
    db.locomotive.count(),
    db.freightCar.count(),
    db.passengerCar.count(),
    db.caboose.count(),
    db.mOWEquipment.count(),
    db.train.count(),
    db.waybill.count(),
    db.operatingSession.count(),
  ]);

  return [
    { resource: "Railroads", count: layouts },
    { resource: "Locations", count: locations },
    { resource: "Locomotives", count: locomotives },
    { resource: "Freight Cars", count: freightCars },
    { resource: "Passenger Cars", count: passengerCars },
    { resource: "Cabooses", count: cabooses },
    { resource: "MOW Equipment", count: mowEquipment },
    { resource: "Trains", count: trains },
    { resource: "Waybills", count: waybills },
    { resource: "Sessions", count: sessions },
  ];
}
