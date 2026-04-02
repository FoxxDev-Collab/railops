"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { SessionStatus } from "@prisma/client";
import { trackActivity } from "@/lib/activity";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

const sessionSchema = z.object({
  name: z.string().min(1, "Session name is required"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional().nullable(),
  trainIds: z.array(z.string()).optional(),
});

export type SessionFormValues = z.infer<typeof sessionSchema>;

export async function createSession(layoutId: string, values: SessionFormValues) {
  const session = await requireAuth();

  const parsed = sessionSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const layout = await db.layout.findFirst({
    where: { id: layoutId, userId: session.user.id },
  });
  if (!layout) return { error: "Layout not found" };

  const operatingSession = await db.operatingSession.create({
    data: {
      name: parsed.data.name,
      date: new Date(parsed.data.date),
      notes: parsed.data.notes,
      status: "PLANNED",
      layoutId,
      userId: session.user.id,
    },
  });

  if (parsed.data.trainIds && parsed.data.trainIds.length > 0) {
    await db.sessionTrain.createMany({
      data: parsed.data.trainIds.map((trainId) => ({
        sessionId: operatingSession.id,
        trainId,
      })),
    });
  }

  trackActivity(session.user.id, "session.start", { sessionId: operatingSession.id });

  revalidatePath(`/dashboard/railroad/${layoutId}`);
  return { success: true, session: operatingSession };
}

export async function updateSession(
  sessionId: string,
  layoutId: string,
  values: SessionFormValues
) {
  const session = await requireAuth();

  const parsed = sessionSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await db.operatingSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
  });
  if (!existing) return { error: "Operating session not found" };

  await db.sessionTrain.deleteMany({ where: { sessionId } });

  const operatingSession = await db.operatingSession.update({
    where: { id: sessionId },
    data: {
      name: parsed.data.name,
      date: new Date(parsed.data.date),
      notes: parsed.data.notes,
    },
  });

  if (parsed.data.trainIds && parsed.data.trainIds.length > 0) {
    await db.sessionTrain.createMany({
      data: parsed.data.trainIds.map((trainId) => ({
        sessionId,
        trainId,
      })),
    });
  }

  revalidatePath(`/dashboard/railroad/${layoutId}`);
  return { success: true, session: operatingSession };
}

export async function deleteSession(sessionId: string, layoutId: string) {
  const session = await requireAuth();

  const existing = await db.operatingSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
  });
  if (!existing) return { error: "Operating session not found" };

  await db.operatingSession.delete({ where: { id: sessionId } });

  revalidatePath(`/dashboard/railroad/${layoutId}`);
  return { success: true };
}

export async function updateSessionStatus(
  sessionId: string,
  layoutId: string,
  status: SessionStatus
) {
  const session = await requireAuth();

  const existing = await db.operatingSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
  });
  if (!existing) return { error: "Operating session not found" };

  const data: Parameters<typeof db.operatingSession.update>[0]["data"] = { status };

  if (status === "IN_PROGRESS") {
    data.startedAt = new Date();
  } else if (status === "COMPLETED") {
    data.completedAt = new Date();
  }

  const operatingSession = await db.operatingSession.update({
    where: { id: sessionId },
    data,
  });

  if (status === "IN_PROGRESS") {
    trackActivity(session.user.id, "session.start", { sessionId: operatingSession.id });
  } else if (status === "COMPLETED") {
    trackActivity(session.user.id, "session.complete", { sessionId: operatingSession.id });
  }

  revalidatePath(`/dashboard/railroad/${layoutId}`);
  return { success: true, session: operatingSession };
}
