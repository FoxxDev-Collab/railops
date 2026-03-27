"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/crew/context";
import { CREW_SECTIONS, DEFAULT_ROLE_NAMES } from "@/lib/crew/permissions";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

// ─── Get Roles ──────────────────────────────────────

export async function getRoles(layoutId: string) {
  await requireAuth();
  await requirePermission(layoutId, "crew", "view");

  return db.role.findMany({
    where: { layoutId },
    include: {
      permissions: true,
      _count: { select: { members: { where: { removedAt: null } } } },
    },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

export async function getRole(roleId: string, layoutId: string) {
  await requireAuth();
  await requirePermission(layoutId, "crew", "view");

  return db.role.findFirst({
    where: { id: roleId, layoutId },
    include: { permissions: true },
  });
}

// ─── Create Role ────────────────────────────────────

const createRoleSchema = z.object({
  layoutId: z.string().min(1),
  name: z.string().min(1).max(50),
  permissions: z.array(
    z.object({
      section: z.string(),
      canView: z.boolean(),
      canEdit: z.boolean(),
    })
  ),
});

export async function createRole(values: z.infer<typeof createRoleSchema>) {
  await requireAuth();
  const parsed = createRoleSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { layoutId, name, permissions } = parsed.data;
  await requirePermission(layoutId, "crew", "edit");

  const existing = await db.role.findUnique({
    where: { layoutId_name: { layoutId, name } },
  });
  if (existing) return { error: "A role with this name already exists" };

  const validSections = new Set<string>(CREW_SECTIONS);
  for (const p of permissions) {
    if (!validSections.has(p.section)) {
      return { error: `Invalid section: ${p.section}` };
    }
  }

  await db.role.create({
    data: {
      name,
      layoutId,
      isDefault: false,
      permissions: {
        create: permissions.map((p) => ({
          section: p.section,
          canView: p.canView,
          canEdit: p.canEdit,
        })),
      },
    },
  });

  revalidatePath(`/dashboard/railroad/${layoutId}/crew/roles`);
  return { success: true };
}

// ─── Update Role Permissions ────────────────────────

const updateRoleSchema = z.object({
  roleId: z.string().min(1),
  layoutId: z.string().min(1),
  name: z.string().min(1).max(50).optional(),
  permissions: z.array(
    z.object({
      section: z.string(),
      canView: z.boolean(),
      canEdit: z.boolean(),
    })
  ),
});

export async function updateRole(values: z.infer<typeof updateRoleSchema>) {
  await requireAuth();
  const parsed = updateRoleSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { roleId, layoutId, name, permissions } = parsed.data;
  await requirePermission(layoutId, "crew", "edit");

  const role = await db.role.findFirst({ where: { id: roleId, layoutId } });
  if (!role) return { error: "Role not found" };

  if (role.isDefault && name && name !== role.name) {
    return { error: "Default roles cannot be renamed" };
  }

  if (name && name !== role.name) {
    const duplicate = await db.role.findUnique({
      where: { layoutId_name: { layoutId, name } },
    });
    if (duplicate) return { error: "A role with this name already exists" };

    await db.role.update({ where: { id: roleId }, data: { name } });
  }

  for (const p of permissions) {
    await db.rolePermission.upsert({
      where: { roleId_section: { roleId, section: p.section } },
      create: { roleId, section: p.section, canView: p.canView, canEdit: p.canEdit },
      update: { canView: p.canView, canEdit: p.canEdit },
    });
  }

  revalidatePath(`/dashboard/railroad/${layoutId}/crew/roles`);
  return { success: true };
}

// ─── Delete Role ────────────────────────────────────

const deleteRoleSchema = z.object({
  roleId: z.string().min(1),
  layoutId: z.string().min(1),
  reassignToRoleId: z.string().optional(),
});

export async function deleteRole(values: z.infer<typeof deleteRoleSchema>) {
  await requireAuth();
  const parsed = deleteRoleSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { roleId, layoutId, reassignToRoleId } = parsed.data;
  await requirePermission(layoutId, "crew", "edit");

  const role = await db.role.findFirst({
    where: { id: roleId, layoutId },
    include: { _count: { select: { members: { where: { removedAt: null } } } } },
  });
  if (!role) return { error: "Role not found" };

  if (role.isDefault) return { error: "Default roles cannot be deleted" };

  if (role._count.members > 0) {
    if (!reassignToRoleId) {
      return { error: "This role has active members. Provide a role to reassign them to." };
    }
    const targetRole = await db.role.findFirst({ where: { id: reassignToRoleId, layoutId } });
    if (!targetRole) return { error: "Target role not found" };

    await db.crewMember.updateMany({
      where: { roleId, layoutId, removedAt: null },
      data: { roleId: reassignToRoleId },
    });
  }

  await db.role.delete({ where: { id: roleId } });

  revalidatePath(`/dashboard/railroad/${layoutId}/crew/roles`);
  return { success: true };
}
