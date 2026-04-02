import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalUsers, proUsers, freeUsers, activeUsers, signups] =
      await Promise.all([
        db.user.count(),
        db.user.count({ where: { plan: "PRO" } }),
        db.user.count({ where: { plan: "FREE" } }),
        db.userActivity
          .groupBy({
            by: ["userId"],
            where: { createdAt: { gte: twentyFourHoursAgo } },
          })
          .then((r) => r.length),
        db.user.count({
          where: {
            createdAt: { gte: today },
          },
        }),
      ]);

    const mrr = proUsers * 5;

    const metrics = [
      { date: today, metric: "total_users", value: totalUsers },
      { date: today, metric: "pro_users", value: proUsers },
      { date: today, metric: "free_users", value: freeUsers },
      { date: today, metric: "mrr", value: mrr },
      { date: today, metric: "active_users", value: activeUsers },
      { date: today, metric: "signups", value: signups },
    ];

    for (const m of metrics) {
      await db.dailyMetric.upsert({
        where: { date_metric: { date: m.date, metric: m.metric } },
        update: { value: m.value },
        create: m,
      });
    }

    return NextResponse.json({
      success: true,
      date: today.toISOString(),
      metrics: metrics.map((m) => ({ metric: m.metric, value: m.value })),
    });
  } catch (error) {
    console.error("[CRON] Daily metrics failed:", error);
    return NextResponse.json(
      { error: "Failed to compute metrics" },
      { status: 500 }
    );
  }
}
