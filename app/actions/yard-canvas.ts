"use server";

import { z } from "zod";
import { type Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// ─────────────────────────────────────────────
// Auth helpers
// ─────────────────────────────────────────────

async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

async function verifyLocationAccess(locationId: string, userId: string) {
  const location = await db.location.findFirst({
    where: {
      id: locationId,
      layout: {
        OR: [
          { userId },
          {
            crewMembers: {
              some: {
                userId,
                acceptedAt: { not: null },
                removedAt: null,
              },
            },
          },
        ],
      },
    },
    include: { layout: { select: { id: true } } },
  });
  if (!location) throw new Error("Location not found or access denied");
  return location;
}

// ─────────────────────────────────────────────
// Validation schemas
// ─────────────────────────────────────────────

const pointSchema = z.object({ x: z.number(), y: z.number() });

const trackElementSchema = z.object({
  id: z.string(),
  type: z.literal("track"),
  points: z.array(pointSchema),
  trackType: z.string().default("LEAD"),
  name: z.string().optional(),
  capacity: z.number().optional(),
  length: z.number().optional(),
});

const turnoutElementSchema = z.object({
  id: z.string(),
  type: z.literal("turnout"),
  parentTrackId: z.string(),
  position: pointSchema,
});

const industryElementSchema = z.object({
  id: z.string(),
  type: z.literal("industry"),
  position: pointSchema,
  width: z.number().default(120),
  height: z.number().default(24),
  connectedTrackId: z.string().optional(),
  name: z.string().optional(),
  spotCount: z.number().optional(),
});

// ─────────────────────────────────────────────
// 1. getYardCanvasData
// ─────────────────────────────────────────────

export async function getYardCanvasData(locationId: string) {
  const user = await getAuthenticatedUser();
  await verifyLocationAccess(locationId, user.id!);

  let canvas = await db.locationCanvas.findUnique({
    where: { locationId },
  });

  if (!canvas) {
    canvas = await db.locationCanvas.create({
      data: { locationId },
    });
  }

  const [yardTracks, industries] = await Promise.all([
    db.yardTrack.findMany({ where: { locationId }, orderBy: { sortOrder: "asc" } }),
    db.industry.findMany({ where: { locationId } }),
  ]);

  return {
    canvas: {
      id: canvas.id,
      locationId: canvas.locationId,
      viewport: canvas.viewport,
      trackElements: canvas.trackElements,
      carSlots: canvas.carSlots,
    },
    yardTracks,
    industries,
  };
}

// ─────────────────────────────────────────────
// 2. saveYardCanvas
// ─────────────────────────────────────────────

const saveYardCanvasSchema = z.object({
  canvasId: z.string().optional(),
  locationId: z.string().optional(),
  viewport: z.object({ x: z.number(), y: z.number(), zoom: z.number() }),
  trackElements: z.unknown(),
});

export async function saveYardCanvas(values: z.infer<typeof saveYardCanvasSchema>) {
  const user = await getAuthenticatedUser();
  const parsed = saveYardCanvasSchema.parse(values);

  // Determine the locationId — either provided directly or looked up via canvasId
  let locationId = parsed.locationId;
  if (!locationId && parsed.canvasId) {
    const existing = await db.locationCanvas.findUnique({
      where: { id: parsed.canvasId },
      select: { locationId: true },
    });
    if (!existing) throw new Error("Canvas not found");
    locationId = existing.locationId;
  }
  if (!locationId) throw new Error("Either canvasId or locationId is required");

  await verifyLocationAccess(locationId, user.id!);

  const data = {
    trackElements: parsed.trackElements as Prisma.InputJsonValue,
    viewport: parsed.viewport as Prisma.InputJsonValue,
  };

  let canvas;
  if (parsed.canvasId) {
    canvas = await db.locationCanvas.update({
      where: { id: parsed.canvasId },
      data,
    });
  } else {
    canvas = await db.locationCanvas.upsert({
      where: { locationId },
      update: data,
      create: { locationId, ...data },
    });
  }

  return { success: true, canvas };
}

// ─────────────────────────────────────────────
// 3. createYardTrackElement
// ─────────────────────────────────────────────

const createYardTrackSchema = z.object({
  locationId: z.string(),
  canvasId: z.string(),
  element: trackElementSchema,
});

export async function createYardTrackElement(values: z.infer<typeof createYardTrackSchema>) {
  const user = await getAuthenticatedUser();
  const parsed = createYardTrackSchema.parse(values);
  await verifyLocationAccess(parsed.locationId, user.id!);

  const result = await db.$transaction(async (tx) => {
    const yardTrack = await tx.yardTrack.create({
      data: {
        name: parsed.element.name || `Track ${parsed.element.id.slice(-4)}`,
        trackType: (parsed.element.trackType as "LEAD") || "LEAD",
        capacity: parsed.element.capacity ?? 5,
        length: parsed.element.length,
        locationId: parsed.locationId,
        userId: user.id!,
      },
    });

    const canvas = await tx.locationCanvas.findUnique({
      where: { id: parsed.canvasId },
    });
    if (!canvas) throw new Error("Canvas not found");

    const elements = canvas.trackElements as Prisma.JsonArray;
    const elementWithDbId = { ...parsed.element, yardTrackId: yardTrack.id };
    elements.push(elementWithDbId);

    await tx.locationCanvas.update({
      where: { id: parsed.canvasId },
      data: { trackElements: elements as Prisma.InputJsonValue },
    });

    return { yardTrack, element: elementWithDbId };
  });

  return { success: true, ...result };
}

// ─────────────────────────────────────────────
// 4. createIndustryElement
// ─────────────────────────────────────────────

const createIndustrySchema = z.object({
  locationId: z.string(),
  canvasId: z.string(),
  element: industryElementSchema,
});

export async function createIndustryElement(values: z.infer<typeof createIndustrySchema>) {
  const user = await getAuthenticatedUser();
  const parsed = createIndustrySchema.parse(values);
  await verifyLocationAccess(parsed.locationId, user.id!);

  const result = await db.$transaction(async (tx) => {
    const industry = await tx.industry.create({
      data: {
        name: parsed.element.name || `Industry ${parsed.element.id.slice(-4)}`,
        type: "General",
        spotCount: parsed.element.spotCount,
        locationId: parsed.locationId,
        userId: user.id!,
      },
    });

    const canvas = await tx.locationCanvas.findUnique({
      where: { id: parsed.canvasId },
    });
    if (!canvas) throw new Error("Canvas not found");

    const elements = canvas.trackElements as Prisma.JsonArray;
    const elementWithDbId = { ...parsed.element, industryId: industry.id };
    elements.push(elementWithDbId);

    await tx.locationCanvas.update({
      where: { id: parsed.canvasId },
      data: { trackElements: elements as Prisma.InputJsonValue },
    });

    return { industry, element: elementWithDbId };
  });

  return { success: true, ...result };
}

// ─────────────────────────────────────────────
// 5. createTurnoutElement
// ─────────────────────────────────────────────

const createTurnoutSchema = z.object({
  locationId: z.string(),
  canvasId: z.string(),
  element: turnoutElementSchema,
});

export async function createTurnoutElement(values: z.infer<typeof createTurnoutSchema>) {
  const user = await getAuthenticatedUser();
  const parsed = createTurnoutSchema.parse(values);
  await verifyLocationAccess(parsed.locationId, user.id!);

  const canvas = await db.locationCanvas.findUnique({
    where: { id: parsed.canvasId },
  });
  if (!canvas) throw new Error("Canvas not found");

  const elements = canvas.trackElements as Prisma.JsonArray;
  elements.push(parsed.element);

  await db.locationCanvas.update({
    where: { id: parsed.canvasId },
    data: { trackElements: elements as Prisma.InputJsonValue },
  });

  return { success: true, element: parsed.element };
}

// ─────────────────────────────────────────────
// 6. updateYardElement
// ─────────────────────────────────────────────

const updateYardElementSchema = z.object({
  locationId: z.string(),
  canvasId: z.string(),
  elementId: z.string(),
  updates: z.record(z.string(), z.unknown()),
});

export async function updateYardElement(values: z.infer<typeof updateYardElementSchema>) {
  const user = await getAuthenticatedUser();
  const parsed = updateYardElementSchema.parse(values);
  await verifyLocationAccess(parsed.locationId, user.id!);

  const result = await db.$transaction(async (tx) => {
    const canvas = await tx.locationCanvas.findUnique({
      where: { id: parsed.canvasId },
    });
    if (!canvas) throw new Error("Canvas not found");

    const elements = canvas.trackElements as Record<string, unknown>[];
    const idx = elements.findIndex((el) => el.id === parsed.elementId);
    if (idx === -1) throw new Error("Element not found");

    const element = { ...elements[idx], ...parsed.updates };
    elements[idx] = element;

    await tx.locationCanvas.update({
      where: { id: parsed.canvasId },
      data: { trackElements: elements as Prisma.InputJsonValue },
    });

    // Sync DB records
    if (element.type === "track" && element.yardTrackId) {
      const dbUpdates: Record<string, unknown> = {};
      if (parsed.updates.name !== undefined) dbUpdates.name = parsed.updates.name;
      if (parsed.updates.trackType !== undefined) dbUpdates.trackType = parsed.updates.trackType;
      if (parsed.updates.capacity !== undefined) dbUpdates.capacity = parsed.updates.capacity;
      if (parsed.updates.length !== undefined) dbUpdates.length = parsed.updates.length;

      if (Object.keys(dbUpdates).length > 0) {
        await tx.yardTrack.update({
          where: { id: element.yardTrackId as string },
          data: dbUpdates,
        });
      }
    }

    if (element.type === "industry" && element.industryId) {
      const dbUpdates: Record<string, unknown> = {};
      if (parsed.updates.name !== undefined) dbUpdates.name = parsed.updates.name;
      if (parsed.updates.spotCount !== undefined) dbUpdates.spotCount = parsed.updates.spotCount;

      if (Object.keys(dbUpdates).length > 0) {
        await tx.industry.update({
          where: { id: element.industryId as string },
          data: dbUpdates,
        });
      }
    }

    return { element };
  });

  return { success: true, ...result };
}

// ─────────────────────────────────────────────
// 7. deleteYardElement
// ─────────────────────────────────────────────

const deleteYardElementSchema = z.object({
  locationId: z.string(),
  canvasId: z.string(),
  elementId: z.string(),
});

export async function deleteYardElement(values: z.infer<typeof deleteYardElementSchema>) {
  const user = await getAuthenticatedUser();
  const parsed = deleteYardElementSchema.parse(values);
  await verifyLocationAccess(parsed.locationId, user.id!);

  const result = await db.$transaction(async (tx) => {
    const canvas = await tx.locationCanvas.findUnique({
      where: { id: parsed.canvasId },
    });
    if (!canvas) throw new Error("Canvas not found");

    const elements = canvas.trackElements as Record<string, unknown>[];
    const element = elements.find((el) => el.id === parsed.elementId);
    if (!element) throw new Error("Element not found");

    // Remove the element and any orphaned turnouts referencing it
    const filtered = elements.filter((el) => {
      if (el.id === parsed.elementId) return false;
      if (el.type === "turnout" && el.parentTrackId === parsed.elementId) return false;
      return true;
    });

    await tx.locationCanvas.update({
      where: { id: parsed.canvasId },
      data: { trackElements: filtered as Prisma.InputJsonValue },
    });

    // Delete associated DB records
    if (element.type === "track" && element.yardTrackId) {
      await tx.yardTrack.delete({
        where: { id: element.yardTrackId as string },
      });
    }

    if (element.type === "industry" && element.industryId) {
      await tx.industry.delete({
        where: { id: element.industryId as string },
      });
    }

    return { deletedId: parsed.elementId };
  });

  return { success: true, ...result };
}
