"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { LoadStatus } from "@prisma/client";
import { checkCategoryLimit } from "@/lib/limits";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

const panelSchema = z.object({
  panelNumber: z.number().min(1).max(4),
  loadStatus: z.nativeEnum(LoadStatus),
  commodity: z.string().optional().nullable(),
  weight: z.coerce.number().optional().nullable(),
  specialInstructions: z.string().optional().nullable(),
  routeVia: z.string().optional().nullable(),
  originId: z.string().optional().nullable(),
  shipperIndustryId: z.string().optional().nullable(),
  destinationId: z.string().optional().nullable(),
  consigneeIndustryId: z.string().optional().nullable(),
});

const waybillSchema = z.object({
  isReturnable: z.boolean().optional(),
  notes: z.string().optional().nullable(),
  freightCarId: z.string().optional().nullable(),
  panels: z.array(panelSchema).min(1, "At least one panel is required").max(4),
});

export type WaybillFormValues = z.infer<typeof waybillSchema>;

export async function createWaybill(layoutId: string, values: WaybillFormValues) {
  const session = await requireAuth();
  const userId = session.user.id;

  const parsed = waybillSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const layout = await db.layout.findFirst({
    where: { id: layoutId, userId },
  });
  if (!layout) return { error: "Layout not found" };

  const limit = await checkCategoryLimit(userId, layoutId, "waybills");
  if (!limit.allowed) {
    return { error: `Free plan limit reached (${limit.limit} waybills). Upgrade to add more.` };
  }

  const waybill = await db.waybill.create({
    data: {
      userId,
      status: "PENDING",
      isReturnable: parsed.data.isReturnable ?? true,
      notes: parsed.data.notes,
      panels: {
        create: parsed.data.panels,
      },
    },
    include: { panels: true },
  });

  if (parsed.data.freightCarId) {
    const car = await db.freightCar.findFirst({
      where: { id: parsed.data.freightCarId, userId },
    });
    if (!car) return { error: "Freight car not found" };

    await db.carCard.upsert({
      where: { freightCarId: parsed.data.freightCarId },
      create: {
        freightCarId: parsed.data.freightCarId,
        waybillId: waybill.id,
        userId,
        currentLocationId: car.currentLocationId,
      },
      update: {
        waybillId: waybill.id,
      },
    });
  }

  revalidatePath(`/dashboard/railroad/${layoutId}`);
  return { success: true, waybill };
}

export async function updateWaybill(waybillId: string, layoutId: string, values: WaybillFormValues) {
  const session = await requireAuth();
  const userId = session.user.id;

  const parsed = waybillSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await db.waybill.findFirst({
    where: { id: waybillId, userId },
    include: { carCard: true },
  });
  if (!existing) return { error: "Waybill not found" };

  // Replace panels atomically: delete then recreate
  await db.waybillPanel.deleteMany({ where: { waybillId } });

  const waybill = await db.waybill.update({
    where: { id: waybillId },
    data: {
      isReturnable: parsed.data.isReturnable ?? true,
      notes: parsed.data.notes,
      panels: {
        create: parsed.data.panels,
      },
    },
    include: { panels: true },
  });

  // Handle CarCard linkage changes
  const oldCarId = existing.carCard?.freightCarId ?? null;
  const newCarId = parsed.data.freightCarId ?? null;

  if (oldCarId && oldCarId !== newCarId) {
    // Disconnect the previously linked CarCard
    await db.carCard.update({
      where: { freightCarId: oldCarId },
      data: { waybillId: null },
    });
  }

  if (newCarId) {
    const car = await db.freightCar.findFirst({
      where: { id: newCarId, userId },
    });
    if (!car) return { error: "Freight car not found" };

    await db.carCard.upsert({
      where: { freightCarId: newCarId },
      create: {
        freightCarId: newCarId,
        waybillId: waybill.id,
        userId,
        currentLocationId: car.currentLocationId,
      },
      update: {
        waybillId: waybill.id,
      },
    });
  }

  revalidatePath(`/dashboard/railroad/${layoutId}`);
  return { success: true, waybill };
}

export async function deleteWaybill(waybillId: string, layoutId: string) {
  const session = await requireAuth();
  const userId = session.user.id;

  const waybill = await db.waybill.findFirst({
    where: { id: waybillId, userId },
  });
  if (!waybill) return { error: "Waybill not found" };

  // Disconnect CarCard before deleting so the car is not orphaned
  await db.carCard.updateMany({
    where: { waybillId },
    data: { waybillId: null },
  });

  // Panels cascade via onDelete: Cascade defined in schema
  await db.waybill.delete({ where: { id: waybillId } });

  revalidatePath(`/dashboard/railroad/${layoutId}`);
  return { success: true };
}
