"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

export async function getOrCreateConsist(trainId: string) {
  const session = await requireAuth();
  const userId = session.user.id;

  const train = await db.train.findFirst({
    where: { id: trainId, userId },
  });
  if (!train) return { error: "Train not found" };

  const existing = await db.trainConsist.findFirst({
    where: { trainId, sessionId: null },
    include: {
      positions: {
        orderBy: { position: "asc" },
        include: {
          locomotive: true,
          freightCar: true,
          passengerCar: true,
          mowEquipment: true,
          caboose: true,
        },
      },
    },
  });

  if (existing) return { success: true, consist: existing };

  const consist = await db.trainConsist.create({
    data: { trainId },
    include: { positions: true },
  });

  return { success: true, consist };
}

export async function addPosition(
  consistId: string,
  data: { type: string; rollingStockId: string; facing?: string }
) {
  const session = await requireAuth();
  const userId = session.user.id;

  const consist = await db.trainConsist.findFirst({
    where: { id: consistId },
    include: { train: true },
  });
  if (!consist || consist.train.userId !== userId) {
    return { error: "Consist not found" };
  }

  const aggregate = await db.consistPosition.aggregate({
    where: { consistId },
    _max: { position: true },
  });
  const nextPosition = (aggregate._max.position ?? 0) + 1;

  let fkData: Record<string, string> = {};
  switch (data.type) {
    case "LOCOMOTIVE":
      fkData = { locomotiveId: data.rollingStockId };
      break;
    case "FREIGHT_CAR":
      fkData = { freightCarId: data.rollingStockId };
      break;
    case "PASSENGER_CAR":
      fkData = { passengerCarId: data.rollingStockId };
      break;
    case "CABOOSE":
      fkData = { cabooseId: data.rollingStockId };
      break;
    case "MOW_EQUIPMENT":
      fkData = { mowEquipmentId: data.rollingStockId };
      break;
    default:
      return { error: "Invalid rolling stock type" };
  }

  await db.consistPosition.create({
    data: {
      consistId,
      position: nextPosition,
      facing: data.facing ?? "F",
      ...fkData,
    },
  });

  revalidatePath(
    `/dashboard/railroad/${consist.train.layoutId}/trains/${consist.trainId}`
  );
  return { success: true };
}

export async function removePosition(positionId: string) {
  const session = await requireAuth();
  const userId = session.user.id;

  const position = await db.consistPosition.findFirst({
    where: { id: positionId },
    include: {
      consist: {
        include: { train: true },
      },
    },
  });
  if (!position || position.consist.train.userId !== userId) {
    return { error: "Position not found" };
  }

  const { consistId } = position;
  const layoutId = position.consist.train.layoutId;
  const trainId = position.consist.train.id;

  await db.consistPosition.delete({ where: { id: positionId } });

  // Reorder remaining positions sequentially
  const remaining = await db.consistPosition.findMany({
    where: { consistId },
    orderBy: { position: "asc" },
  });

  await Promise.all(
    remaining.map((pos, idx) =>
      db.consistPosition.update({
        where: { id: pos.id },
        data: { position: idx + 1 },
      })
    )
  );

  revalidatePath(`/dashboard/railroad/${layoutId}/trains/${trainId}`);
  return { success: true };
}

export async function deleteConsist(consistId: string) {
  const session = await requireAuth();
  const userId = session.user.id;

  const consist = await db.trainConsist.findFirst({
    where: { id: consistId },
    include: { train: true },
  });
  if (!consist || consist.train.userId !== userId) {
    return { error: "Consist not found" };
  }

  const layoutId = consist.train.layoutId;
  const trainId = consist.train.id;

  await db.trainConsist.delete({ where: { id: consistId } });

  revalidatePath(`/dashboard/railroad/${layoutId}/trains/${trainId}`);
  return { success: true };
}
