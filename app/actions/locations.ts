"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { LocationType } from "@prisma/client";
import { checkCategoryLimit } from "@/lib/limits";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

const locationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").max(10),
  locationType: z.nativeEnum(LocationType),
  description: z.string().optional(),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
  population: z.coerce.number().int().optional().nullable(),
  sortOrder: z.coerce.number().int().optional(),
});

export type LocationFormValues = z.infer<typeof locationSchema>;

export async function createLocation(layoutId: string, values: LocationFormValues) {
  const session = await requireAuth();

  const parsed = locationSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Verify layout ownership
  const layout = await db.layout.findFirst({
    where: { id: layoutId, userId: session.user.id },
  });
  if (!layout) return { error: "Layout not found" };

  // Check plan limits
  const limit = await checkCategoryLimit(session.user.id, layoutId, "locations");
  if (!limit.allowed) {
    return { error: `Free plan limit reached (${limit.limit} locations). Upgrade to add more.` };
  }

  // Check unique code within layout
  const existing = await db.location.findUnique({
    where: { code_layoutId: { code: parsed.data.code, layoutId } },
  });
  if (existing) return { error: `Code "${parsed.data.code}" already exists in this railroad` };

  const location = await db.location.create({
    data: {
      ...parsed.data,
      layoutId,
      userId: session.user.id,
    },
  });

  revalidatePath(`/dashboard/railroad/${layoutId}`);
  return { success: true, location };
}

export async function updateLocation(locationId: string, values: LocationFormValues) {
  const session = await requireAuth();

  const parsed = locationSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await db.location.findFirst({
    where: { id: locationId, userId: session.user.id },
  });
  if (!existing) return { error: "Location not found" };

  // Check unique code (excluding self)
  const duplicate = await db.location.findFirst({
    where: {
      code: parsed.data.code,
      layoutId: existing.layoutId,
      id: { not: locationId },
    },
  });
  if (duplicate) return { error: `Code "${parsed.data.code}" already exists in this railroad` };

  const location = await db.location.update({
    where: { id: locationId },
    data: parsed.data,
  });

  revalidatePath(`/dashboard/railroad/${existing.layoutId}`);
  return { success: true, location };
}

export async function deleteLocation(locationId: string) {
  const session = await requireAuth();

  const location = await db.location.findFirst({
    where: { id: locationId, userId: session.user.id },
  });
  if (!location) return { error: "Location not found" };

  await db.location.delete({ where: { id: locationId } });

  revalidatePath(`/dashboard/railroad/${location.layoutId}`);
  return { success: true };
}

// Industries within a location
const industrySchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  capacity: z.coerce.number().int().optional().nullable(),
  spotCount: z.coerce.number().int().optional().nullable(),
  trackLength: z.coerce.number().optional().nullable(),
  description: z.string().optional(),
  commoditiesIn: z.array(z.string()).optional(),
  commoditiesOut: z.array(z.string()).optional(),
});

export type IndustryFormValues = z.infer<typeof industrySchema>;

export async function createIndustry(locationId: string, values: IndustryFormValues) {
  const session = await requireAuth();

  const parsed = industrySchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const location = await db.location.findFirst({
    where: { id: locationId, userId: session.user.id },
  });
  if (!location) return { error: "Location not found" };

  const industry = await db.industry.create({
    data: {
      ...parsed.data,
      commoditiesIn: parsed.data.commoditiesIn ?? [],
      commoditiesOut: parsed.data.commoditiesOut ?? [],
      locationId,
      userId: session.user.id,
    },
  });

  revalidatePath(`/dashboard/railroad/${location.layoutId}`);
  return { success: true, industry };
}

export async function updateIndustry(industryId: string, values: IndustryFormValues) {
  const session = await requireAuth();

  const parsed = industrySchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await db.industry.findFirst({
    where: { id: industryId, userId: session.user.id },
    include: { location: true },
  });
  if (!existing) return { error: "Industry not found" };

  const industry = await db.industry.update({
    where: { id: industryId },
    data: {
      ...parsed.data,
      commoditiesIn: parsed.data.commoditiesIn ?? [],
      commoditiesOut: parsed.data.commoditiesOut ?? [],
    },
  });

  revalidatePath(`/dashboard/railroad/${existing.location.layoutId}`);
  return { success: true, industry };
}

export async function deleteIndustry(industryId: string) {
  const session = await requireAuth();

  const industry = await db.industry.findFirst({
    where: { id: industryId, userId: session.user.id },
    include: { location: true },
  });
  if (!industry) return { error: "Industry not found" };

  await db.industry.delete({ where: { id: industryId } });

  revalidatePath(`/dashboard/railroad/${industry.location.layoutId}`);
  return { success: true };
}
