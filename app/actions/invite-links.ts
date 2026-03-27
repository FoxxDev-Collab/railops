"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/crew/context";
import { checkCrewLimit } from "@/lib/limits";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

// ─── Get Invite Links ───────────────────────────────

export async function getInviteLinks(layoutId: string) {
  await requireAuth();
  await requirePermission(layoutId, "crew", "view");

  return db.inviteLink.findMany({
    where: { layoutId },
    include: {
      role: { select: { name: true } },
      creator: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Create Invite Link ────────────────────────────

const createLinkSchema = z.object({
  layoutId: z.string().min(1),
  roleId: z.string().min(1),
  maxUses: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
});

export async function createInviteLink(values: z.infer<typeof createLinkSchema>) {
  const session = await requireAuth();
  const parsed = createLinkSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { layoutId, roleId, maxUses, expiresAt } = parsed.data;
  await requirePermission(layoutId, "crew", "edit");

  const role = await db.role.findFirst({ where: { id: roleId, layoutId } });
  if (!role) return { error: "Role not found" };

  const link = await db.inviteLink.create({
    data: {
      layoutId,
      roleId,
      maxUses: maxUses || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: session.user.id,
    },
  });

  revalidatePath(`/dashboard/railroad/${layoutId}/crew`);
  return { success: true, code: link.code };
}

// ─── Pause / Resume ─────────────────────────────────

export async function toggleInviteLinkPause(linkId: string, layoutId: string) {
  await requireAuth();
  await requirePermission(layoutId, "crew", "edit");

  const link = await db.inviteLink.findFirst({ where: { id: linkId, layoutId } });
  if (!link) return { error: "Link not found" };

  await db.inviteLink.update({
    where: { id: linkId },
    data: { paused: !link.paused },
  });

  revalidatePath(`/dashboard/railroad/${layoutId}/crew`);
  return { success: true };
}

// ─── Revoke (Delete) ────────────────────────────────

export async function revokeInviteLink(linkId: string, layoutId: string) {
  await requireAuth();
  await requirePermission(layoutId, "crew", "edit");

  const link = await db.inviteLink.findFirst({ where: { id: linkId, layoutId } });
  if (!link) return { error: "Link not found" };

  await db.inviteLink.delete({ where: { id: linkId } });

  revalidatePath(`/dashboard/railroad/${layoutId}/crew`);
  return { success: true };
}

// ─── Join via Invite Link ───────────────────────────

export async function joinViaInviteLink(code: string) {
  const session = await requireAuth();

  const link = await db.inviteLink.findUnique({
    where: { code },
    include: {
      layout: { select: { id: true, name: true, userId: true } },
      role: { select: { id: true, name: true } },
    },
  });

  if (!link) return { error: "Invalid invite link" };
  if (link.paused) return { error: "This invite link is paused" };
  if (link.expiresAt && link.expiresAt < new Date()) return { error: "This invite link has expired" };
  if (link.maxUses && link.uses >= link.maxUses) return { error: "This invite link has reached its maximum uses" };

  if (link.layout.userId === session.user.id) {
    return { error: "You already own this railroad" };
  }

  const existing = await db.crewMember.findUnique({
    where: { userId_layoutId: { userId: session.user.id, layoutId: link.layoutId } },
  });

  if (existing?.acceptedAt && !existing?.removedAt) {
    return { error: "You're already a member of this railroad" };
  }

  const limit = await checkCrewLimit(link.layoutId);
  if (!limit.allowed) {
    return { error: "This railroad has reached its crew member limit" };
  }

  if (existing) {
    await db.crewMember.update({
      where: { id: existing.id },
      data: { roleId: link.role.id, acceptedAt: new Date(), removedAt: null, removedBy: null },
    });
  } else {
    await db.crewMember.create({
      data: {
        userId: session.user.id,
        layoutId: link.layoutId,
        roleId: link.role.id,
        acceptedAt: new Date(),
      },
    });
  }

  await db.inviteLink.update({
    where: { id: link.id },
    data: { uses: { increment: 1 } },
  });

  revalidatePath("/dashboard");
  return { success: true, layoutId: link.layoutId, railroadName: link.layout.name };
}

// ─── Get Link Info (for the join page) ──────────────

export async function getInviteLinkInfo(code: string) {
  const link = await db.inviteLink.findUnique({
    where: { code },
    include: {
      layout: { select: { name: true } },
      role: { select: { name: true } },
      creator: { select: { name: true } },
    },
  });

  if (!link) return null;

  return {
    railroadName: link.layout.name,
    roleName: link.role.name,
    creatorName: link.creator.name,
    paused: link.paused,
    expired: link.expiresAt ? link.expiresAt < new Date() : false,
    maxedOut: link.maxUses ? link.uses >= link.maxUses : false,
  };
}
