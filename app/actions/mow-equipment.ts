"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MOWEquipmentType, RollingStockStatus } from "@prisma/client";
import { checkCategoryLimit } from "@/lib/limits";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

const mowEquipmentSchema = z.object({
  reportingMarks: z.string().min(1, "Reporting marks required"),
  number: z.string().min(1, "Equipment number required"),
  equipmentType: z.nativeEnum(MOWEquipmentType),
  description: z.string().optional().nullable(),
  length: z.coerce.number().optional().nullable(),
  status: z.nativeEnum(RollingStockStatus).optional(),
  silhouetteId: z.string().optional().nullable(),
});

export type MOWEquipmentFormValues = z.infer<typeof mowEquipmentSchema>;

export async function createMOWEquipment(layoutId: string, values: MOWEquipmentFormValues) {
  const session = await requireAuth();

  const parsed = mowEquipmentSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const layout = await db.layout.findFirst({
    where: { id: layoutId, userId: session.user.id },
  });
  if (!layout) return { error: "Layout not found" };

  const limit = await checkCategoryLimit(session.user.id, layoutId, "mowEquipment");
  if (!limit.allowed) {
    return { error: `Free plan limit reached (${limit.limit} MOW equipment). Upgrade to add more.` };
  }

  const existing = await db.mOWEquipment.findUnique({
    where: {
      reportingMarks_number_userId: {
        reportingMarks: parsed.data.reportingMarks,
        number: parsed.data.number,
        userId: session.user.id,
      },
    },
  });
  if (existing) return { error: `${parsed.data.reportingMarks} ${parsed.data.number} already exists` };

  const equipment = await db.mOWEquipment.create({
    data: {
      ...parsed.data,
      status: parsed.data.status ?? "SERVICEABLE",
      layoutId,
      userId: session.user.id,
    },
  });

  revalidatePath(`/dashboard/railroad/${layoutId}`);
  return { success: true, equipment };
}

export async function updateMOWEquipment(equipmentId: string, values: MOWEquipmentFormValues) {
  const session = await requireAuth();

  const parsed = mowEquipmentSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await db.mOWEquipment.findFirst({
    where: { id: equipmentId, userId: session.user.id },
  });
  if (!existing) return { error: "MOW equipment not found" };

  const duplicate = await db.mOWEquipment.findFirst({
    where: {
      reportingMarks: parsed.data.reportingMarks,
      number: parsed.data.number,
      userId: session.user.id,
      id: { not: equipmentId },
    },
  });
  if (duplicate) return { error: `${parsed.data.reportingMarks} ${parsed.data.number} already exists` };

  const equipment = await db.mOWEquipment.update({
    where: { id: equipmentId },
    data: {
      ...parsed.data,
      status: parsed.data.status ?? "SERVICEABLE",
    },
  });

  revalidatePath(`/dashboard/railroad/${existing.layoutId}`);
  return { success: true, equipment };
}

export async function deleteMOWEquipment(equipmentId: string) {
  const session = await requireAuth();

  const equipment = await db.mOWEquipment.findFirst({
    where: { id: equipmentId, userId: session.user.id },
  });
  if (!equipment) return { error: "MOW equipment not found" };

  await db.mOWEquipment.delete({ where: { id: equipmentId } });

  revalidatePath(`/dashboard/railroad/${equipment.layoutId}`);
  return { success: true };
}
