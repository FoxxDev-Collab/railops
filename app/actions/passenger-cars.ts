"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { RollingStockStatus, PassengerCarType, ClassOfService } from "@prisma/client";
import { checkCategoryLimit } from "@/lib/limits";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

const passengerCarSchema = z.object({
  reportingMarks: z.string().min(1, "Reporting marks required"),
  number: z.string().min(1, "Car number required"),
  carName: z.string().optional().nullable(),
  carType: z.nativeEnum(PassengerCarType),
  seats: z.coerce.number().optional().nullable(),
  berths: z.coerce.number().optional().nullable(),
  classOfService: z.nativeEnum(ClassOfService).optional(),
  length: z.coerce.number().optional().nullable(),
  status: z.nativeEnum(RollingStockStatus).optional(),
  silhouetteId: z.string().optional().nullable(),
});

export type PassengerCarFormValues = z.infer<typeof passengerCarSchema>;

export async function createPassengerCar(layoutId: string, values: PassengerCarFormValues) {
  const session = await requireAuth();

  const parsed = passengerCarSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const layout = await db.layout.findFirst({
    where: { id: layoutId, userId: session.user.id },
  });
  if (!layout) return { error: "Layout not found" };

  const limit = await checkCategoryLimit(session.user.id, layoutId, "passengerCars");
  if (!limit.allowed) {
    return { error: `Free plan limit reached (${limit.limit} passenger cars). Upgrade to add more.` };
  }

  const existing = await db.passengerCar.findUnique({
    where: {
      reportingMarks_number_userId: {
        reportingMarks: parsed.data.reportingMarks,
        number: parsed.data.number,
        userId: session.user.id,
      },
    },
  });
  if (existing) return { error: `${parsed.data.reportingMarks} ${parsed.data.number} already exists` };

  const car = await db.passengerCar.create({
    data: {
      ...parsed.data,
      status: parsed.data.status ?? "SERVICEABLE",
      classOfService: parsed.data.classOfService ?? "COACH",
      layoutId,
      userId: session.user.id,
    },
  });

  revalidatePath(`/dashboard/railroad/${layoutId}`);
  return { success: true, car };
}

export async function updatePassengerCar(carId: string, values: PassengerCarFormValues) {
  const session = await requireAuth();

  const parsed = passengerCarSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await db.passengerCar.findFirst({
    where: { id: carId, userId: session.user.id },
  });
  if (!existing) return { error: "Passenger car not found" };

  const duplicate = await db.passengerCar.findFirst({
    where: {
      reportingMarks: parsed.data.reportingMarks,
      number: parsed.data.number,
      userId: session.user.id,
      id: { not: carId },
    },
  });
  if (duplicate) return { error: `${parsed.data.reportingMarks} ${parsed.data.number} already exists` };

  const car = await db.passengerCar.update({
    where: { id: carId },
    data: {
      ...parsed.data,
      status: parsed.data.status ?? "SERVICEABLE",
      classOfService: parsed.data.classOfService ?? "COACH",
    },
  });

  revalidatePath(`/dashboard/railroad/${existing.layoutId}`);
  return { success: true, car };
}

export async function deletePassengerCar(carId: string) {
  const session = await requireAuth();

  const car = await db.passengerCar.findFirst({
    where: { id: carId, userId: session.user.id },
  });
  if (!car) return { error: "Passenger car not found" };

  await db.passengerCar.delete({ where: { id: carId } });

  revalidatePath(`/dashboard/railroad/${car.layoutId}`);
  return { success: true };
}
