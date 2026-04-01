"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { LocationType } from "@prisma/client";
import { checkTotalItemLimit } from "@/lib/limits";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

// --- Type-specific attribute schemas ---

const passengerStationAttributesSchema = z.object({
  stationClass: z.string().optional().nullable(),
  platformCount: z.coerce.number().int().optional().nullable(),
  hasFreightHouse: z.boolean().optional(),
  hasExpressService: z.boolean().optional(),
});

const yardAttributesSchema = z.object({
  yardType: z.string().optional().nullable(),
  hasEngineFacilities: z.boolean().optional(),
  hasRipTrack: z.boolean().optional(),
  hasCabooseTrack: z.boolean().optional(),
  totalCarCapacity: z.coerce.number().int().optional().nullable(),
});

const interchangeAttributesSchema = z.object({
  connectingRailroads: z.array(z.string()).optional(),
  interchangeDirection: z.string().optional().nullable(),
  trackCount: z.coerce.number().int().optional().nullable(),
  carCapacity: z.coerce.number().int().optional().nullable(),
});

const junctionAttributesSchema = z.object({
  convergingLines: z.array(z.string()).optional(),
  hasSignals: z.boolean().optional(),
  controlPoint: z.string().optional().nullable(),
  hasPassingSiding: z.boolean().optional(),
});

const stagingAttributesSchema = z.object({
  represents: z.string().optional().nullable(),
  stagingType: z.string().optional().nullable(),
  trackCount: z.coerce.number().int().optional().nullable(),
  totalCarCapacity: z.coerce.number().int().optional().nullable(),
  isFiddleYard: z.boolean().optional(),
});

const teamTrackAttributesSchema = z.object({
  carSpots: z.coerce.number().int().optional().nullable(),
  hasLoadingDock: z.boolean().optional(),
  hasScaleTrack: z.boolean().optional(),
});

const sidingAttributesSchema = z.object({
  sidingType: z.string().optional().nullable(),
  lengthInCarLengths: z.coerce.number().int().optional().nullable(),
  carCapacity: z.coerce.number().int().optional().nullable(),
  isDoubleEnded: z.boolean().optional(),
});

function getTypeAttributesSchema(locationType: LocationType) {
  switch (locationType) {
    case "PASSENGER_STATION": return passengerStationAttributesSchema;
    case "YARD": return yardAttributesSchema;
    case "INTERCHANGE": return interchangeAttributesSchema;
    case "JUNCTION": return junctionAttributesSchema;
    case "STAGING": return stagingAttributesSchema;
    case "TEAM_TRACK": return teamTrackAttributesSchema;
    case "SIDING": return sidingAttributesSchema;
    default: return null;
  }
}

// --- Main location schema ---

const locationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").max(10),
  locationType: z.nativeEnum(LocationType),
  description: z.string().optional(),
  population: z.coerce.number().int().optional().nullable(),
  sortOrder: z.coerce.number().int().optional(),
  typeAttributes: z.any().optional(),
});

export type LocationFormValues = z.infer<typeof locationSchema>;

export async function createLocation(layoutId: string, values: LocationFormValues) {
  const session = await requireAuth();

  const parsed = locationSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Only allow population for PASSENGER_STATION
  if (parsed.data.locationType !== "PASSENGER_STATION") {
    parsed.data.population = null;
  }

  // Validate typeAttributes per type
  const typeAttributesSchema = getTypeAttributesSchema(parsed.data.locationType);
  if (parsed.data.typeAttributes && typeAttributesSchema) {
    const attrResult = typeAttributesSchema.safeParse(parsed.data.typeAttributes);
    if (!attrResult.success) return { error: attrResult.error.issues[0].message };
    parsed.data.typeAttributes = attrResult.data;
  }

  // Verify layout ownership
  const layout = await db.layout.findFirst({
    where: { id: layoutId, userId: session.user.id },
  });
  if (!layout) return { error: "Layout not found" };

  // Check plan limits
  const limit = await checkTotalItemLimit(session.user.id);
  if (!limit.allowed) {
    return { error: `Free plan limit reached (${limit.current}/${limit.limit} total items). Upgrade to Pro to add more.` };
  }

  // Check unique code within layout
  const existing = await db.location.findUnique({
    where: { code_layoutId: { code: parsed.data.code, layoutId } },
  });
  if (existing) return { error: `Code "${parsed.data.code}" already exists in this railroad` };

  const location = await db.location.create({
    data: {
      name: parsed.data.name,
      code: parsed.data.code,
      locationType: parsed.data.locationType,
      description: parsed.data.description,
      population: parsed.data.population,
      sortOrder: parsed.data.sortOrder,
      typeAttributes: parsed.data.typeAttributes ?? undefined,
      layoutId,
      userId: session.user.id,
    },
  });

  revalidatePath(`/dashboard/railroad/${layoutId}`);
  revalidatePath(`/dashboard/railroad/${layoutId}/locations`);
  return { success: true, location };
}

export async function updateLocation(locationId: string, values: LocationFormValues) {
  const session = await requireAuth();

  const parsed = locationSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Only allow population for PASSENGER_STATION
  if (parsed.data.locationType !== "PASSENGER_STATION") {
    parsed.data.population = null;
  }

  // Validate typeAttributes per type
  const typeAttributesSchema = getTypeAttributesSchema(parsed.data.locationType);
  if (parsed.data.typeAttributes && typeAttributesSchema) {
    const attrResult = typeAttributesSchema.safeParse(parsed.data.typeAttributes);
    if (!attrResult.success) return { error: attrResult.error.issues[0].message };
    parsed.data.typeAttributes = attrResult.data;
  }

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
    data: {
      name: parsed.data.name,
      code: parsed.data.code,
      locationType: parsed.data.locationType,
      description: parsed.data.description,
      population: parsed.data.population,
      sortOrder: parsed.data.sortOrder,
      typeAttributes: parsed.data.typeAttributes ?? undefined,
    },
  });

  revalidatePath(`/dashboard/railroad/${existing.layoutId}`);
  revalidatePath(`/dashboard/railroad/${existing.layoutId}/locations`);
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
  revalidatePath(`/dashboard/railroad/${location.layoutId}/locations`);
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
