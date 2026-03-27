"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

export async function generateSwitchList(consistId: string, layoutId: string) {
  const session = await requireAuth();
  const userId = session.user.id;

  // Verify ownership: consist → train → userId
  const consist = await db.trainConsist.findFirst({
    where: { id: consistId },
    include: {
      train: {
        include: {
          stops: {
            orderBy: { stopOrder: "asc" },
            include: { location: true },
          },
        },
      },
      positions: {
        orderBy: { position: "asc" },
        include: {
          freightCar: true,
          locomotive: true,
          passengerCar: true,
          mowEquipment: true,
          caboose: true,
        },
      },
    },
  });

  if (!consist) return { error: "Consist not found" };
  if (consist.train.userId !== userId) return { error: "Unauthorized" };
  if (consist.train.layoutId !== layoutId) return { error: "Layout mismatch" };

  // Collect freight car IDs from positions
  const freightCarIds = consist.positions
    .filter((p) => p.freightCarId != null)
    .map((p) => p.freightCarId as string);

  // Fetch car cards for all freight cars in the consist
  const carCards = await db.carCard.findMany({
    where: { freightCarId: { in: freightCarIds } },
    include: {
      freightCar: true,
      waybill: {
        include: {
          panels: {
            include: {
              origin: true,
              destination: true,
              consigneeIndustry: true,
            },
          },
        },
      },
    },
  });

  const carCardByFreightCarId = new Map(carCards.map((cc) => [cc.freightCarId, cc]));

  const entries: {
    action: string;
    carDescription: string;
    commodity: string | null;
    destinationDesc: string | null;
    trackAssignment: string | null;
    sortOrder: number;
    trainStopId: string | null;
    carCardId: string | null;
  }[] = [];

  let sortOrder = 0;
  const stops = consist.train.stops;

  if (stops.length > 0) {
    // Per-stop logic: match active panel origin/destination to stop location
    for (const stop of stops) {
      for (const position of consist.positions) {
        if (!position.freightCarId) continue;

        const carCard = carCardByFreightCarId.get(position.freightCarId);
        if (!carCard?.waybill) continue;

        const waybill = carCard.waybill;
        const activePanel = waybill.panels.find(
          (p) => p.panelNumber === waybill.currentPanel
        );
        if (!activePanel) continue;

        const car = position.freightCar!;
        const carDescription = `${car.reportingMarks} ${car.number} (${car.carType})`;

        if (activePanel.destinationId === stop.locationId) {
          entries.push({
            action: "SETOUT",
            carDescription,
            commodity: activePanel.commodity ?? null,
            destinationDesc: stop.location.name,
            trackAssignment: activePanel.consigneeIndustry?.name ?? null,
            sortOrder: sortOrder++,
            trainStopId: stop.id,
            carCardId: carCard.id,
          });
        } else if (activePanel.originId === stop.locationId) {
          entries.push({
            action: "PICKUP",
            carDescription,
            commodity: activePanel.commodity ?? null,
            destinationDesc: activePanel.destination?.name ?? null,
            trackAssignment: activePanel.consigneeIndustry?.name ?? null,
            sortOrder: sortOrder++,
            trainStopId: stop.id,
            carCardId: carCard.id,
          });
        }
      }
    }
  } else {
    // No stops: simple SETOUT for each freight car with a waybill
    for (const position of consist.positions) {
      if (!position.freightCarId) continue;

      const carCard = carCardByFreightCarId.get(position.freightCarId);
      if (!carCard?.waybill) continue;

      const waybill = carCard.waybill;
      const activePanel = waybill.panels.find(
        (p) => p.panelNumber === waybill.currentPanel
      );
      if (!activePanel) continue;

      const car = position.freightCar!;
      const carDescription = `${car.reportingMarks} ${car.number} (${car.carType})`;

      entries.push({
        action: "SETOUT",
        carDescription,
        commodity: activePanel.commodity ?? null,
        destinationDesc: activePanel.destination?.name ?? null,
        trackAssignment: activePanel.consigneeIndustry?.name ?? null,
        sortOrder: sortOrder++,
        trainStopId: null,
        carCardId: carCard.id,
      });
    }
  }

  // Delete any existing switch list for this consist and recreate
  await db.switchList.deleteMany({ where: { consistId } });

  const switchList = await db.switchList.create({
    data: {
      consistId,
      entries: {
        create: entries,
      },
    },
    include: {
      entries: { orderBy: { sortOrder: "asc" } },
    },
  });

  revalidatePath(
    `/dashboard/railroad/${layoutId}/trains/${consist.trainId}/switch-list`
  );

  return { success: true, switchList };
}

export async function getSwitchList(consistId: string) {
  const session = await requireAuth();
  void session; // auth check only

  const switchList = await db.switchList.findFirst({
    where: { consistId },
    include: {
      entries: { orderBy: { sortOrder: "asc" } },
    },
  });

  return switchList ?? null;
}
