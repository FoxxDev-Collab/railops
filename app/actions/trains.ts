"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TrainClass, TrainServiceType } from "@prisma/client";
import { checkTotalItemLimit } from "@/lib/limits";
import { trackActivity } from "@/lib/activity";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

const trainSchema = z.object({
  trainNumber: z.string().min(1, "Train number is required"),
  trainName: z.string().optional().nullable(),
  trainClass: z.nativeEnum(TrainClass),
  serviceType: z.nativeEnum(TrainServiceType),
  departureTime: z.string().optional().nullable(),
  symbol: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  originId: z.string().optional().nullable(),
  destinationId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export type TrainFormValues = z.infer<typeof trainSchema>;

export async function createTrain(layoutId: string, values: TrainFormValues) {
  const session = await requireAuth();

  const parsed = trainSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const layout = await db.layout.findFirst({
    where: { id: layoutId, userId: session.user.id },
  });
  if (!layout) return { error: "Layout not found" };

  const limit = await checkTotalItemLimit(session.user.id);
  if (!limit.allowed) {
    return { error: `Free plan limit reached (${limit.current}/${limit.limit} total items). Upgrade to Pro to add more.` };
  }

  const existing = await db.train.findUnique({
    where: { trainNumber_layoutId: { trainNumber: parsed.data.trainNumber, layoutId } },
  });
  if (existing) return { error: `Train ${parsed.data.trainNumber} already exists` };

  const train = await db.train.create({
    data: {
      ...parsed.data,
      isActive: parsed.data.isActive ?? true,
      layoutId,
      userId: session.user.id,
    },
  });

  trackActivity(session.user.id, "train.create", { trainId: train.id });

  revalidatePath(`/dashboard/railroad/${layoutId}`);
  return { success: true, train };
}

export async function updateTrain(trainId: string, values: TrainFormValues) {
  const session = await requireAuth();

  const parsed = trainSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await db.train.findFirst({
    where: { id: trainId, userId: session.user.id },
  });
  if (!existing) return { error: "Train not found" };

  const duplicate = await db.train.findFirst({
    where: {
      trainNumber: parsed.data.trainNumber,
      layoutId: existing.layoutId,
      id: { not: trainId },
    },
  });
  if (duplicate) return { error: `Train ${parsed.data.trainNumber} already exists` };

  const train = await db.train.update({
    where: { id: trainId },
    data: {
      ...parsed.data,
      isActive: parsed.data.isActive ?? true,
    },
  });

  revalidatePath(`/dashboard/railroad/${existing.layoutId}`);
  return { success: true, train };
}

export async function deleteTrain(trainId: string) {
  const session = await requireAuth();

  const train = await db.train.findFirst({
    where: { id: trainId, userId: session.user.id },
  });
  if (!train) return { error: "Train not found" };

  await db.train.delete({ where: { id: trainId } });

  revalidatePath(`/dashboard/railroad/${train.layoutId}`);
  return { success: true };
}
