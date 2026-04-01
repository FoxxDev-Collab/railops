import { db } from "@/lib/db";
import { Plan } from "@prisma/client";

const PLAN_LIMITS: Record<Plan, {
  maxLayouts: number;
  maxTotalItems: number;
  canExport: boolean;
  maxCrew: number;
}> = {
  FREE: {
    maxLayouts: 1,
    maxTotalItems: 50,
    canExport: false,
    maxCrew: 0,
  },
  PRO: {
    maxLayouts: 5,
    maxTotalItems: Infinity,
    canExport: true,
    maxCrew: Infinity, // 1 included, additional paid per seat via Stripe
  },
};

export function getPlanLimits(plan: Plan) {
  return PLAN_LIMITS[plan];
}

/**
 * Checks the total item limit across all countable categories for a user.
 * Free plan: 50 total items (locations + all rolling stock + trains).
 * Pro plan: unlimited.
 */
export async function checkTotalItemLimit(
  userId: string
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });

  const plan = user?.plan ?? "FREE";
  const limits = getPlanLimits(plan);
  const limit = limits.maxTotalItems;

  if (limit === Infinity) {
    return { allowed: true, current: 0, limit };
  }

  const [locations, locomotives, freightCars, passengerCars, mowEquipment, cabooses, trains] =
    await Promise.all([
      db.location.count({ where: { userId } }),
      db.locomotive.count({ where: { userId } }),
      db.freightCar.count({ where: { userId } }),
      db.passengerCar.count({ where: { userId } }),
      db.mOWEquipment.count({ where: { userId } }),
      db.caboose.count({ where: { userId } }),
      db.train.count({ where: { userId } }),
    ]);

  const current = locations + locomotives + freightCars + passengerCars + mowEquipment + cabooses + trains;
  return { allowed: current < limit, current, limit };
}

export async function checkRailroadLimit(
  userId: string
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });

  const plan = user?.plan ?? "FREE";
  const limits = getPlanLimits(plan);
  const limit = limits.maxLayouts;

  if (limit === Infinity) {
    return { allowed: true, current: 0, limit };
  }

  const current = await db.layout.count({ where: { userId } });
  return { allowed: current < limit, current, limit };
}

export async function canExport(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  return getPlanLimits(user?.plan ?? "FREE").canExport;
}

export async function checkCrewLimit(
  layoutId: string
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const layout = await db.layout.findUnique({
    where: { id: layoutId },
    include: { user: { select: { plan: true } } },
  });

  if (!layout) return { allowed: false, current: 0, limit: 0 };

  const limits = getPlanLimits(layout.user.plan);
  const limit = limits.maxCrew;

  if (limit === Infinity) {
    return { allowed: true, current: 0, limit };
  }

  const current = await db.crewMember.count({
    where: {
      layoutId,
      acceptedAt: { not: null },
      removedAt: null,
    },
  });

  return { allowed: current < limit, current, limit };
}
