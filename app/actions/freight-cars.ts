"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { RollingStockStatus } from "@prisma/client";
import { checkTotalItemLimit } from "@/lib/limits";
import { trackActivity } from "@/lib/activity";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

const freightCarSchema = z.object({
  reportingMarks: z.string().min(1, "Reporting marks required"),
  number: z.string().min(1, "Car number required"),
  carType: z.string().min(1, "Car type required"),
  aarTypeCode: z.string().optional().nullable(),
  subtype: z.string().optional().nullable(),
  length: z.coerce.number().optional().nullable(),
  capacity: z.coerce.number().int().optional().nullable(),
  homeRoad: z.string().optional().nullable(),
  status: z.nativeEnum(RollingStockStatus).optional(),
  commodities: z.array(z.string()).optional(),
  currentLocationId: z.string().optional().nullable(),
  silhouetteId: z.string().optional().nullable(),
});

export type FreightCarFormValues = z.infer<typeof freightCarSchema>;

export async function createFreightCar(layoutId: string, values: FreightCarFormValues) {
  const session = await requireAuth();

  const parsed = freightCarSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const layout = await db.layout.findFirst({
    where: { id: layoutId, userId: session.user.id },
  });
  if (!layout) return { error: "Layout not found" };

  const limit = await checkTotalItemLimit(session.user.id);
  if (!limit.allowed) {
    return { error: `Free plan limit reached (${limit.current}/${limit.limit} total items). Upgrade to Pro to add more.` };
  }

  const existing = await db.freightCar.findUnique({
    where: {
      reportingMarks_number_userId: {
        reportingMarks: parsed.data.reportingMarks,
        number: parsed.data.number,
        userId: session.user.id,
      },
    },
  });
  if (existing) return { error: `${parsed.data.reportingMarks} ${parsed.data.number} already exists` };

  const car = await db.freightCar.create({
    data: {
      ...parsed.data,
      status: parsed.data.status ?? "SERVICEABLE",
      commodities: parsed.data.commodities ?? [],
      layoutId,
      userId: session.user.id,
    },
  });

  trackActivity(session.user.id, "freight_car.create", { freightCarId: car.id });

  revalidatePath(`/dashboard/railroad/${layoutId}`);
  return { success: true, car };
}

export async function updateFreightCar(carId: string, values: FreightCarFormValues) {
  const session = await requireAuth();

  const parsed = freightCarSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await db.freightCar.findFirst({
    where: { id: carId, userId: session.user.id },
  });
  if (!existing) return { error: "Freight car not found" };

  const duplicate = await db.freightCar.findFirst({
    where: {
      reportingMarks: parsed.data.reportingMarks,
      number: parsed.data.number,
      userId: session.user.id,
      id: { not: carId },
    },
  });
  if (duplicate) return { error: `${parsed.data.reportingMarks} ${parsed.data.number} already exists` };

  const car = await db.freightCar.update({
    where: { id: carId },
    data: {
      ...parsed.data,
      status: parsed.data.status ?? "SERVICEABLE",
      commodities: parsed.data.commodities ?? [],
    },
  });

  revalidatePath(`/dashboard/railroad/${existing.layoutId}`);
  return { success: true, car };
}

export async function deleteFreightCar(carId: string) {
  const session = await requireAuth();

  const car = await db.freightCar.findFirst({
    where: { id: carId, userId: session.user.id },
  });
  if (!car) return { error: "Freight car not found" };

  await db.freightCar.delete({ where: { id: carId } });

  revalidatePath(`/dashboard/railroad/${car.layoutId}`);
  return { success: true };
}
