"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkRailroadLimit } from "@/lib/limits";
import { seedDefaultRoles } from "@/lib/crew/seed-roles";

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
      crewMemberships: {
        where: {
          acceptedAt: { not: null },
          removedAt: null,
        },
        include: {
          layout: {
            select: {
              id: true,
              name: true,
              scale: true,
              description: true,
            },
          },
          role: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Combine owned + crew layouts
  const ownedLayouts = user.layouts.map((l) => ({
    ...l,
    crewRole: null as string | null,
  }));
  const crewLayouts = user.crewMemberships.map((m) => ({
    ...m.layout,
    crewRole: m.role.name,
  }));
  const allLayouts = [...ownedLayouts, ...crewLayouts];

  let selectedLayout = user.selectedLayout;

  // Auto-select logic: if no layout selected but user has layouts
  if (!selectedLayout && allLayouts.length > 0) {
    if (allLayouts.length === 1) {
      const autoSelectedLayout = allLayouts[0];
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
    layouts: allLayouts,
  };
}

// Select a layout (owner or crew member)
export async function selectLayout(layoutId: string | null) {
  const session = await requireAuth();

  if (layoutId) {
    // Verify ownership OR active crew membership
    const isOwner = await db.layout.count({
      where: { id: layoutId, userId: session.user.id },
    });

    if (!isOwner) {
      const membership = await db.crewMember.findUnique({
        where: {
          userId_layoutId: {
            userId: session.user.id,
            layoutId,
          },
        },
        select: { acceptedAt: true, removedAt: true },
      });

      if (!membership?.acceptedAt || membership?.removedAt) {
        return { error: "Layout not found" };
      }
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

  const limit = await checkRailroadLimit(session.user.id);
  if (!limit.allowed) {
    return { error: `Free plan limit reached (${limit.limit} railroad). Upgrade to add more.` };
  }

  const layout = await db.layout.create({
    data: {
      ...validatedFields.data,
      userId: session.user.id,
    },
  });

  // Seed default crew roles for this railroad
  await seedDefaultRoles(layout.id);

  revalidatePath("/dashboard");
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
          locations: true,
          freightCars: true,
          locomotives: true,
          passengerCars: true,
          cabooses: true,
          mowEquipment: true,
          trains: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return layouts;
}

// Get single layout — owner OR active crew member can access
export async function getLayout(layoutId: string) {
  const session = await requireAuth();

  const layoutInclude = {
    locations: {
      include: { industries: true, yardTracks: true },
      orderBy: { sortOrder: "asc" } as const,
    },
    locomotives: true,
    freightCars: true,
    passengerCars: true,
    cabooses: true,
    mowEquipment: true,
    trains: {
      include: { origin: true, destination: true },
      orderBy: { trainNumber: "asc" } as const,
    },
  };

  // First try as owner
  let layout = await db.layout.findFirst({
    where: { id: layoutId, userId: session.user.id },
    include: layoutInclude,
  });

  if (!layout) {
    // Check if user is an active crew member
    const membership = await db.crewMember.findUnique({
      where: {
        userId_layoutId: { userId: session.user.id, layoutId },
      },
      select: { acceptedAt: true, removedAt: true },
    });

    if (!membership?.acceptedAt || membership?.removedAt) {
      throw new Error("Layout not found");
    }

    // Fetch layout without ownership check
    layout = await db.layout.findUnique({
      where: { id: layoutId },
      include: layoutInclude,
    });

    if (!layout) {
      throw new Error("Layout not found");
    }
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

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/railroad/${layoutId}`);
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

  revalidatePath("/dashboard");
  return { success: true };
}
