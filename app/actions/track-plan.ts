"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { put, del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}

async function requireLayoutOwner(layoutId: string, userId: string) {
  const layout = await db.layout.findFirst({
    where: { id: layoutId, userId },
  });
  if (!layout) {
    throw new Error("Layout not found");
  }
  return layout;
}

export async function uploadTrackPlanImage(layoutId: string, formData: FormData) {
  const session = await requireAuth();
  const layout = await requireLayoutOwner(layoutId, session.user.id);

  const file = formData.get("file") as File | null;
  if (!file) {
    return { error: "No file provided" };
  }

  const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return { error: "Only PNG, JPG, and WebP images are accepted" };
  }

  if (file.size > 10 * 1024 * 1024) {
    return { error: "Image must be under 10MB" };
  }

  if (layout.imageUrl) {
    try {
      await del(layout.imageUrl);
    } catch {
      // Old blob may not exist
    }
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const blob = await put(`track-plans/${layoutId}/plan.${ext}`, file, {
    access: "public",
  });

  await db.layout.update({
    where: { id: layoutId },
    data: { imageUrl: blob.url },
  });

  revalidatePath(`/dashboard/railroad/${layoutId}`);
  revalidatePath(`/dashboard/railroad/${layoutId}/settings`);
  return { success: true, imageUrl: blob.url };
}

export async function removeTrackPlanImage(layoutId: string) {
  const session = await requireAuth();
  const layout = await requireLayoutOwner(layoutId, session.user.id);

  if (layout.imageUrl) {
    try {
      await del(layout.imageUrl);
    } catch {
      // Blob may not exist
    }
  }

  await db.layout.update({
    where: { id: layoutId },
    data: { imageUrl: null },
  });

  revalidatePath(`/dashboard/railroad/${layoutId}`);
  revalidatePath(`/dashboard/railroad/${layoutId}/settings`);
  return { success: true };
}

const pinSchema = z.array(
  z.object({
    locationId: z.string(),
    pinX: z.number().min(0).max(1).nullable(),
    pinY: z.number().min(0).max(1).nullable(),
  })
);

export async function updateLocationPins(
  layoutId: string,
  pins: z.infer<typeof pinSchema>
) {
  const session = await requireAuth();
  await requireLayoutOwner(layoutId, session.user.id);

  const validated = pinSchema.safeParse(pins);
  if (!validated.success) {
    return { error: "Invalid pin data" };
  }

  await db.$transaction(
    validated.data.map((pin) =>
      db.location.update({
        where: { id: pin.locationId, layoutId },
        data: { pinX: pin.pinX, pinY: pin.pinY },
      })
    )
  );

  revalidatePath(`/dashboard/railroad/${layoutId}`);
  return { success: true };
}
