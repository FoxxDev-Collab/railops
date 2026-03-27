"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/crew/context";
import { checkCrewLimit } from "@/lib/limits";
import { sendCrewInviteEmail, sendCrewRoleChangedEmail, sendCrewRemovedEmail } from "@/lib/mail";
import { SignJWT, jwtVerify } from "jose";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

const INVITE_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "fallback-secret"
);

async function createInviteToken(crewMemberId: string, layoutId: string): Promise<string> {
  return new SignJWT({ crewMemberId, layoutId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(INVITE_SECRET);
}

export async function verifyInviteToken(
  token: string
): Promise<{ crewMemberId: string; layoutId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, INVITE_SECRET);
    return {
      crewMemberId: payload.crewMemberId as string,
      layoutId: payload.layoutId as string,
    };
  } catch {
    return null;
  }
}

// ─── Invite by Email ───────────────────────────────

const inviteSchema = z.object({
  layoutId: z.string().min(1),
  email: z.string().email(),
  roleId: z.string().min(1),
});

export async function inviteCrewMember(values: z.infer<typeof inviteSchema>) {
  const session = await requireAuth();
  const parsed = inviteSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { layoutId, email, roleId } = parsed.data;
  await requirePermission(layoutId, "crew", "edit");

  // Check crew limit
  const limit = await checkCrewLimit(layoutId);
  if (!limit.allowed) {
    return { error: "Crew limit reached. Upgrade your plan to add more members." };
  }

  // Can't invite yourself
  const inviterUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true },
  });
  if (inviterUser?.email === email) {
    return { error: "You can't invite yourself" };
  }

  // Verify role belongs to this layout
  const role = await db.role.findFirst({
    where: { id: roleId, layoutId },
    select: { id: true, name: true },
  });
  if (!role) return { error: "Role not found" };

  // Check if user exists
  const targetUser = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  const layout = await db.layout.findUnique({
    where: { id: layoutId },
    select: { name: true },
  });

  if (targetUser) {
    // Check existing membership
    const existing = await db.crewMember.findUnique({
      where: { userId_layoutId: { userId: targetUser.id, layoutId } },
      select: { id: true, acceptedAt: true, removedAt: true },
    });

    if (existing && existing.acceptedAt && !existing.removedAt) {
      return { error: "This person is already a crew member" };
    }

    if (existing && existing.removedAt) {
      // Re-invite previously removed member
      const member = await db.crewMember.update({
        where: { id: existing.id },
        data: {
          roleId,
          invitedBy: session.user.id,
          invitedAt: new Date(),
          acceptedAt: null,
          removedAt: null,
          removedBy: null,
        },
      });
      const token = await createInviteToken(member.id, layoutId);
      await sendCrewInviteEmail(email, token, layout?.name || "a railroad", role.name, inviterUser?.name || null);
      revalidatePath(`/dashboard/railroad/${layoutId}/crew`);
      return { success: true };
    }

    if (existing && !existing.acceptedAt) {
      // Re-send for existing pending
      const token = await createInviteToken(existing.id, layoutId);
      await sendCrewInviteEmail(email, token, layout?.name || "a railroad", role.name, inviterUser?.name || null);
      revalidatePath(`/dashboard/railroad/${layoutId}/crew`);
      return { success: true };
    }

    // Create new membership
    const member = await db.crewMember.create({
      data: {
        userId: targetUser.id,
        layoutId,
        roleId,
        invitedBy: session.user.id,
      },
    });
    const token = await createInviteToken(member.id, layoutId);
    await sendCrewInviteEmail(email, token, layout?.name || "a railroad", role.name, inviterUser?.name || null);
    revalidatePath(`/dashboard/railroad/${layoutId}/crew`);
    return { success: true };
  }

  // User doesn't exist — send email-only invite token
  const token = await new SignJWT({
    email,
    layoutId,
    roleId,
    invitedBy: session.user.id,
    type: "email-invite",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(INVITE_SECRET);

  await sendCrewInviteEmail(email, token, layout?.name || "a railroad", role.name, inviterUser?.name || null);
  revalidatePath(`/dashboard/railroad/${layoutId}/crew`);
  return { success: true };
}

// ─── Accept Email Invite ───────────────────────────

export async function acceptEmailInvite(token: string) {
  const session = await requireAuth();

  // Try member invite (user existed when invited)
  const memberPayload = await verifyInviteToken(token);
  if (memberPayload) {
    const member = await db.crewMember.findUnique({
      where: { id: memberPayload.crewMemberId },
      select: { id: true, userId: true, acceptedAt: true, removedAt: true },
    });

    if (!member) return { error: "Invitation not found" };
    if (member.userId !== session.user.id) return { error: "This invitation is for a different account" };
    if (member.acceptedAt) return { error: "Already accepted" };
    if (member.removedAt) return { error: "This invitation has been revoked" };

    await db.crewMember.update({
      where: { id: member.id },
      data: { acceptedAt: new Date() },
    });

    revalidatePath("/dashboard");
    return { success: true, layoutId: memberPayload.layoutId };
  }

  // Try email-only invite (user didn't exist when invited)
  try {
    const { payload } = await jwtVerify(token, INVITE_SECRET);
    if (payload.type !== "email-invite") return { error: "Invalid invitation" };

    const { layoutId, roleId, invitedBy } = payload as {
      layoutId: string;
      roleId: string;
      invitedBy: string;
    };

    const existing = await db.crewMember.findUnique({
      where: { userId_layoutId: { userId: session.user.id, layoutId } },
    });

    if (existing?.acceptedAt && !existing?.removedAt) {
      return { error: "You're already a member of this railroad" };
    }

    if (existing) {
      await db.crewMember.update({
        where: { id: existing.id },
        data: { roleId, acceptedAt: new Date(), removedAt: null, removedBy: null },
      });
    } else {
      await db.crewMember.create({
        data: {
          userId: session.user.id,
          layoutId,
          roleId,
          invitedBy: invitedBy as string,
          acceptedAt: new Date(),
        },
      });
    }

    revalidatePath("/dashboard");
    return { success: true, layoutId };
  } catch {
    return { error: "Invalid or expired invitation" };
  }
}

// ─── Change Role ────────────────────────────────────

const changeRoleSchema = z.object({
  layoutId: z.string().min(1),
  memberId: z.string().min(1),
  roleId: z.string().min(1),
});

export async function changeCrewRole(values: z.infer<typeof changeRoleSchema>) {
  await requireAuth();
  const parsed = changeRoleSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { layoutId, memberId, roleId } = parsed.data;
  await requirePermission(layoutId, "crew", "edit");

  const role = await db.role.findFirst({
    where: { id: roleId, layoutId },
    select: { id: true, name: true },
  });
  if (!role) return { error: "Role not found" };

  const member = await db.crewMember.findFirst({
    where: { id: memberId, layoutId },
    include: { user: { select: { email: true } }, layout: { select: { name: true } } },
  });
  if (!member) return { error: "Member not found" };

  await db.crewMember.update({
    where: { id: memberId },
    data: { roleId },
  });

  await sendCrewRoleChangedEmail(member.user.email, member.layout.name, role.name);

  revalidatePath(`/dashboard/railroad/${layoutId}/crew`);
  return { success: true };
}

// ─── Remove Member ──────────────────────────────────

const removeSchema = z.object({
  layoutId: z.string().min(1),
  memberId: z.string().min(1),
  transferToUserId: z.string().optional(),
});

export async function removeCrewMember(values: z.infer<typeof removeSchema>) {
  const session = await requireAuth();
  const parsed = removeSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { layoutId, memberId } = parsed.data;
  await requirePermission(layoutId, "crew", "edit");

  const member = await db.crewMember.findFirst({
    where: { id: memberId, layoutId, removedAt: null },
    include: { user: { select: { email: true } }, layout: { select: { name: true } } },
  });
  if (!member) return { error: "Member not found" };

  await db.crewMember.update({
    where: { id: memberId },
    data: { removedAt: new Date(), removedBy: session.user.id },
  });

  await sendCrewRemovedEmail(member.user.email, member.layout.name);

  revalidatePath(`/dashboard/railroad/${layoutId}/crew`);
  return { success: true };
}

// ─── Leave Railroad ─────────────────────────────────

export async function leaveRailroad(layoutId: string) {
  const session = await requireAuth();

  const member = await db.crewMember.findUnique({
    where: { userId_layoutId: { userId: session.user.id, layoutId } },
    select: { id: true, acceptedAt: true, removedAt: true },
  });

  if (!member || !member.acceptedAt || member.removedAt) {
    return { error: "You're not a member of this railroad" };
  }

  await db.crewMember.update({
    where: { id: member.id },
    data: { removedAt: new Date(), removedBy: session.user.id },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

// ─── Get Crew Members ───────────────────────────────

export async function getCrewMembers(layoutId: string) {
  await requireAuth();
  await requirePermission(layoutId, "crew", "view");

  const layout = await db.layout.findUnique({
    where: { id: layoutId },
    select: { userId: true, user: { select: { id: true, name: true, email: true } } },
  });

  const members = await db.crewMember.findMany({
    where: { layoutId, removedAt: null },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      role: { select: { id: true, name: true } },
      inviter: { select: { name: true } },
    },
    orderBy: { invitedAt: "asc" },
  });

  return { owner: layout?.user, members };
}

// ─── Get Invite Info (for accept pages) ─────────────

export async function getInviteInfo(token: string) {
  const memberPayload = await verifyInviteToken(token);
  if (memberPayload) {
    const member = await db.crewMember.findUnique({
      where: { id: memberPayload.crewMemberId },
      include: {
        layout: { select: { name: true } },
        role: { select: { name: true } },
        inviter: { select: { name: true } },
      },
    });
    if (!member) return null;
    return {
      railroadName: member.layout.name,
      roleName: member.role.name,
      inviterName: member.inviter?.name || null,
      alreadyAccepted: !!member.acceptedAt,
    };
  }

  try {
    const { payload } = await jwtVerify(token, INVITE_SECRET);
    if (payload.type !== "email-invite") return null;

    const [layout, role, inviter] = await Promise.all([
      db.layout.findUnique({ where: { id: payload.layoutId as string }, select: { name: true } }),
      db.role.findUnique({ where: { id: payload.roleId as string }, select: { name: true } }),
      payload.invitedBy
        ? db.user.findUnique({ where: { id: payload.invitedBy as string }, select: { name: true } })
        : null,
    ]);

    return {
      railroadName: layout?.name || "Unknown Railroad",
      roleName: role?.name || "Unknown Role",
      inviterName: inviter?.name || null,
      alreadyAccepted: false,
    };
  } catch {
    return null;
  }
}
