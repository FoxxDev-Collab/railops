import { db } from "@/lib/db";
import { Plan } from "@prisma/client";

const PLAN_LIMITS: Record<Plan, {
  maxRailroads: number;
  maxPerCategory: number;
  canExport: boolean;
  maxCrew: number;
}> = {
  FREE: {
    maxRailroads: 1,
    maxPerCategory: 25,
    canExport: false,
    maxCrew: 0,
  },
  OPERATOR: {
    maxRailroads: Infinity,
    maxPerCategory: Infinity,
    canExport: true,
    maxCrew: Infinity, // Paid per seat via Stripe
  },
};

export function getPlanLimits(plan: Plan) {
  return PLAN_LIMITS[plan];
}

type CountableCategory =
  | "locations"
  | "locomotives"
  | "freightCars"
  | "passengerCars"
  | "mowEquipment"
  | "cabooses"
  | "trains"
  | "waybills";

export async function checkCategoryLimit(
  userId: string,
  layoutId: string,
  category: CountableCategory
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });

  const plan = user?.plan ?? "FREE";
  const limits = getPlanLimits(plan);
  const limit = limits.maxPerCategory;

  if (limit === Infinity) {
    return { allowed: true, current: 0, limit };
  }

  const countMap: Record<CountableCategory, () => Promise<number>> = {
    locations: () => db.location.count({ where: { userId, layoutId } }),
    locomotives: () => db.locomotive.count({ where: { userId, layoutId } }),
    freightCars: () => db.freightCar.count({ where: { userId, layoutId } }),
    passengerCars: () => db.passengerCar.count({ where: { userId, layoutId } }),
    mowEquipment: () => db.mOWEquipment.count({ where: { userId, layoutId } }),
    cabooses: () => db.caboose.count({ where: { userId, layoutId } }),
    trains: () => db.train.count({ where: { userId, layoutId } }),
    waybills: () => db.waybill.count({ where: { userId } }),
  };

  const current = await countMap[category]();
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
  const limit = limits.maxRailroads;

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
