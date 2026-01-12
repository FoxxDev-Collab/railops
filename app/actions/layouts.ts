"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}

const layoutSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  scale: z.string().optional(),
  imageUrl: z.string().optional(),
});

// Create layout
export async function createLayout(values: z.infer<typeof layoutSchema>) {
  const session = await requireAuth();

  const validatedFields = layoutSchema.safeParse(values);
  if (!validatedFields.success) {
    return { error: "Invalid fields" };
  }

  const layout = await db.layout.create({
    data: {
      ...validatedFields.data,
      userId: session.user.id,
    },
  });

  revalidatePath("/dashboard/layouts");
  return { success: true, layout };
}

// Get user's layouts
export async function getLayouts() {
  const session = await requireAuth();

  const layouts = await db.layout.findMany({
    where: { userId: session.user.id },
    include: {
      _count: {
        select: {
          stations: true,
          rollingStock: true,
          routes: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return layouts;
}

// Get single layout with ownership check
export async function getLayout(layoutId: string) {
  const session = await requireAuth();

  const layout = await db.layout.findFirst({
    where: {
      id: layoutId,
      userId: session.user.id, // Ensures user owns this layout
    },
    include: {
      stations: true,
      rollingStock: true,
      routes: true,
    },
  });

  if (!layout) {
    throw new Error("Layout not found");
  }

  return layout;
}

// Update layout
export async function updateLayout(
  layoutId: string,
  values: z.infer<typeof layoutSchema>
) {
  const session = await requireAuth();

  const validatedFields = layoutSchema.safeParse(values);
  if (!validatedFields.success) {
    return { error: "Invalid fields" };
  }

  // Verify ownership
  const existingLayout = await db.layout.findFirst({
    where: {
      id: layoutId,
      userId: session.user.id,
    },
  });

  if (!existingLayout) {
    return { error: "Layout not found" };
  }

  const layout = await db.layout.update({
    where: { id: layoutId },
    data: validatedFields.data,
  });

  revalidatePath("/dashboard/layouts");
  revalidatePath(`/dashboard/layouts/${layoutId}`);
  return { success: true, layout };
}

// Delete layout
export async function deleteLayout(layoutId: string) {
  const session = await requireAuth();

  // Verify ownership
  const layout = await db.layout.findFirst({
    where: {
      id: layoutId,
      userId: session.user.id,
    },
  });

  if (!layout) {
    return { error: "Layout not found" };
  }

  await db.layout.delete({
    where: { id: layoutId },
  });

  revalidatePath("/dashboard/layouts");
  return { success: true };
}
