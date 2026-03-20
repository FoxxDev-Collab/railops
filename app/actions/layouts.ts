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

// Get user's selected layout and all layouts for context provider
export async function getLayoutContext() {
  const session = await requireAuth();

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      selectedLayout: true,
      layouts: {
        select: {
          id: true,
          name: true,
          scale: true,
          description: true,
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  let selectedLayout = user.selectedLayout;

  // Auto-select logic: if no layout selected but user has layouts
  if (!selectedLayout && user.layouts.length > 0) {
    // If only one layout, auto-select it
    if (user.layouts.length === 1) {
      const autoSelectedLayout = user.layouts[0];
      await db.user.update({
        where: { id: session.user.id },
        data: { selectedLayoutId: autoSelectedLayout.id },
      });
      selectedLayout = await db.layout.findUnique({
        where: { id: autoSelectedLayout.id },
      });
    }
  }

  // If selected layout no longer exists (was deleted), clear it
  if (user.selectedLayoutId && !selectedLayout) {
    await db.user.update({
      where: { id: session.user.id },
      data: { selectedLayoutId: null },
    });
  }

  return {
    selectedLayout: selectedLayout
      ? {
          id: selectedLayout.id,
          name: selectedLayout.name,
          scale: selectedLayout.scale,
          description: selectedLayout.description,
        }
      : null,
    layouts: user.layouts,
  };
}

// Select a layout
export async function selectLayout(layoutId: string | null) {
  const session = await requireAuth();

  if (layoutId) {
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
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { selectedLayoutId: layoutId },
  });

  revalidatePath("/dashboard");
  return { success: true };
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
