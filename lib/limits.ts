import { db } from "@/lib/db";
import { Plan } from "@prisma/client";

// ─── Seat constants ─────────────────────────────────────────────────────
export const BASE_SEATS_PRO = 1;
export const MAX_TOTAL_CREW = 10;
export const MAX_EXTRA_SEATS = MAX_TOTAL_CREW - BASE_SEATS_PRO; // 9

const PLAN_LIMITS: Record<Plan, {
  maxLayouts: number;
  maxTotalItems: number;
  canExport: boolean;
}> = {
  FREE: {
    maxLayouts: 1,
    maxTotalItems: 50,
    canExport: false,
  },
  PRO: {
    maxLayouts: 5,
    maxTotalItems: Infinity,
    canExport: true,
  },
};

export function getPlanLimits(plan: Plan) {
  return PLAN_LIMITS[plan];
}

/**
 * Total item limit across countable categories for a user.
 * Free: 50 total. Pro: unlimited.
 */
export async function checkTotalItemLimit(
  userId: string
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });

  const plan = user?.plan ?? "FREE";
  const limit = getPlanLimits(plan).maxTotalItems;

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
  const limit = getPlanLimits(plan).maxLayouts;

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

/**
 * Seat-based crew limit.
 * Counts distinct userIds across ALL of the layout owner's layouts that are
 * either pending (acceptedAt null, removedAt null) or active (acceptedAt set,
 * removedAt null). Free users have 0 seats. Pro users have 1 + purchasedSeats,
 * capped at MAX_TOTAL_CREW (10).
 *
 * Signature preserved: takes layoutId; resolves to owner internally.
 */
export async function checkCrewLimit(
  layoutId: string
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const layout = await db.layout.findUnique({
    where: { id: layoutId },
    select: { userId: true, user: { select: { plan: true, purchasedSeats: true } } },
  });

  if (!layout) return { allowed: false, current: 0, limit: 0 };

  if (layout.user.plan !== "PRO") {
    return { allowed: false, current: 0, limit: 0 };
  }

  const limit = Math.min(
    BASE_SEATS_PRO + layout.user.purchasedSeats,
    MAX_TOTAL_CREW
  );

  const used = await db.crewMember.findMany({
    where: {
      layout: { userId: layout.userId },
      removedAt: null,
    },
    distinct: ["userId"],
    select: { userId: true },
  });

  return { allowed: used.length < limit, current: used.length, limit };
}
