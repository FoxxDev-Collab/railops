"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CabooseType, RollingStockStatus } from "@prisma/client";
import { checkCategoryLimit } from "@/lib/limits";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

const cabooseSchema = z.object({
  reportingMarks: z.string().min(1, "Reporting marks required"),
  number: z.string().min(1, "Car number required"),
  cabooseType: z.nativeEnum(CabooseType),
  road: z.string().optional().nullable(),
  length: z.coerce.number().optional().nullable(),
  status: z.nativeEnum(RollingStockStatus).optional(),
});

export type CabooseFormValues = z.infer<typeof cabooseSchema>;

export async function createCaboose(layoutId: string, values: CabooseFormValues) {
  const session = await requireAuth();

  const parsed = cabooseSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const layout = await db.layout.findFirst({
    where: { id: layoutId, userId: session.user.id },
  });
  if (!layout) return { error: "Layout not found" };

  const limit = await checkCategoryLimit(session.user.id, layoutId, "cabooses");
  if (!limit.allowed) {
    return { error: `Free plan limit reached (${limit.limit} cabooses). Upgrade to add more.` };
  }

  const existing = await db.caboose.findUnique({
    where: {
      reportingMarks_number_userId: {
        reportingMarks: parsed.data.reportingMarks,
        number: parsed.data.number,
        userId: session.user.id,
      },
    },
  });
  if (existing) return { error: `${parsed.data.reportingMarks} ${parsed.data.number} already exists` };

  const caboose = await db.caboose.create({
    data: {
      ...parsed.data,
      status: parsed.data.status ?? "SERVICEABLE",
      layoutId,
      userId: session.user.id,
    },
  });

  revalidatePath(`/dashboard/railroad/${layoutId}`);
  return { success: true, caboose };
}

export async function updateCaboose(cabooseId: string, values: CabooseFormValues) {
  const session = await requireAuth();

  const parsed = cabooseSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await db.caboose.findFirst({
    where: { id: cabooseId, userId: session.user.id },
  });
  if (!existing) return { error: "Caboose not found" };

  const duplicate = await db.caboose.findFirst({
    where: {
      reportingMarks: parsed.data.reportingMarks,
      number: parsed.data.number,
      userId: session.user.id,
      id: { not: cabooseId },
    },
  });
  if (duplicate) return { error: `${parsed.data.reportingMarks} ${parsed.data.number} already exists` };

  const caboose = await db.caboose.update({
    where: { id: cabooseId },
    data: {
      ...parsed.data,
      status: parsed.data.status ?? "SERVICEABLE",
    },
  });

  revalidatePath(`/dashboard/railroad/${existing.layoutId}`);
  return { success: true, caboose };
}

export async function deleteCaboose(cabooseId: string) {
  const session = await requireAuth();

  const caboose = await db.caboose.findFirst({
    where: { id: cabooseId, userId: session.user.id },
  });
  if (!caboose) return { error: "Caboose not found" };

  await db.caboose.delete({ where: { id: cabooseId } });

  revalidatePath(`/dashboard/railroad/${caboose.layoutId}`);
  return { success: true };
}
