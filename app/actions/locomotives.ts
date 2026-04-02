"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { LocomotiveType, LocomotiveService, RollingStockStatus } from "@prisma/client";
import { checkTotalItemLimit } from "@/lib/limits";
import { trackActivity } from "@/lib/activity";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

const locomotiveSchema = z.object({
  road: z.string().min(1, "Railroad is required"),
  number: z.string().min(1, "Number is required"),
  model: z.string().min(1, "Model is required"),
  locomotiveType: z.nativeEnum(LocomotiveType),
  serviceType: z.nativeEnum(LocomotiveService).optional(),
  horsepower: z.coerce.number().int().optional().nullable(),
  status: z.nativeEnum(RollingStockStatus).optional(),
  dccAddress: z.coerce.number().int().optional().nullable(),
  decoderManufacturer: z.string().optional().nullable(),
  decoderModel: z.string().optional().nullable(),
  hasSound: z.boolean().optional(),
  length: z.coerce.number().optional().nullable(),
  fuelType: z.string().optional().nullable(),
  canPull: z.coerce.number().int().optional().nullable(),
  currentLocationId: z.string().optional().nullable(),
  silhouetteId: z.string().optional().nullable(),
});

export type LocomotiveFormValues = z.infer<typeof locomotiveSchema>;

export async function createLocomotive(layoutId: string, values: LocomotiveFormValues) {
  const session = await requireAuth();

  const parsed = locomotiveSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const layout = await db.layout.findFirst({
    where: { id: layoutId, userId: session.user.id },
  });
  if (!layout) return { error: "Layout not found" };

  const limit = await checkTotalItemLimit(session.user.id);
  if (!limit.allowed) {
    return { error: `Free plan limit reached (${limit.current}/${limit.limit} total items). Upgrade to Pro to add more.` };
  }

  // Check unique road+number per user
  const existing = await db.locomotive.findUnique({
    where: { road_number_userId: { road: parsed.data.road, number: parsed.data.number, userId: session.user.id } },
  });
  if (existing) return { error: `${parsed.data.road} #${parsed.data.number} already exists` };

  const locomotive = await db.locomotive.create({
    data: {
      ...parsed.data,
      serviceType: parsed.data.serviceType ?? "ROAD_FREIGHT",
      status: parsed.data.status ?? "SERVICEABLE",
      hasSound: parsed.data.hasSound ?? false,
      layoutId,
      userId: session.user.id,
    },
  });

  trackActivity(session.user.id, "locomotive.create", { locomotiveId: locomotive.id });

  revalidatePath(`/dashboard/railroad/${layoutId}`);
  return { success: true, locomotive };
}

export async function updateLocomotive(locomotiveId: string, values: LocomotiveFormValues) {
  const session = await requireAuth();

  const parsed = locomotiveSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await db.locomotive.findFirst({
    where: { id: locomotiveId, userId: session.user.id },
  });
  if (!existing) return { error: "Locomotive not found" };

  // Check unique (excluding self)
  const duplicate = await db.locomotive.findFirst({
    where: {
      road: parsed.data.road,
      number: parsed.data.number,
      userId: session.user.id,
      id: { not: locomotiveId },
    },
  });
  if (duplicate) return { error: `${parsed.data.road} #${parsed.data.number} already exists` };

  const locomotive = await db.locomotive.update({
    where: { id: locomotiveId },
    data: {
      ...parsed.data,
      serviceType: parsed.data.serviceType ?? "ROAD_FREIGHT",
      status: parsed.data.status ?? "SERVICEABLE",
      hasSound: parsed.data.hasSound ?? false,
    },
  });

  revalidatePath(`/dashboard/railroad/${existing.layoutId}`);
  return { success: true, locomotive };
}

export async function deleteLocomotive(locomotiveId: string) {
  const session = await requireAuth();

  const locomotive = await db.locomotive.findFirst({
    where: { id: locomotiveId, userId: session.user.id },
  });
  if (!locomotive) return { error: "Locomotive not found" };

  await db.locomotive.delete({ where: { id: locomotiveId } });

  revalidatePath(`/dashboard/railroad/${locomotive.layoutId}`);
  return { success: true };
}
