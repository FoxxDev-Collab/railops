"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// ── Schemas ──

const viewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number(),
});

const nodePositionSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
});

const saveCanvasSchema = z.object({
  canvasId: z.string(),
  viewport: viewportSchema.optional(),
  nodePositions: z.array(nodePositionSchema).optional(),
});

const createCanvasNodeSchema = z.object({
  layoutId: z.string(),
  locationName: z.string().min(1),
  locationCode: z.string().min(1),
  locationType: z.enum([
    "PASSENGER_STATION",
    "YARD",
    "INTERCHANGE",
    "JUNCTION",
    "STAGING",
    "TEAM_TRACK",
    "SIDING",
  ]),
  x: z.number(),
  y: z.number(),
});

const createCanvasEdgeSchema = z.object({
  canvasId: z.string(),
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  trackType: z.enum(["mainline", "branch", "spur"]).default("mainline"),
  label: z.string().optional(),
});

const deleteCanvasElementSchema = z.object({
  type: z.enum(["node", "edge"]),
  id: z.string(),
});

// ── Helpers ──

async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

async function verifyLayoutAccess(layoutId: string, userId: string) {
  const layout = await db.layout.findFirst({
    where: {
      id: layoutId,
      OR: [
        { userId },
        { crewMembers: { some: { userId, acceptedAt: { not: null }, removedAt: null } } },
      ],
    },
  });
  if (!layout) throw new Error("Layout not found or access denied");
  return layout;
}

// ── Actions ──

export async function getCanvasData(layoutId: string) {
  const user = await getAuthenticatedUser();
  await verifyLayoutAccess(layoutId, user.id);

  let canvas = await db.layoutCanvas.findUnique({
    where: { layoutId },
    include: {
      nodes: {
        include: {
          location: {
            include: {
              industries: { select: { id: true, name: true } },
              yardTracks: { select: { id: true, name: true, trackType: true } },
            },
          },
        },
      },
      edges: true,
    },
  });

  if (!canvas) {
    canvas = await db.layoutCanvas.create({
      data: { layoutId },
      include: {
        nodes: {
          include: {
            location: {
              include: {
                industries: { select: { id: true, name: true } },
                yardTracks: { select: { id: true, name: true, trackType: true } },
              },
            },
          },
        },
        edges: true,
      },
    });
  }

  return canvas;
}

export async function saveCanvasState(values: z.infer<typeof saveCanvasSchema>) {
  const user = await getAuthenticatedUser();
  const validated = saveCanvasSchema.parse(values);

  const canvas = await db.layoutCanvas.findUnique({
    where: { id: validated.canvasId },
    select: { layout: { select: { id: true } } },
  });
  if (!canvas) return { error: "Canvas not found" };
  await verifyLayoutAccess(canvas.layout.id, user.id);

  const updates: Promise<unknown>[] = [];

  if (validated.viewport) {
    updates.push(
      db.layoutCanvas.update({
        where: { id: validated.canvasId },
        data: { viewport: validated.viewport },
      })
    );
  }

  if (validated.nodePositions) {
    for (const pos of validated.nodePositions) {
      updates.push(
        db.canvasNode.update({
          where: { id: pos.id },
          data: { x: pos.x, y: pos.y },
        })
      );
    }
  }

  await Promise.all(updates);
  return { success: true };
}

export async function createCanvasNode(values: z.infer<typeof createCanvasNodeSchema>) {
  const user = await getAuthenticatedUser();
  const validated = createCanvasNodeSchema.parse(values);
  await verifyLayoutAccess(validated.layoutId, user.id);

  const canvas = await db.layoutCanvas.findUnique({
    where: { layoutId: validated.layoutId },
  });
  if (!canvas) return { error: "Canvas not found. Open the map editor first." };

  const result = await db.$transaction(async (tx) => {
    const location = await tx.location.create({
      data: {
        name: validated.locationName,
        code: validated.locationCode,
        locationType: validated.locationType,
        layoutId: validated.layoutId,
        userId: user.id,
      },
    });

    const node = await tx.canvasNode.create({
      data: {
        canvasId: canvas.id,
        locationId: location.id,
        x: validated.x,
        y: validated.y,
      },
      include: {
        location: {
          include: {
            industries: { select: { id: true, name: true } },
            yardTracks: { select: { id: true, name: true, trackType: true } },
          },
        },
      },
    });

    return node;
  });

  revalidatePath(`/dashboard/railroad/${validated.layoutId}/map`);
  return { success: true, node: result };
}

export async function createCanvasEdge(values: z.infer<typeof createCanvasEdgeSchema>) {
  const user = await getAuthenticatedUser();
  const validated = createCanvasEdgeSchema.parse(values);

  const canvas = await db.layoutCanvas.findUnique({
    where: { id: validated.canvasId },
    select: { layout: { select: { id: true } } },
  });
  if (!canvas) return { error: "Canvas not found" };
  await verifyLayoutAccess(canvas.layout.id, user.id);

  const edge = await db.canvasEdge.create({
    data: {
      canvasId: validated.canvasId,
      sourceNodeId: validated.sourceNodeId,
      targetNodeId: validated.targetNodeId,
      trackType: validated.trackType,
      label: validated.label,
    },
  });

  return { success: true, edge };
}

export async function deleteCanvasElement(values: z.infer<typeof deleteCanvasElementSchema>) {
  const user = await getAuthenticatedUser();
  const validated = deleteCanvasElementSchema.parse(values);

  if (validated.type === "node") {
    const node = await db.canvasNode.findUnique({
      where: { id: validated.id },
      include: { canvas: { select: { layout: { select: { id: true } } } } },
    });
    if (!node) return { error: "Node not found" };
    await verifyLayoutAccess(node.canvas.layout.id, user.id);

    // Delete the location too (cascades to node)
    await db.location.delete({ where: { id: node.locationId } });
  } else {
    const edge = await db.canvasEdge.findUnique({
      where: { id: validated.id },
      include: { canvas: { select: { layout: { select: { id: true } } } } },
    });
    if (!edge) return { error: "Edge not found" };
    await verifyLayoutAccess(edge.canvas.layout.id, user.id);

    await db.canvasEdge.delete({ where: { id: validated.id } });
  }

  return { success: true };
}
